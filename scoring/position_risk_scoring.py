# scoring/position_risk_scoring.py

"""

POSITION & RISK SCORING ENGINE



This module evaluates risk context for a given symbol and the account.

It does NOT send any orders or fetch anything from IBKR.

It only interprets an account_state + position_state snapshot using POSITION_RISK_RULEBOOK

and returns a normalized score in the range [-10, +10], then applies a module weight.

"""



from typing import Dict, Any, List, Tuple

from rulebooks.position_risk_rulebook import POSITION_RISK_RULEBOOK

from scoring.safe_eval import safe_eval



# ============================================

# POSITION & RISK SCORING ENGINE

# ============================================



class PositionRiskScoringEngine:

    """

    Position & Risk Scoring Engine



    מחלקה שאחראית לתת ציון למניה מסוימת בהקשר של:

    - מצב החשבון (הון, שימוש בהון, הפסד יומי וכו')

    - מצב הפוזיציה במניה (אם קיימת): גודל, סיכון, מרחק מסטופים וכו'



    חשוב:

    - אין כאן שום ביצוע פקודות.

    - אין התחברות ל-IBKR.

    - מקבל snapshots מוכנים מהמערכת, ומחזיר ציון בטווח [-10, +10]

      + ציון משוקלל לפי משקל מחלקת Position/Risk.

    """

    

    def __init__(self, rulebook=None):

        """

        Initialize the scoring engine.

        

        Args:

            rulebook: POSITION_RISK_RULEBOOK (defaults to imported rulebook)

        """

        self.rulebook = rulebook or POSITION_RISK_RULEBOOK

        # משקל המחלקה ברמת ה-Master Scoring (כמו שקבענו)

        self.weight = 0.70

    

    # -----------------------------------------------------------

    # Public API

    # -----------------------------------------------------------

    

    def score(

        self,

        account_state: Dict[str, Any],

        position_state: Dict[str, Any] | None,

    ) -> Dict[str, Any]:

        """

        parameters:

            account_state: dict עם מפתחות כמו:

                equity, cash, open_positions_value,

                realized_pnl_today, unrealized_pnl_today,

                max_daily_loss_pct, max_daily_loss_abs,

                tradable_equity_pct, account_risk_pct_max,

                max_concurrent_positions, open_positions_count



            position_state: dict per symbol (יכול להיות None אם אין פוזיציה), לדוגמה:

                symbol, is_open, direction,

                entry_price, current_price, stop_price,

                position_size, risk_per_share,

                symbol_risk_pct_of_equity,

                open_pnl_abs, open_pnl_pct,

                max_favorable_excursion_pct, max_adverse_excursion_pct



        returns:

            {

              "minor_score": number,

              "major_score": number,

              "final_position_risk_score": number,

              "metric_scores": { metric_name: score },

              "matched_states": [ "METRIC.STATE", ... ]

            }

        """

        if position_state is None:

            position_state = {}

        

        # מכינים סביבת נתונים אחת לשימוש ב-RULEBOOK

        snapshot = self._build_snapshot_env(account_state, position_state)

        

        minor_score, minor_metric_scores, minor_states = self._score_timeframe(

            "MINOR", snapshot

        )

        major_score, major_metric_scores, major_states = self._score_timeframe(

            "MAJOR", snapshot

        )

        

        combined = self._combine_minor_major(minor_score, major_score)

        final_weighted = combined * self.weight

        

        metric_scores = {**minor_metric_scores, **major_metric_scores}

        

        return {

            "minor_score": minor_score,

            "major_score": major_score,

            "final_position_risk_score": final_weighted,

            "metric_scores": metric_scores,

            "matched_states": minor_states + major_states,

        }

    

    # -----------------------------------------------------------

    # Build snapshot env for condition evaluation

    # -----------------------------------------------------------

    

    def _build_snapshot_env(

        self,

        account_state: Dict[str, Any],

        position_state: Dict[str, Any],

    ) -> Dict[str, Any]:

        """

        מאחד את account_state + position_state + שדות נגזרים

        לסנאפשוט אחד שעליו ה-RULEBOOK עובד.

        

        Args:

            account_state: Account-level data

            position_state: Position-level data (can be empty dict if no position)

        

        Returns:

            Combined snapshot dictionary with all fields and derived fields

        """

        equity = float(account_state.get("equity", 0.0) or 0.0)

        realized = float(account_state.get("realized_pnl_today", 0.0) or 0.0)

        unrealized = float(account_state.get("unrealized_pnl_today", 0.0) or 0.0)

        open_val = float(account_state.get("open_positions_value", 0.0) or 0.0)

        

        tradable_equity_pct = float(account_state.get("tradable_equity_pct", 1.0) or 1.0)

        

        daily_pl_abs = realized + unrealized

        daily_pl_pct = daily_pl_abs / equity if equity != 0 else 0.0

        

        denom_capital = equity * tradable_equity_pct if equity != 0 else 0.0

        capital_usage_pct = open_val / denom_capital if denom_capital != 0 else 0.0

        

        # איחוד לשדה אחד

        snapshot: Dict[str, Any] = {}

        snapshot.update(account_state)

        snapshot.update(position_state)

        

        # מוסיפים שדות נגזרים לסנאפשוט

        snapshot["daily_pl_abs"] = daily_pl_abs

        snapshot["daily_pl_pct"] = daily_pl_pct

        snapshot["capital_usage_pct"] = capital_usage_pct

        

        # כדי להימנע משגיאות במצבים שאין פוזיציה

        snapshot.setdefault("is_open", False)

        snapshot.setdefault("direction", None)

        snapshot.setdefault("symbol_risk_pct_of_equity", 0.0)

        snapshot.setdefault("open_pnl_abs", 0.0)

        snapshot.setdefault("open_pnl_pct", 0.0)

        snapshot.setdefault("max_favorable_excursion_pct", 0.0)

        snapshot.setdefault("max_adverse_excursion_pct", 0.0)

        

        return snapshot

    

    # -----------------------------------------------------------

    # Timeframe-level scoring

    # -----------------------------------------------------------

    

    def _score_timeframe(

        self,

        timeframe: str,

        snapshot: Dict[str, Any],

    ) -> Tuple[float, Dict[str, float], List[str]]:

        """

        מחשב ציון לכל timeframe (MINOR / MAJOR) לפי כל המטריקות.

        

        Args:

            timeframe: "MINOR" or "MAJOR"

            snapshot: Combined snapshot dictionary with all fields

        

        Returns:

            Tuple of (score: float, metric_scores: Dict[str, float], matched_states: List[str])

        """

        metrics_def = self.rulebook.get("metrics", {})

        groups_def = self.rulebook.get("meta", {}).get("groups", {})

        

        metric_scores: Dict[str, float] = {}

        matched_states: List[str] = []

        

        weighted_sum = 0.0

        total_weight = 0.0

        

        for metric_name, metric_rule in metrics_def.items():

            metric_timeframes = metric_rule.get("timeframes", {})

            if timeframe not in metric_timeframes:

                continue

            

            group_name = metric_rule.get("group")

            metric_weight = float(metric_rule.get("weight", 1.0))

            group_base_weight = float(

                groups_def.get(group_name, {}).get("base_weight", 1.0)

            )

            

            states_def = metric_timeframes[timeframe].get("states", {})

            metric_score, metric_state_names = self._score_metric_states(

                metric_name, states_def, snapshot

            )

            

            if metric_score is None:

                continue

            

            metric_scores[metric_name] = metric_score

            matched_states.extend(metric_state_names)

            

            w = metric_weight * group_base_weight

            weighted_sum += metric_score * w

            total_weight += w

        

        if total_weight == 0:

            return 0.0, metric_scores, matched_states

        

        final_timeframe_score = weighted_sum / total_weight

        return final_timeframe_score, metric_scores, matched_states

    

    # -----------------------------------------------------------

    # Metric-level scoring

    # -----------------------------------------------------------

    

    def _score_metric_states(

        self,

        metric_name: str,

        states_def: Dict[str, Dict[str, Any]],

        snapshot: Dict[str, Any],

    ) -> Tuple[float, List[str]] | Tuple[None, List[str]]:

        """

        מחפש את כל הסטייטים שמתאימים ל-metric מסוים, ומחשב ממוצע.

        

        Args:

            metric_name: Name of the metric (e.g., "DAILY_LOSS_LIMIT")

            states_def: Dictionary of state definitions for this metric

            snapshot: Combined snapshot dictionary

        

        Returns:

            Tuple of (metric_score: float | None, matched_state_names: List[str])

        """

        matched_scores: List[float] = []

        matched_states: List[str] = []

        

        for state_name, state_rule in states_def.items():

            condition_expr = state_rule.get("condition")

            score_range = state_rule.get("score_range", [-1, 1])

            

            if not condition_expr:

                continue

            

            if self._match_condition(snapshot, condition_expr):

                low, high = score_range

                mid_score = (low + high) / 2.0

                matched_scores.append(mid_score)

                matched_states.append(f"{metric_name}.{state_name}")

        

        if not matched_scores:

            return None, matched_states

        

        metric_score = sum(matched_scores) / len(matched_scores)

        return metric_score, matched_states

    

    # -----------------------------------------------------------

    # Condition evaluation

    # -----------------------------------------------------------

    

    def _match_condition(self, snapshot: Dict[str, Any], condition_expr: str) -> bool:

        """

        condition_expr הוא ביטוי בוליאני בפייתון, לדוגמה:

            "daily_pl_pct <= max_daily_loss_pct"

            "is_open and symbol_risk_pct_of_equity > account_risk_pct_max"



        כל מפתח ב-snapshot זמין כמשתנה.

        אין גישה ל-builtins כדי להגביל את eval.

        

        Args:

            snapshot: Combined snapshot dictionary with all fields

            condition_expr: Python boolean expression string

        

        Returns:

            True if condition evaluates to True, False otherwise

        """

        local_env = dict(snapshot)

        

        try:

            return safe_eval(condition_expr, local_env)

        except (ValueError, Exception):

            return False

    

    # -----------------------------------------------------------

    # Helper: combine minor/major

    # -----------------------------------------------------------

    

    @staticmethod

    def _combine_minor_major(minor: float, major: float) -> float:

        """

        איחוד ציון MINOR/MAJOR.

        כאן אפשר לתת קצת יותר משקל ל-MINOR (אינטרדיי) כי מדובר בהקשר סיכון,

        אבל עדיין להשתמש גם ב-MAJOR אם יהיה בעתיד.

        כרגע: 60% MINOR, 40% MAJOR.

        

        Args:

            minor: MINOR timeframe score

            major: MAJOR timeframe score

        

        Returns:

            Combined score (60% MINOR, 40% MAJOR if both exist)

        """

        has_minor = abs(minor) > 1e-6

        has_major = abs(major) > 1e-6

        

        if has_minor and has_major:

            return minor * 0.6 + major * 0.4

        elif has_minor:

            return minor

        elif has_major:

            return major

        else:

            return 0.0



