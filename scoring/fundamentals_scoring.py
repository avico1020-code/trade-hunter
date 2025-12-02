# scoring/fundamentals_scoring.py

"""

FUNDAMENTALS SCORING ENGINE



This module evaluates the fundamental quality and valuation of a stock.

It does NOT fetch data from APIs and does NOT calculate ratios by itself.

It only interprets a fundamentals snapshot according to FUNDAMENTALS_RULEBOOK

and returns a normalized score in the range [-10, +10], then applies a module weight.

"""



from typing import Dict, Any, List, Tuple

from rulebooks.fundamentals_rulebook import FUNDAMENTALS_RULEBOOK



# ============================================

# FUNDAMENTALS SCORING ENGINE

# ============================================



class FundamentalsScoringEngine:

    """

    Fundamentals Scoring Engine



    מקבל תמונת פונדמנטלס של מניה (יחסי שווי, צמיחה, רווחיות, מינוף וכו'),

    משווה אותה ל־FUNDAMENTALS_RULEBOOK, ומחזיר ציון אחיד בטווח [-10, +10]

    + ציון משוקלל לפי המשקל של המחלקה.

    """

    

    def __init__(self, rulebook=None):

        """

        Initialize the scoring engine.

        

        Args:

            rulebook: FUNDAMENTALS_RULEBOOK (defaults to imported rulebook)

        """

        self.rulebook = rulebook or FUNDAMENTALS_RULEBOOK

        # משקל המחלקה ברמת ה-Master Scoring (שהגדרנו קודם)

        self.weight = 0.75

    

    # -----------------------------------------------------------

    # Public API

    # -----------------------------------------------------------

    

    def score(self, fundamentals_snapshot: Dict[str, Any]) -> Dict[str, Any]:

        """

        parameters:

            fundamentals_snapshot: dict with keys like:

                pe_ratio, ps_ratio, pb_ratio,

                eps_growth_5y, revenue_growth_yoy,

                profit_margin, operating_margin, roe,

                debt_to_equity, interest_coverage,

                free_cash_flow_yield, dividend_yield,

                market_cap, sector, ...



        returns:

            {

              "minor_score": number,

              "major_score": number,

              "final_fundamentals_score": number,

              "metric_scores": { metric_name: score },

              "matched_states": [ "METRIC.STATE", ... ]

            }

        """

        minor_score, minor_metric_scores, minor_states = self._score_timeframe(

            "MINOR", fundamentals_snapshot

        )

        major_score, major_metric_scores, major_states = self._score_timeframe(

            "MAJOR", fundamentals_snapshot

        )

        

        # כרגע רוב המשמעות היא ב-MAJOR (יומי), MINOR בדרך כלל 0

        combined = self._combine_minor_major(minor_score, major_score)

        final_weighted = combined * self.weight

        

        # מאחדים מילונים בצורה פשוטה (MAJOR גובר על MINOR אם יש כפילויות בשם)

        metric_scores = {**minor_metric_scores, **major_metric_scores}

        

        return {

            "minor_score": minor_score,

            "major_score": major_score,

            "final_fundamentals_score": final_weighted,

            "metric_scores": metric_scores,

            "matched_states": minor_states + major_states,

        }

    

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

            snapshot: Dictionary with fundamentals data

        

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

                # אין התאמה לשום state

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

            metric_name: Name of the metric (e.g., "PE_PB_VALUATION")

            states_def: Dictionary of state definitions for this metric

            snapshot: Dictionary with fundamentals data

        

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

    # Condition evaluation (uses restricted eval)

    # -----------------------------------------------------------

    

    def _match_condition(self, snapshot: Dict[str, Any], condition_expr: str) -> bool:

        """

        condition_expr הוא ביטוי בוליאני בפייתון, לדוגמה:

            "pe_ratio is not None and pe_ratio < 15 and revenue_growth_yoy > 0.10"



        כל המפתחות של snapshot זמינים כמשתנים מקומיים.

        אין גישה ל-builtins כדי להקטין סיכוני eval.

        

        Args:

            snapshot: Dictionary with fundamentals data

            condition_expr: Python boolean expression string

        

        Returns:

            True if condition evaluates to True, False otherwise

        """

        # מכינים סביבה מקומית עם כל המפתחות הרלוונטיים

        local_env = {

            "pe_ratio": snapshot.get("pe_ratio"),

            "ps_ratio": snapshot.get("ps_ratio"),

            "pb_ratio": snapshot.get("pb_ratio"),

            "eps_growth_5y": snapshot.get("eps_growth_5y"),

            "revenue_growth_yoy": snapshot.get("revenue_growth_yoy"),

            "profit_margin": snapshot.get("profit_margin"),

            "operating_margin": snapshot.get("operating_margin"),

            "roe": snapshot.get("roe"),

            "debt_to_equity": snapshot.get("debt_to_equity"),

            "interest_coverage": snapshot.get("interest_coverage"),

            "free_cash_flow_yield": snapshot.get("free_cash_flow_yield"),

            "dividend_yield": snapshot.get("dividend_yield"),

            "market_cap": snapshot.get("market_cap"),

            "sector": snapshot.get("sector"),

        }

        

        try:

            return bool(eval(condition_expr, {"__builtins__": {}}, local_env))

        except Exception:

            # אם יש שגיאה בתנאי – מתעלמים ממנו

            return False

    

    # -----------------------------------------------------------

    # Helper: combine minor/major

    # -----------------------------------------------------------

    

    @staticmethod

    def _combine_minor_major(minor: float, major: float) -> float:

        """

        פונקציית עזר לאיחוד ציון MINOR/MAJOR.

        כרגע ל-Fundamentals משקל גבוה יותר ל-MAJOR (כי זה דוחות, לא אינטרדיי).

        

        Args:

            minor: MINOR timeframe score

            major: MAJOR timeframe score

        

        Returns:

            Combined score (70% MAJOR, 30% MINOR if both exist)

        """

        has_minor = abs(minor) > 1e-6

        has_major = abs(major) > 1e-6

        

        if has_minor and has_major:

            # 70% משמעות ל-MAJOR, 30% ל-MINOR

            return major * 0.7 + minor * 0.3

        elif has_major:

            return major

        elif has_minor:

            return minor

        else:

            return 0.0



