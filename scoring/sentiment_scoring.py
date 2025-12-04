# scoring/sentiment_scoring.py

"""

SENTIMENT SCORING ENGINE



This module scores sentiment signals using the SENTIMENT_RULEBOOK.

It does NOT perform NLP internally - it only interprets ready-made sentiment values

from external NLP sources and maps them into scoring states defined in the rulebook.



Input: Pre-processed sentiment snapshot with sentiment scores from external NLP sources

Output: Normalized scores for MINOR and MAJOR timeframes, plus final weighted score

"""



from typing import Dict, Any, List, Optional

from rulebooks.sentiment_rulebook import SENTIMENT_RULEBOOK

from scoring.safe_eval import safe_eval



# Module weight constant

SENTIMENT_MODULE_WEIGHT = 0.80



# ============================================

# SENTIMENT SCORING ENGINE

# ============================================



class SentimentScoringEngine:

    """

    Sentiment Scoring Engine.

    

    Maps pre-processed sentiment signals to rulebook states and scores them.

    Does NOT perform NLP - only scores already-processed sentiment values.

    Uses both MINOR and MAJOR timeframes with safe eval() for condition evaluation.

    """

    

    def __init__(self, rulebook: Optional[Dict[str, Any]] = None) -> None:

        """

        Initialize the scoring engine.

        

        Args:

            rulebook: SENTIMENT_RULEBOOK (defaults to imported rulebook)

        """

        self.rulebook = rulebook or SENTIMENT_RULEBOOK

        self.weight = SENTIMENT_MODULE_WEIGHT

    

    # -----------------------------------------------------------

    # Safe eval helper

    # -----------------------------------------------------------

    

    def _safe_eval(self, condition: str, variables: Dict[str, Any]) -> bool:

        """

        Secure evaluation (no builtins).

        

        Args:

            condition: Python boolean expression string

            variables: Dictionary of variable names and values for eval

        

        Returns:

            True if condition evaluates to True, False otherwise

        """

        if not condition or condition.strip() == "":

            return False



        try:

            return safe_eval(condition, variables)

        except (ValueError, Exception):

            return False

    

    # -----------------------------------------------------------

    # Core scoring logic

    # -----------------------------------------------------------

    

    def score(self, sentiment_snapshot: Dict[str, Any]) -> Dict[str, Any]:

        """

        Calculate sentiment scores for MINOR and MAJOR timeframes.

        

        Args:

            sentiment_snapshot: Dictionary with sentiment data.

                Expected fields:

                - news_sentiment: float (-1 to +1)

                - social_sentiment: float (-1 to +1)

                - twitter_sentiment: float (-1 to +1)

                - reddit_sentiment: float (-1 to +1)

                - market_sentiment: float (-1 to +1)

                - stock_sentiment: float (-1 to +1)

                - volume_of_mentions: int

                - trending: bool

                - ... and more fields as needed

        

        Returns:

            Dictionary with:

                - minor_score: float

                - major_score: float

                - final_sentiment_score: float (weighted)

                - matched_states: List[str]

                - state_details: List[Dict[str, Any]]

        """

        # Score MINOR timeframe

        minor_score, minor_matched_states, minor_state_details = self._score_timeframe(

            timeframe="MINOR",

            snapshot=sentiment_snapshot

        )

        

        # Score MAJOR timeframe

        major_score, major_matched_states, major_state_details = self._score_timeframe(

            timeframe="MAJOR",

            snapshot=sentiment_snapshot

        )

        

        # Combine scores

        combined_score = self._combine_minor_major(minor_score, major_score)

        

        # Apply module weight

        final_sentiment_score = combined_score * self.weight

        

        # Combine matched states and details

        all_matched_states = minor_matched_states + major_matched_states

        all_state_details = minor_state_details + major_state_details

        

        return {

            "minor_score": minor_score,

            "major_score": major_score,

            "final_sentiment_score": final_sentiment_score,

            "matched_states": all_matched_states,

            "state_details": all_state_details

        }

    

    # -----------------------------------------------------------

    # Internal scoring logic

    # -----------------------------------------------------------

    

    def _score_timeframe(

        self,

        timeframe: str,

        snapshot: Dict[str, Any]

    ) -> tuple[float, List[str], List[Dict[str, Any]]]:

        """

        Score a single timeframe (MINOR or MAJOR).

        

        Args:

            timeframe: "MINOR" or "MAJOR"

            snapshot: Dictionary with sentiment data

        

        Returns:

            Tuple of:

                - score: float (average of matched scores, or 0.0 if none matched)

                - matched_states: List[str]

                - state_details: List[Dict[str, Any]]

        """

        if timeframe not in self.rulebook["timeframes"]:

            return 0.0, [], []

        

        states_def = self.rulebook["timeframes"][timeframe]["states"]

        

        # Build evaluation environment from snapshot

        eval_env = {}

        for k, v in snapshot.items():

            eval_env[k] = v

        

        # Add helper functions/constants for eval

        eval_env.update({

            "abs": abs,

            "True": True,

            "False": False,

            "None": None,

        })

        

        matched_states = []

        matched_scores = []

        state_details = []

        

        # Iterate over all states in this timeframe

        for state_name, state_data in states_def.items():

            condition = state_data.get("condition", "")

            score_range = state_data.get("score_range", [0, 0])

            

            # Skip if condition is empty or None

            if not condition:

                continue

            

            # Evaluate condition using safe eval

            if self._safe_eval(condition, eval_env):

                matched_states.append(state_name)

                

                # Calculate midpoint of score_range as raw score

                raw_min, raw_max = score_range

                raw_score = (raw_min + raw_max) / 2.0

                matched_scores.append(raw_score)

                

                # Store state details

                state_details.append({

                    "state_name": state_name,

                    "timeframe": timeframe,

                    "condition": condition,

                    "score_range": score_range,

                    "raw_score": raw_score

                })

        

        # Calculate average score

        if not matched_scores:

            return 0.0, [], []

        

        avg_score = sum(matched_scores) / len(matched_scores)

        return avg_score, matched_states, state_details

    

    # -----------------------------------------------------------

    # Helper: combine minor/major

    # -----------------------------------------------------------

    

    @staticmethod

    def _combine_minor_major(minor: float, major: float) -> float:

        """

        Combine MINOR and MAJOR timeframe scores.

        

        Args:

            minor: MINOR timeframe score

            major: MAJOR timeframe score

        

        Returns:

            Combined score:

                - If both present → 0.6 * minor + 0.4 * major

                - If only one → use that one

                - If neither → 0.0

        """

        has_minor = abs(minor) > 1e-6

        has_major = abs(major) > 1e-6

        

        if has_minor and has_major:

            # Weighted combination: 60% minor, 40% major

            return 0.6 * minor + 0.4 * major

        elif has_major:

            return major

        elif has_minor:

            return minor

        else:

            return 0.0



# ============================================

# CONVENIENCE FUNCTION

# ============================================



def score_sentiment(sentiment_snapshot: Dict[str, Any], rulebook=None) -> Dict[str, Any]:

    """

    Convenience function to score sentiment signals.

    

    Args:

        sentiment_snapshot: Dictionary with sentiment data

        rulebook: Optional custom rulebook (defaults to SENTIMENT_RULEBOOK)

    

    Returns:

        Dictionary with scores and matched states

    

    Example:

        sentiment_snapshot = {

            "news_sentiment": 0.7,

            "social_sentiment": 0.5,

            "twitter_sentiment": 0.6,

            "reddit_sentiment": 0.4,

            "market_sentiment": 0.3,

            "stock_sentiment": 0.65,

            "volume_of_mentions": 1500,

            "trending": True,

        }

        result = score_sentiment(sentiment_snapshot)

        print(result["final_sentiment_score"])

    """

    engine = SentimentScoringEngine(rulebook=rulebook)

    return engine.score(sentiment_snapshot)



# Export for use by Master Scoring System

__all__ = ["SentimentScoringEngine", "score_sentiment", "SENTIMENT_MODULE_WEIGHT"]
