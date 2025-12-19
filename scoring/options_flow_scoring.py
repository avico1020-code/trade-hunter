# ==========================================================

#  OptionsFlowScoringEngine — FULL REBUILD (SECURE EVAL VERSION)

# ==========================================================

# This version replaces the old manual-logic options flow engine.

# It fully supports the new OPTIONS_FLOW_RULEBOOK with dynamic

# condition evaluation, groups, weights, and consistent output.

# ==========================================================



from dataclasses import dataclass

from typing import Dict, Any, List



from rulebooks.options_flow_rulebook import OPTIONS_FLOW_RULEBOOK

from scoring.safe_eval import safe_eval





@dataclass

class OptionsFlowScoreResult:

    minor_score: float

    final_options_flow_score: float

    matched_states: List[str]

    state_details: Dict[str, Any]





class OptionsFlowScoringEngine:

    """

    NEW eval-based Options Flow scoring engine.

    Compatible with the updated OPTIONS_FLOW_RULEBOOK.

    """



    def __init__(self, rulebook=None, weight: float = 1.05):

        self.rulebook = rulebook or OPTIONS_FLOW_RULEBOOK

        self.weight = weight



    # -----------------------------------------------------------

    # Safe eval environment

    # -----------------------------------------------------------

    def _safe_eval(self, condition: str, variables: Dict[str, Any]) -> bool:

        """Secure evaluation (no builtins)."""

        if not condition or condition.strip() == "":

            return False



        try:

            return safe_eval(condition, variables)

        except (ValueError, Exception):

            return False



    # -----------------------------------------------------------

    # Core scoring logic

    # -----------------------------------------------------------

    def score(self, options_snapshot: Dict[str, Any]) -> Dict[str, Any]:

        """

        Calculate options flow score based on rulebook states.

        - Only MINOR timeframe used for options flow

        """



        matched_states = []

        state_details = {}

        minor_score_accumulator = 0.0



        # -----------------------------------------------------------

        # Load group weights from meta.groups

        # -----------------------------------------------------------

        group_weights = {}

        groups_meta = self.rulebook.get("meta", {}).get("groups", {})

        for group_name, group_info in groups_meta.items():

            group_weights[group_name] = group_info.get("base_weight", 1.0)



        # -----------------------------------------------------------

        # Dynamic variable binding (names visible inside eval)

        # -----------------------------------------------------------

        allowed_names = {}

        for k, v in options_snapshot.items():

            allowed_names[k] = v

        

        # Add helper functions for eval

        allowed_names.update({

            "abs": abs,

            "True": True,

            "False": False,

            "None": None,

        })



        # -----------------------------------------------------------

        # Iterate rulebook states

        # -----------------------------------------------------------

        minor_tf = self.rulebook["timeframes"]["MINOR"]["states"]



        for state_name, state_data in minor_tf.items():

            condition = state_data.get("condition", "")

            score_range = state_data.get("score_range", [0, 0])

            group_name = state_data.get("group")



            if self._safe_eval(condition, allowed_names):

                matched_states.append(state_name)



                raw_min, raw_max = score_range

                avg_score = (raw_min + raw_max) / 2



                # Apply group weight if available, otherwise use 1.0

                base_weight = group_weights.get(group_name, 1.0) if group_name else 1.0

                weighted_score = avg_score * base_weight



                minor_score_accumulator += weighted_score



                state_details[state_name] = {

                    "condition": condition,

                    "avg_score": avg_score,

                    "weighted": weighted_score,

                    "base_weight": base_weight,

                    "group": group_name

                }



        # -----------------------------------------------------------

        # Final score (weighted module score)

        # -----------------------------------------------------------

        final_score = minor_score_accumulator * self.weight



        result = OptionsFlowScoreResult(

            minor_score=minor_score_accumulator,

            final_options_flow_score=final_score,

            matched_states=matched_states,

            state_details=state_details

        )



        return {

            "minor_score": result.minor_score,

            "final_options_flow_score": result.final_options_flow_score,

            "matched_states": result.matched_states,

            "state_details": result.state_details

        }





# ============================================

# CONVENIENCE FUNCTION

# ============================================



def score_options_flow(options_snapshot: Dict[str, Any], rulebook=None) -> Dict[str, Any]:

    """

    Convenience function to score options flow signals.

    

    Args:

        options_snapshot: Dictionary with options flow data

        rulebook: Optional custom rulebook (defaults to OPTIONS_FLOW_RULEBOOK)

    

    Returns:

        Dictionary with scores and matched states

    

    Example:

        options_snapshot = {

            "put_call_ratio": 0.5,

            "call_volume_mult": 3.5,

            "put_volume_mult": 1.2,

            "uoa_call_notional_mult": 4.0,

            "iv_change_pct": -25.0,  # IV crush

            "post_event": True,

            "skew_put_call_diff": -6.0,  # Call skew

            "gamma_exposure": 5000000,

            "near_gamma_flip": False,

        }

        result = score_options_flow(options_snapshot)

        print(result["final_options_flow_score"])

    """

    engine = OptionsFlowScoringEngine(rulebook=rulebook)

    return engine.score(options_snapshot)



# Export for use by Master Scoring System

__all__ = ["OptionsFlowScoringEngine", "score_options_flow", "OptionsFlowScoreResult"]
