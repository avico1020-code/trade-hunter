# scoring/price_action_scoring.py

"""

PRICE ACTION SCORING ENGINE



This module scores price action patterns using the PRICE_ACTION_RULEBOOK.

It does NOT detect patterns - it only maps pre-detected patterns to rulebook states and scores them.



Input: Pre-processed pattern detection results as a dictionary

Output: Normalized scores for MINOR and MAJOR timeframes, plus final weighted score

"""



from typing import Dict, Any, List

from rulebooks.price_action_rulebook import PRICE_ACTION_RULEBOOK



# ============================================

# PRICE ACTION SCORING ENGINE

# ============================================



class PriceActionScoringEngine:

    """

    Price Action Scoring Engine.

    

    Maps pre-detected price action patterns to rulebook states and scores them.

    Does NOT detect patterns - only scores already-detected patterns.

    """

    

    def __init__(self, rulebook=None):

        """

        Initialize the scoring engine.

        

        Args:

            rulebook: PRICE_ACTION_RULEBOOK (defaults to imported rulebook)

        """

        self.rulebook = rulebook or PRICE_ACTION_RULEBOOK

        self.weight = 1.2  # קבוע מראש כמו שהוגדר

    

    # -----------------------------------------------------------

    # Public API

    # -----------------------------------------------------------

    

    def score(self, pattern_data: Dict[str, Any]) -> Dict[str, Any]:

        """

        Receives decoded pattern detection results and maps them to rulebook scoring.

        

        Args:

            pattern_data: Dictionary with pre-detected pattern information:

                - structure: "UPTREND", "DOWNTREND", "SIDEWAYS"

                - breakout: "UP", "DOWN"

                - volume_confirmation: bool

                - gap_direction: "UP", "DOWN"

                - gap_follow_through: bool

                - gap_filled: bool

                - rejected: bool

                - reclaimed: bool

                - candle_pattern: "BULL_ENG", "BEAR_ENG", "HAMMER", "SHOOTING_STAR"

                - failed_breakout: bool

                - failed_breakdown: bool

                - ... and more fields as needed

        

        Returns:

            Dictionary with:

                - minor_score: float

                - major_score: float

                - final_price_action_score: float (weighted)

                - matched_states: List[str]

        """

        minor_score, minor_states = self._score_timeframe(

            timeframe="MINOR",

            pattern_data=pattern_data

        )

        

        major_score, major_states = self._score_timeframe(

            timeframe="MAJOR",

            pattern_data=pattern_data

        )

        

        # ניקוד סופי: ממוצע שני הטיימפריימים * משקל המחלקה

        final = ((minor_score + major_score) / 2.0) * self.weight

        

        return {

            "minor_score": minor_score,

            "major_score": major_score,

            "final_price_action_score": final,

            "matched_states": list(set(minor_states + major_states))

        }

    

    # -----------------------------------------------------------

    # Internal scoring logic

    # -----------------------------------------------------------

    

    def _score_timeframe(self, timeframe: str, pattern_data: Dict[str, Any]):

        """

        מזהה איזה STATES מתאימים ל-pattern_data ומנקד בהתאם.

        

        Args:

            timeframe: "MINOR" or "MAJOR"

            pattern_data: Dictionary with pattern detection results

        

        Returns:

            Tuple of (score: float, matched_states: List[str])

        """

        patterns = self.rulebook.get("patterns", {})

        if not patterns:

            return 0, []

        

        matched_states = []

        score_accumulator = []

        pattern_weights = []  # Track weights per pattern for weighted average

        

        # Iterate through all patterns in rulebook

        for pattern_name, pattern_cfg in patterns.items():

            base_impact = pattern_cfg.get("base_impact", 5)

            timeframes = pattern_cfg.get("timeframes", {})

            tf_cfg = timeframes.get(timeframe)

            

            if not tf_cfg:

                continue  # No config for this timeframe

            

            states_def = tf_cfg.get("states", {})

            

            # Check each state in this pattern

            for state_name, state_rule in states_def.items():

                if self._match_state(pattern_data, state_rule["condition"]):

                    matched_states.append(f"{pattern_name}:{state_name}")

                    score_range = state_rule["score_range"]

                    

                    # ניקוד אקראי מבוקר בתוך הטווח (מייצר טבעיות)

                    score = (score_range[0] + score_range[1]) / 2.0

                    
                    
                    # Weight by base_impact
                    
                    weighted_score = score * base_impact
                    
                    score_accumulator.append(weighted_score)
                    
                    pattern_weights.append(base_impact)

        

        if not score_accumulator:

            return 0, []

        

        # Weighted average of all matched states

        total_weight = sum(pattern_weights)

        if total_weight > 0:

            final_score = sum(score_accumulator) / total_weight

        else:

            final_score = sum(score_accumulator) / len(score_accumulator)

        

        return final_score, matched_states

    

    # -----------------------------------------------------------

    # Condition matching logic

    # -----------------------------------------------------------

    

    def _match_state(self, pattern_data: Dict[str, Any], condition: str) -> bool:

        """

        הערכת תנאי במחרוזת. כדי לשמור על בטיחות, לא מבוצע eval ישיר.

        במקום זאת: התאמות לוגיות ידניות.

        

        Args:

            pattern_data: Dictionary with pattern detection results

            condition: Condition string from rulebook (e.g., "structure == 'HH_HL' AND swings_count >= 3")

        

        Returns:

            True if condition matches, False otherwise

        """

        try:

            # מספר דוגמאות (ניתן להרחיב קבוע):

            cond = condition.lower()

            

            # --- STRUCTURE ---

            if "hh + hl" in cond or "structure == 'hh_hl'" in cond or "higher highs" in cond:

                return pattern_data.get("structure") == "UPTREND" or pattern_data.get("structure") == "HH_HL"

            

            if "lh + ll" in cond or "structure == 'lh_ll'" in cond or "lower lows" in cond:

                return pattern_data.get("structure") == "DOWNTREND" or pattern_data.get("structure") == "LH_LL"

            

            # --- BREAKOUTS ---

            if "close above well-defined resistance" in cond or "break above resistance" in cond:

                return (

                    pattern_data.get("breakout") == "UP"

                    and pattern_data.get("volume_confirmation", False)

                )

            

            if "close below well-defined support" in cond or "break below support" in cond:

                return (

                    pattern_data.get("breakout") == "DOWN"

                    and pattern_data.get("volume_confirmation", False)

                )

            

            # --- GAPS ---

            if "gap up" in cond and "follow through" in cond:

                return (

                    pattern_data.get("gap_direction") == "UP"

                    and pattern_data.get("gap_follow_through", False)

                )

            

            if "gap up then price falls back" in cond or "gap up filled" in cond:

                return (

                    pattern_data.get("gap_direction") == "UP"

                    and pattern_data.get("gap_filled") is True

                    and pattern_data.get("rejected") is True

                )

            

            if "gap down" in cond and "follow through" in cond:

                return (

                    pattern_data.get("gap_direction") == "DOWN"

                    and pattern_data.get("gap_follow_through", False)

                )

            

            if "gap down then reclaimed" in cond or "gap down filled and reclaimed" in cond:

                return (

                    pattern_data.get("gap_direction") == "DOWN"

                    and pattern_data.get("gap_filled") is True

                    and pattern_data.get("reclaimed") is True

                )

            

            # --- CANDLES ---

            if "bullish engulfing" in cond or "candle_pattern == 'bullish_engulfing'" in cond:

                return pattern_data.get("candle_pattern") == "BULL_ENG" or pattern_data.get("candle_pattern") == "BULLISH_ENGULFING"

            

            if "bearish engulfing" in cond or "candle_pattern == 'bearish_engulfing'" in cond:

                return pattern_data.get("candle_pattern") == "BEAR_ENG" or pattern_data.get("candle_pattern") == "BEARISH_ENGULFING"

            

            if "hammer" in cond:

                return pattern_data.get("candle_pattern") == "HAMMER"

            

            if "shooting star" in cond:

                return pattern_data.get("candle_pattern") == "SHOOTING_STAR"

            

            # --- TRAPS / FAILURES ---

            if "failed breakout" in cond or "failed_breakout" in cond:

                return pattern_data.get("failed_breakout", False)

            

            if "failed breakdown" in cond or "failed_breakdown" in cond:

                return pattern_data.get("failed_breakdown", False)

            

            # --- DEFAULT: Try direct field matching for simple conditions ---

            # Handle conditions like "pattern == 'DOUBLE_TOP'"

            if " == " in cond:

                parts = cond.split(" == ")

                if len(parts) == 2:

                    field_name = parts[0].strip()

                    value = parts[1].strip().strip("'\"")  # Remove quotes

                    return pattern_data.get(field_name) == value

            

            # Handle conditions with "AND"

            if " and " in cond:

                parts = cond.split(" and ")

                return all(self._match_state(pattern_data, p.strip()) for p in parts)

            

            # Handle conditions with "OR"

            if " or " in cond:

                parts = cond.split(" or ")

                return any(self._match_state(pattern_data, p.strip()) for p in parts)

            

        except Exception:

            return False

        

        return False



# ============================================

# CONVENIENCE FUNCTION

# ============================================



def score_price_action(pattern_data: Dict[str, Any], rulebook=None) -> Dict[str, Any]:

    """

    Convenience function to score price action patterns.

    

    Args:

        pattern_data: Dictionary with pre-detected pattern information

        rulebook: Optional custom rulebook (defaults to PRICE_ACTION_RULEBOOK)

    

    Returns:

        Dictionary with scores and matched states

    

    Example:

        pattern_data = {

            "structure": "UPTREND",

            "breakout": "UP",

            "volume_confirmation": True,

        }

        result = score_price_action(pattern_data)

        print(result["final_price_action_score"])

    """

    engine = PriceActionScoringEngine(rulebook=rulebook)

    return engine.score(pattern_data)



# Export for use by Master Scoring System

__all__ = ["PriceActionScoringEngine", "score_price_action"]