# ============================================

# CONVENIENCE FUNCTION

# ============================================



def score_position_risk(

    account_state: Dict[str, Any],

    position_state: Dict[str, Any] | None = None,

    rulebook=None

) -> Dict[str, Any]:

    """

    Convenience function to score position and risk.

    

    Args:

        account_state: Dictionary with account-level data

        position_state: Optional dictionary with position-level data (None if flat)

        rulebook: Optional custom rulebook (defaults to POSITION_RISK_RULEBOOK)

    

    Returns:

        Dictionary with scores, metric breakdown, and matched states

    

    Example:

        account_state = {

            "equity": 100000,  # $100K

            "cash": 50000,

            "open_positions_value": 45000,

            "realized_pnl_today": -500,

            "unrealized_pnl_today": -200,

            "max_daily_loss_pct": -0.02,  # -2%

            "max_daily_loss_abs": -2000,

            "tradable_equity_pct": 0.95,

            "account_risk_pct_max": 0.01,  # 1% per trade

            "max_concurrent_positions": 10,

            "open_positions_count": 3,

        }

        

        position_state = {

            "symbol": "AAPL",

            "is_open": True,

            "direction": "LONG",

            "entry_price": 150.0,

            "current_price": 152.0,

            "stop_price": 148.0,

            "position_size": 100,

            "risk_per_share": 2.0,

            "symbol_risk_pct_of_equity": 0.002,  # 0.2%

            "open_pnl_abs": 200,

            "open_pnl_pct": 0.0133,  # 1.33%

            "max_favorable_excursion_pct": 0.02,

            "max_adverse_excursion_pct": -0.01,

        }

        

        result = score_position_risk(account_state, position_state)

        print(result["final_position_risk_score"])

        print(result["metric_scores"])  # Breakdown by metric

    """

    engine = PositionRiskScoringEngine(rulebook=rulebook)

    return engine.score(account_state, position_state)



# Export for use by Master Scoring System

__all__ = ["PositionRiskScoringEngine", "score_position_risk"]