# ============================================

# CONVENIENCE FUNCTION

# ============================================



def score_fundamentals(fundamentals_snapshot: Dict[str, Any], rulebook=None) -> Dict[str, Any]:

    """

    Convenience function to score fundamentals.

    

    Args:

        fundamentals_snapshot: Dictionary with fundamentals data

        rulebook: Optional custom rulebook (defaults to FUNDAMENTALS_RULEBOOK)

    

    Returns:

        Dictionary with scores, metric breakdown, and matched states

    

    Example:

        fundamentals_snapshot = {

            "pe_ratio": 15.5,

            "ps_ratio": 3.2,

            "pb_ratio": 2.1,

            "eps_growth_5y": 0.15,  # 15% growth

            "revenue_growth_yoy": 0.20,  # 20% growth

            "profit_margin": 0.12,  # 12%

            "operating_margin": 0.15,  # 15%

            "roe": 0.18,  # 18% Return on Equity

            "debt_to_equity": 0.5,

            "interest_coverage": 8.0,

            "free_cash_flow_yield": 0.04,  # 4%

            "dividend_yield": 0.02,  # 2%

            "market_cap": 50000000000,  # $50B

            "sector": "XLK",

        }

        result = score_fundamentals(fundamentals_snapshot)

        print(result["final_fundamentals_score"])

        print(result["metric_scores"])  # Breakdown by metric

    """

    engine = FundamentalsScoringEngine(rulebook=rulebook)

    return engine.score(fundamentals_snapshot)



# Export for use by Master Scoring System

__all__ = ["FundamentalsScoringEngine", "score_fundamentals"]
