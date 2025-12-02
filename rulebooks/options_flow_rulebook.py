# rulebooks/options_flow_rulebook.py

"""

Options Flow Rulebook



Used by: scoring/options_flow_scoring.py



Scope: STOCK_MICRO_GLOBAL (per symbol, intraday)

Timeframe: MINOR only (options flow הוא סופר תוך־יומי)



All scores: range [-10, +10]

Positive = bullish / long bias

Negative = bearish / short bias

"""



from __future__ import annotations

from typing import Dict, Any



OPTIONS_FLOW_RULEBOOK: Dict[str, Any] = {

    "meta": {

        "score_scale": {"min": -10, "max": 10},

        "signal_levels": {

            "STRONG_BULLISH": [6, 10],

            "MILD_BULLISH": [2, 5],

            "NEUTRAL": [-1, 1],

            "MILD_BEARISH": [-5, -2],

            "STRONG_BEARISH": [-10, -6],

            "CONFIRMATION": [2, 6],

        },

        # Canonical specification weights for each indicator
        # Total weight sum = 6.1
        # Each indicator weight represents its contribution to options_flow_score
        "groups": {

            "PUT_CALL_IMBALANCE": {

                "base_weight": 1.0,  # Canonical weight (16.4% of options_flow_score)

                "description": "Directional bias from put/call ratio & relative volumes. Measures imbalance between Put volume/OI and Call volume/OI.",
                
                # Refresh rules - when to recalculate Put/Call Imbalance
                "refresh_on": [
                    "Any significant intraday change in Put/Call ratio",
                    "New options volume spike on PUT or CALL side",
                    "Crossing key thresholds (extreme bullish/bearish levels)",
                    "Detection of unusual opening volume in OTM contracts"
                ],

            },

            "UOA": {

                "base_weight": 1.2,  # Canonical weight (19.7% of options_flow_score) - Highest weight

                "description": "Unusual options activity (large sweeps/blocks). Detects large sweeps, large blocks, multi-sweep clusters.",
                
                # Refresh rules - when to recalculate UOA (Unusual Options Activity)
                "refresh_on": [
                    "Every new Sweep detected (buy or sell)",
                    "Any Block trade above predefined notional threshold",
                    "Large single-order multi-exchange print",
                    "Volume > open interest event",
                    "New chain-level momentum burst (ex: massive sweep series)"
                ],

            },

            "OPEN_INTEREST": {

                "base_weight": 0.9,  # Canonical weight (14.8% of options_flow_score)

                "description": "Positioning build-up at key strikes. Identifies whether traders build long-term positioning.",
                
                # Refresh rules - when to recalculate Open Interest
                "refresh_on": [
                    "Overnight update (OI recalculates after market close)",
                    "Large intraday shift in OI for key strikes (rare but possible)",
                    "OI flip event: CALL-dominant → PUT-dominant or vice versa"
                ],

            },

            "IV": {

                "base_weight": 1.0,  # Canonical weight (16.4% of options_flow_score)

                "description": "Implied volatility expansion/crush. Measures IV expansion, crush, volatility shocks.",
                
                # Refresh rules - when to recalculate IV (Implied Volatility)
                "refresh_on": [
                    "IV spike or crush above defined sigma threshold",
                    "Earnings volatility build-up",
                    "Macro news shock event",
                    "At-the-money IV shift > defined sensitivity trigger"
                ],

            },

            "SKEW": {

                "base_weight": 0.9,  # Canonical weight (14.8% of options_flow_score)

                "description": "Put vs call IV skew. Measures relative pricing between puts and calls.",
                
                # Refresh rules - when to recalculate Skew
                "refresh_on": [
                    "Changes in IV skew between PUTs and CALLs > threshold",
                    "Risk reversal change event",
                    "Macro-driven skew shock (FED/CPI/etc.)"
                ],

            },

            "GAMMA": {  # Note: In canonical spec this is "GAMMA_EXPOSURE"

                "base_weight": 1.1,  # Canonical weight (18.0% of options_flow_score)

                "description": "Dealer gamma positioning (stability vs whipsaws). Dealer gamma regime: positive gamma stabilizes price; negative gamma amplifies volatility.",
                
                # Refresh rules - when to recalculate GAMMA (Dealer Positioning)
                "refresh_on": [
                    "Gamma flip (from positive gamma to negative gamma zone)",
                    "Large shift in dealer gamma exposure",
                    "Significant price movement toward max pain zone",
                    "Intraday move across gamma pin level"
                ],

            },

        },
        
        # Canonical formula for options_flow_score:
        # options_flow_score = (
        #     put_call_score * 1.0 +
        #     uoa_score * 1.2 +
        #     open_interest_score * 0.9 +
        #     iv_change_score * 1.0 +
        #     skew_score * 0.9 +
        #     gamma_score * 1.1
        # ) / 6.1
        # Final contribution to Master Score = options_flow_score * 0.12
        
        "master_scoring_weight": 0.12,  # Weight in Master Scoring System (w_options from scoring_system.py)
        
        # Refresh rules note:
        # The Options Flow department must recompute its department score
        # whenever any contained indicator triggers a refresh event.
        # Each indicator has its own refresh_on conditions defined below.

    },



    # Options flow is modeled as a pure intraday (MINOR) component.

    "timeframes": {

        "MINOR": {

            "states": {

                # ============================

                # PUT / CALL VOLUME IMBALANCE

                # ============================

                "CALL_IMBALANCE_EXTREME_BULL": {

                    "group": "PUT_CALL_IMBALANCE",

                    "description": "Call volume 3–5x normal, put/call ratio very low.",

                    "condition": (

                        "put_call_ratio is not None and "

                        "put_call_ratio < 0.6 and "

                        "call_volume_mult is not None and "

                        "call_volume_mult >= 3.0"

                    ),

                    "score_range": [6, 9],

                    "notes": "Strong speculative or directional bullish demand in calls."

                },

                "CALL_IMBALANCE_MILD_BULL": {

                    "group": "PUT_CALL_IMBALANCE",

                    "description": "Call volume moderately elevated, ratio < 0.8.",

                    "condition": (

                        "put_call_ratio is not None and "

                        "put_call_ratio < 0.8 and "

                        "call_volume_mult is not None and "

                        "1.5 <= call_volume_mult < 3.0"

                    ),

                    "score_range": [3, 5],

                    "notes": "Mild call dominance, bullish tilt."

                },

                "PUT_IMBALANCE_EXTREME_BEAR": {

                    "group": "PUT_CALL_IMBALANCE",

                    "description": "Put volume 3–5x normal, put/call ratio very high.",

                    "condition": (

                        "put_call_ratio is not None and "

                        "put_call_ratio > 2.0 and "

                        "put_volume_mult is not None and "

                        "put_volume_mult >= 3.0"

                    ),

                    "score_range": [-9, -6],

                    "notes": "Aggressive downside hedging/speculation."

                },

                "PUT_IMBALANCE_MILD_BEAR": {

                    "group": "PUT_CALL_IMBALANCE",

                    "description": "Put volume moderately elevated, ratio > 1.3.",

                    "condition": (

                        "put_call_ratio is not None and "

                        "put_call_ratio > 1.3 and "

                        "put_volume_mult is not None and "

                        "1.5 <= put_volume_mult < 3.0"

                    ),

                    "score_range": [-5, -2],

                    "notes": "Bearish tilt / growing demand for protection."

                },



                # ============================

                # UNUSUAL OPTIONS ACTIVITY (UOA)

                # ============================

                "UOA_MASSIVE_CALL_SWEEPS": {

                    "group": "UOA",

                    "description": "Large aggressive call sweeps, often near-term expiry.",

                    "condition": (

                        "uoa_call_notional_mult is not None and "

                        "uoa_call_notional_mult >= 5.0"

                    ),

                    "score_range": [7, 9],

                    "notes": "Strong conviction bullish flow, often smart money."

                },

                "UOA_STRONG_CALL_ACTIVITY": {

                    "group": "UOA",

                    "description": "Significant but not extreme call UOA.",

                    "condition": (

                        "uoa_call_notional_mult is not None and "

                        "3.0 <= uoa_call_notional_mult < 5.0"

                    ),

                    "score_range": [4, 6],

                    "notes": "Bullish bias, but less explosive than massive sweeps."

                },

                "UOA_MASSIVE_PUT_SWEEPS": {

                    "group": "UOA",

                    "description": "Large aggressive put sweeps.",

                    "condition": (

                        "uoa_put_notional_mult is not None and "

                        "uoa_put_notional_mult >= 5.0"

                    ),

                    "score_range": [-9, -7],

                    "notes": "Strong conviction bearish / crash protection demand."

                },

                "UOA_STRONG_PUT_ACTIVITY": {

                    "group": "UOA",

                    "description": "Significant but not extreme put UOA.",

                    "condition": (

                        "uoa_put_notional_mult is not None and "

                        "3.0 <= uoa_put_notional_mult < 5.0"

                    ),

                    "score_range": [-6, -4],

                    "notes": "Bearish bias / risk-off flow."

                },



                # ============================

                # OPEN INTEREST SHIFTS

                # ============================

                "OI_CALL_BUILD_NEAR_SPOT": {

                    "group": "OPEN_INTEREST",

                    "description": "Large call OI build near spot price.",

                    "condition": (

                        "oi_call_change_pct is not None and "

                        "oi_call_change_pct >= 30 and "

                        "oi_near_spot_call is True"

                    ),

                    "score_range": [3, 5],

                    "notes": "Price may be 'magnetized' upward towards call-heavy strikes."

                },

                "OI_PUT_BUILD_NEAR_SPOT": {

                    "group": "OPEN_INTEREST",

                    "description": "Large put OI build near spot price.",

                    "condition": (

                        "oi_put_change_pct is not None and "

                        "oi_put_change_pct >= 30 and "

                        "oi_near_spot_put is True"

                    ),

                    "score_range": [-5, -3],

                    "notes": "Downside magnet / protection cluster near spot."

                },



                # ============================

                # IV MOVEMENT (CRUSH / EXPANSION)

                # ============================

                "IV_CRUSH_POST_EVENT": {

                    "group": "IV",

                    "description": "IV collapsing sharply after major event.",

                    "condition": (

                        "iv_change_pct is not None and "

                        "iv_change_pct <= -20 and "

                        "post_event is True"

                    ),

                    "score_range": [3, 6],

                    "notes": "Risk premium removed; usually stabilizing / mildly bullish for stock."

                },

                "IV_STEADY_DECLINE": {

                    "group": "IV",

                    "description": "IV grinding down, risk premium slowly fading.",

                    "condition": (

                        "iv_change_pct is not None and "

                        "-20 < iv_change_pct <= -5"

                    ),

                    "score_range": [2, 4],

                    "notes": "Calmer regime, supportive for trend continuation."

                },

                "IV_SPIKE_FEAR": {

                    "group": "IV",

                    "description": "IV spikes sharply without clear positive catalyst.",

                    "condition": (

                        "iv_change_pct is not None and "

                        "iv_change_pct >= 20"

                    ),

                    "score_range": [-7, -4],

                    "notes": "Risk-off / fear spike; increased probability of sharp moves."

                },



                # ============================

                # SKEW (PUT vs CALL)

                # ============================

                "PUT_SKEW_STEEP_BEARISH": {

                    "group": "SKEW",

                    "description": "Put IV much higher than call IV.",

                    "condition": (

                        "skew_put_call_diff is not None and "

                        "skew_put_call_diff >= 10"

                    ),

                    "score_range": [-5, -3],

                    "notes": "Crash premium; market pays up for downside protection."

                },

                "CALL_SKEW_BULLISH_CHASING": {

                    "group": "SKEW",

                    "description": "Call IV > put IV, upside chasing.",

                    "condition": (

                        "skew_put_call_diff is not None and "

                        "skew_put_call_diff <= -5"

                    ),

                    "score_range": [3, 5],

                    "notes": "Melt-up / chase behavior; short-covering or FOMO."

                },



                # ============================

                # GAMMA EXPOSURE (GEX)

                # ============================

                "POSITIVE_GAMMA_STABLE": {

                    "group": "GAMMA",

                    "description": "Dealer positioning in positive gamma zone.",

                    "condition": (

                        "gamma_exposure is not None and "

                        "gamma_exposure > 0 and "

                        "near_gamma_flip is False"

                    ),

                    "score_range": [2, 4],

                    "notes": "Dealers dampen volatility; moves more likely to be contained."

                },

                "NEGATIVE_GAMMA_VOLATILE": {

                    "group": "GAMMA",

                    "description": "Deep negative gamma; dealers forced to chase moves.",

                    "condition": (

                        "gamma_exposure is not None and "

                        "gamma_exposure < 0 and "

                        "abs(gamma_exposure) >= gamma_critical_threshold"

                    ),

                    "score_range": [-8, -5],

                    "notes": "Environment for violent intraday moves and squeezes."

                },

                "NEAR_GAMMA_FLIP_UNSTABLE": {

                    "group": "GAMMA",

                    "description": "Price near gamma flip level, regime can switch quickly.",

                    "condition": (

                        "near_gamma_flip is True"

                    ),

                    "score_range": [-3, 3],

                    "notes": "Transition zone; direction determined by price/flow context."

                },

            }

        },



        "MAJOR": {

            # Options flow is highly intraday; we keep MAJOR empty for now.

            "states": {}

        }

    }

}
