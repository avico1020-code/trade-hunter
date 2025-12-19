# rulebooks/position_risk_rulebook.py

"""

Advanced Position & Risk Rulebook



This rulebook is consumed by PositionRiskScoringEngine and is responsible for:

- Account-level risk (drawdown, capital usage vs user limits)

- Position-level risk (risk per trade vs max allowed, stress conditions)

- Exposure-level risk (symbol / sector / correlated exposure)



All conditions are Python expressions evaluated in a restricted env

against a snapshot dict that should contain at least:



Account-level fields:

    daily_pl_pct              # today's P&L in % of account equity

    capital_usage_pct         # % of account capital currently in use

    max_capital_pct           # user-configured max capital usage %

    max_daily_dd_pct          # user-configured max daily drawdown %



Position-level fields (per symbol / active trade):

    has_open_position         # bool: do we have an active position on this symbol?

    position_risk_pct         # risk of this specific trade as % of account equity

    max_risk_per_trade_pct    # user-configured max risk per trade %

    unrealized_pl_pct         # unrealized P&L % on this position

    rr_multiple_live          # current R-multiple (unrealized_pl / initial_risk)



Exposure-level fields:

    symbol_exposure_pct           # % of equity in this ticker

    sector_exposure_pct           # % of equity in this ticker's sector

    correlated_exposure_pct       # % of equity in correlated names group

    max_symbol_exposure_pct       # user limit per single ticker

    max_sector_exposure_pct       # user limit per sector

    max_correlated_exposure_pct   # user limit for correlated basket

    open_positions_count          # current number of open positions

    max_open_positions            # maximum allowed open positions concurrently

"""



from __future__ import annotations

from typing import Dict, Any



POSITION_RISK_RULEBOOK: Dict[str, Any] = {

    "meta": {

        "score_scale": {

            "min": -10,

            "max": 10,

        },

        # Interpretive bands for the final risk score (per metric / group)

        "signal_levels": {

            "VERY_SAFE": [3, 10],

            "ACCEPTABLE": [1, 2],

            "NEUTRAL": [-1, 1],

            "WARNING": [-5, -2],

            "CRITICAL": [-10, -6],

        },

        "groups": {

            "ACCOUNT_RISK": {

                # How important is account-level risk vs others

                "base_weight": 1.2,

            },

            "POSITION_RISK": {

                "base_weight": 1.1,

            },

            "EXPOSURE_RISK": {

                "base_weight": 1.0,

            },

        },
        
        # Canonical specification - Group weights:
        # ACCOUNT_RISK: 1.2 (36.4% of position_risk_score)
        # POSITION_RISK: 1.1 (33.3% of position_risk_score)
        # EXPOSURE_RISK: 1.0 (30.3% of position_risk_score)
        # Total weight = 3.3
        #
        # ACCOUNT_RISK indicators:
        # - DAILY_DRAWDOWN: weight 1.0 (50% of account group = 18.2% of position_risk)
        # - CAPITAL_USAGE: weight 1.0 (50% of account group = 18.2% of position_risk)
        #
        # POSITION_RISK indicators:
        # - RISK_PER_TRADE: weight 1.1 (55% of position group = 18.3% of position_risk)
        # - POSITION_PERFORMANCE_STRESS: weight 0.9 (45% of position group = 15.0% of position_risk)
        #
        # EXPOSURE_RISK indicators:
        # - SYMBOL_EXPOSURE: weight 1.0 (25.6% of exposure group = 7.76% of position_risk)
        # - SECTOR_EXPOSURE: weight 1.0 (25.6% of exposure group = 7.76% of position_risk)
        # - CORRELATED_EXPOSURE: weight 1.1 (28.2% of exposure group = 8.55% of position_risk)
        # - OPEN_POSITIONS_COUNT: weight 0.8 (20.5% of exposure group = 6.22% of position_risk)
        #
        # Canonical formula:
        # position_risk_score = (
        #     account_risk_score * 1.2 +
        #     position_risk_score * 1.1 +
        #     exposure_risk_score * 1.0
        # ) / 3.3
        # position_risk_score ∈ [-10, +10]
        #
        # Note: Position Risk scoring is used for risk management and position sizing.
        # It provides internal weights for account risk, position risk, and exposure limits.
        # This is typically used by the Execution Engine for risk management, not directly in Master Scoring.

    },



    "metrics": {

        # ============================

        # 1. ACCOUNT-LEVEL RISK

        # ============================

        "DAILY_DRAWDOWN": {

            "group": "ACCOUNT_RISK",

            "weight": 1.0,

            "timeframes": {

                # DAILY drawdown is considered a MAJOR context metric

                "MAJOR": {

                    "states": {

                        # Extreme breach of daily drawdown limit

                        "DD_HARD_STOP_BREACH": {

                            "condition": "daily_pl_pct <= -1.2 * max_daily_dd_pct",

                            "raw_signal": "CRITICAL_RISK",

                            "score_range": [-10, -8],

                            "notes": "Daily P&L significantly beyond max_daily_dd_pct – trading day should be stopped.",

                        },

                        # Near or slightly beyond max daily drawdown

                        "DD_AT_OR_BEYOND_LIMIT": {

                            "condition": "daily_pl_pct <= -1.0 * max_daily_dd_pct and daily_pl_pct > -1.2 * max_daily_dd_pct",

                            "raw_signal": "HIGH_RISK",

                            "score_range": [-8, -6],

                            "notes": "Account is at or slightly beyond daily max drawdown.",

                        },

                        # In warning zone but not yet at official limit

                        "DD_WARNING_ZONE": {

                            "condition": "daily_pl_pct <= -0.7 * max_daily_dd_pct and daily_pl_pct > -1.0 * max_daily_dd_pct",

                            "raw_signal": "WARNING",

                            "score_range": [-5, -3],

                            "notes": "Approaching max drawdown – should reduce size / stop trading aggressively.",

                        },

                        # Nicely positive day – good mental/risk state

                        "DD_POSITIVE_DAY_STRONG": {

                            "condition": "daily_pl_pct >= 1.0 * max_daily_dd_pct",

                            "raw_signal": "VERY_SAFE",

                            "score_range": [3, 6],

                            "notes": "Very strong positive day relative to risk budget.",

                        },

                        # Mildly positive or flat day

                        "DD_NORMAL_DAY": {

                            "condition": "daily_pl_pct > -0.3 * max_daily_dd_pct and daily_pl_pct < 1.0 * max_daily_dd_pct",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-1, 2],

                            "notes": "Normal day within acceptable drawdown and profit range.",

                        },

                    },

                },

                # Intraday checks can optionally reuse similar logic if needed

                "MINOR": {

                    "states": {},

                },

            },

        },



        "CAPITAL_USAGE": {

            "group": "ACCOUNT_RISK",

            "weight": 1.0,

            "timeframes": {

                "MINOR": {

                    "states": {

                        # Gross abuse of capital usage – well beyond user limit

                        "CAPITAL_USAGE_EXTREME_OVER": {

                            "condition": "capital_usage_pct > 1.3 * max_capital_pct",

                            "raw_signal": "CRITICAL_RISK",

                            "score_range": [-10, -8],

                            "notes": "Capital usage far beyond configured max_capital_pct – severe risk.",

                        },

                        # Clearly beyond user limit but not extreme

                        "CAPITAL_USAGE_ABOVE_LIMIT": {

                            "condition": "capital_usage_pct > 1.05 * max_capital_pct and capital_usage_pct <= 1.3 * max_capital_pct",

                            "raw_signal": "HIGH_RISK",

                            "score_range": [-8, -6],

                            "notes": "Capital usage above allowed maximum – no new trades should be opened.",

                        },

                        # In high zone but still within allowed band

                        "CAPITAL_USAGE_HIGH_BUT_OK": {

                            "condition": "capital_usage_pct > 0.7 * max_capital_pct and capital_usage_pct <= 1.05 * max_capital_pct",

                            "raw_signal": "WARNING",

                            "score_range": [-4, -2],

                            "notes": "High usage of capital, new trades should be selective.",

                        },

                        # Efficient but not over-leveraged

                        "CAPITAL_USAGE_OPTIMAL": {

                            "condition": "capital_usage_pct >= 0.3 * max_capital_pct and capital_usage_pct <= 0.7 * max_capital_pct",

                            "raw_signal": "VERY_SAFE",

                            "score_range": [3, 5],

                            "notes": "Capital usage in a healthy operating range.",

                        },

                        # Under-utilization – not a risk, but low impact

                        "CAPITAL_USAGE_LOW": {

                            "condition": "capital_usage_pct < 0.3 * max_capital_pct",

                            "raw_signal": "NEUTRAL",

                            "score_range": [0, 2],

                            "notes": "Very low capital usage – conservative / under-trading.",

                        },

                    },

                },

                "MAJOR": {

                    "states": {},

                },

            },

        },



        # ============================

        # 2. POSITION-LEVEL RISK

        # ============================

        "RISK_PER_TRADE": {

            "group": "POSITION_RISK",

            "weight": 1.1,

            "timeframes": {

                "MINOR": {

                    "states": {

                        # Trade risk is way above allowed risk per trade

                        "RISK_PER_TRADE_EXTREME_OVER": {

                            "condition": "has_open_position and position_risk_pct > 1.5 * max_risk_per_trade_pct",

                            "raw_signal": "CRITICAL_RISK",

                            "score_range": [-10, -8],

                            "notes": "Single trade risking far more than user max_risk_per_trade_pct.",

                        },

                        # Trade risk slightly above allowed limit

                        "RISK_PER_TRADE_ABOVE_LIMIT": {

                            "condition": "has_open_position and position_risk_pct > 1.05 * max_risk_per_trade_pct and position_risk_pct <= 1.5 * max_risk_per_trade_pct",

                            "raw_signal": "HIGH_RISK",

                            "score_range": [-8, -6],

                            "notes": "Risk per trade above configured limit; reduce size / tighten stop.",

                        },

                        # Trade risk near upper bound but acceptable

                        "RISK_PER_TRADE_HIGH_BUT_OK": {

                            "condition": "has_open_position and position_risk_pct > 0.7 * max_risk_per_trade_pct and position_risk_pct <= 1.05 * max_risk_per_trade_pct",

                            "raw_signal": "WARNING",

                            "score_range": [-4, -2],

                            "notes": "Risk per trade in high zone, be careful adding more risk.",

                        },

                        # Ideal risk sizing

                        "RISK_PER_TRADE_OPTIMAL": {

                            "condition": "has_open_position and position_risk_pct >= 0.3 * max_risk_per_trade_pct and position_risk_pct <= 0.7 * max_risk_per_trade_pct",

                            "raw_signal": "VERY_SAFE",

                            "score_range": [3, 5],

                            "notes": "Risk per trade sized properly relative to risk budget.",

                        },

                        # Very small risk per trade (scalp / test size)

                        "RISK_PER_TRADE_SMALL": {

                            "condition": "has_open_position and position_risk_pct < 0.3 * max_risk_per_trade_pct",

                            "raw_signal": "ACCEPTABLE",

                            "score_range": [1, 3],

                            "notes": "Very small risk – safe but low impact.",

                        },

                        # No open position – neutral

                        "NO_OPEN_POSITION": {

                            "condition": "not has_open_position",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-1, 1],

                            "notes": "No active trade on this symbol.",

                        },

                    },

                },

                "MAJOR": {

                    "states": {},

                },

            },

        },



        "POSITION_PERFORMANCE_STRESS": {

            "group": "POSITION_RISK",

            "weight": 0.9,

            "timeframes": {

                "MINOR": {

                    "states": {

                        # Deep unrealized loss vs initial risk (e.g., beyond -1.2R)

                        "POSITION_DEEP_UNREALIZED_LOSS": {

                            "condition": "has_open_position and rr_multiple_live <= -1.2",

                            "raw_signal": "CRITICAL_RISK",

                            "score_range": [-10, -8],

                            "notes": "Unrealized loss well beyond planned risk (stop not respected or slippage).",

                        },

                        # Near stop-loss region (-0.8R to -1.2R)

                        "POSITION_NEAR_STOP": {

                            "condition": "has_open_position and rr_multiple_live > -1.2 and rr_multiple_live <= -0.8",

                            "raw_signal": "HIGH_RISK",

                            "score_range": [-7, -5],

                            "notes": "Position sitting near or slightly beyond intended stop.",

                        },

                        # Near target or locked profit (>= +1R)

                        "POSITION_AT_OR_ABOVE_TARGET": {

                            "condition": "has_open_position and rr_multiple_live >= 1.0",

                            "raw_signal": "VERY_SAFE",

                            "score_range": [3, 6],

                            "notes": "Trade has reached or exceeded 1R; risk is paid for.",

                        },

                        # Small P&L region (between -0.5R and +0.5R)

                        "POSITION_SMALL_MOVE": {

                            "condition": "has_open_position and rr_multiple_live > -0.5 and rr_multiple_live < 0.5",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-1, 2],

                            "notes": "Trade still in noise region; no major stress yet.",

                        },

                    },

                },

                "MAJOR": {

                    "states": {},

                },

            },

        },



        # ============================

        # 3. EXPOSURE-LEVEL RISK

        # ============================

        "SYMBOL_EXPOSURE": {

            "group": "EXPOSURE_RISK",

            "weight": 1.0,

            "timeframes": {

                "MINOR": {

                    "states": {

                        # Single ticker has extreme concentration

                        "SYMBOL_EXPOSURE_EXTREME": {

                            "condition": "symbol_exposure_pct > 1.5 * max_symbol_exposure_pct",

                            "raw_signal": "CRITICAL_RISK",

                            "score_range": [-10, -8],

                            "notes": "Concentration in a single symbol far beyond user limit.",

                        },

                        # Single ticker slightly above limit

                        "SYMBOL_EXPOSURE_ABOVE_LIMIT": {

                            "condition": "symbol_exposure_pct > 1.05 * max_symbol_exposure_pct and symbol_exposure_pct <= 1.5 * max_symbol_exposure_pct",

                            "raw_signal": "HIGH_RISK",

                            "score_range": [-8, -6],

                            "notes": "Single symbol exposure above user-defined limit.",

                        },

                        # High but still inside allowed band

                        "SYMBOL_EXPOSURE_HIGH_BUT_OK": {

                            "condition": "symbol_exposure_pct > 0.7 * max_symbol_exposure_pct and symbol_exposure_pct <= 1.05 * max_symbol_exposure_pct",

                            "raw_signal": "WARNING",

                            "score_range": [-4, -2],

                            "notes": "High single-symbol exposure – be careful adding more.",

                        },

                        # Healthy diversification per ticker

                        "SYMBOL_EXPOSURE_OPTIMAL": {

                            "condition": "symbol_exposure_pct >= 0.3 * max_symbol_exposure_pct and symbol_exposure_pct <= 0.7 * max_symbol_exposure_pct",

                            "raw_signal": "VERY_SAFE",

                            "score_range": [3, 5],

                            "notes": "Single-symbol exposure is in healthy range.",

                        },

                        # Very small symbol exposure

                        "SYMBOL_EXPOSURE_LOW": {

                            "condition": "symbol_exposure_pct < 0.3 * max_symbol_exposure_pct",

                            "raw_signal": "ACCEPTABLE",

                            "score_range": [0, 2],

                            "notes": "Very low concentration in this symbol.",

                        },

                    },

                },

                "MAJOR": {

                    "states": {},

                },

            },

        },



        "SECTOR_EXPOSURE": {

            "group": "EXPOSURE_RISK",

            "weight": 1.0,

            "timeframes": {

                "MINOR": {

                    "states": {

                        # Sector exposure is extreme relative to user limit

                        "SECTOR_EXPOSURE_EXTREME": {

                            "condition": "sector_exposure_pct > 1.5 * max_sector_exposure_pct",

                            "raw_signal": "CRITICAL_RISK",

                            "score_range": [-10, -8],

                            "notes": "Too much concentration in a single sector.",

                        },

                        # Slightly above target

                        "SECTOR_EXPOSURE_ABOVE_LIMIT": {

                            "condition": "sector_exposure_pct > 1.05 * max_sector_exposure_pct and sector_exposure_pct <= 1.5 * max_sector_exposure_pct",

                            "raw_signal": "HIGH_RISK",

                            "score_range": [-8, -6],

                            "notes": "Sector exposure above user-defined limit.",

                        },

                        # High but allowed

                        "SECTOR_EXPOSURE_HIGH_BUT_OK": {

                            "condition": "sector_exposure_pct > 0.7 * max_sector_exposure_pct and sector_exposure_pct <= 1.05 * max_sector_exposure_pct",

                            "raw_signal": "WARNING",

                            "score_range": [-4, -2],

                            "notes": "High exposure to this sector.",

                        },

                        # Balanced exposure

                        "SECTOR_EXPOSURE_OPTIMAL": {

                            "condition": "sector_exposure_pct >= 0.3 * max_sector_exposure_pct and sector_exposure_pct <= 0.7 * max_sector_exposure_pct",

                            "raw_signal": "VERY_SAFE",

                            "score_range": [3, 5],

                            "notes": "Sector exposure is well balanced.",

                        },

                        # Very small involvement in sector

                        "SECTOR_EXPOSURE_LOW": {

                            "condition": "sector_exposure_pct < 0.3 * max_sector_exposure_pct",

                            "raw_signal": "ACCEPTABLE",

                            "score_range": [0, 2],

                            "notes": "Low sector exposure – very low concentration risk.",

                        },

                    },

                },

                "MAJOR": {

                    "states": {},

                },

            },

        },



        "CORRELATED_EXPOSURE": {

            "group": "EXPOSURE_RISK",

            "weight": 1.1,

            "timeframes": {

                "MINOR": {

                    "states": {

                        # Basket of correlated names is extremely overloaded

                        "CORRELATED_EXPOSURE_EXTREME": {

                            "condition": "correlated_exposure_pct > 1.5 * max_correlated_exposure_pct",

                            "raw_signal": "CRITICAL_RISK",

                            "score_range": [-10, -8],

                            "notes": "Too much exposure in highly correlated names.",

                        },

                        # Slight breach of correlated exposure limit

                        "CORRELATED_EXPOSURE_ABOVE_LIMIT": {

                            "condition": "correlated_exposure_pct > 1.05 * max_correlated_exposure_pct and correlated_exposure_pct <= 1.5 * max_correlated_exposure_pct",

                            "raw_signal": "HIGH_RISK",

                            "score_range": [-8, -6],

                            "notes": "Correlated exposure above user-defined max.",

                        },

                        # High but still technically within range

                        "CORRELATED_EXPOSURE_HIGH_BUT_OK": {

                            "condition": "correlated_exposure_pct > 0.7 * max_correlated_exposure_pct and correlated_exposure_pct <= 1.05 * max_correlated_exposure_pct",

                            "raw_signal": "WARNING",

                            "score_range": [-4, -2],

                            "notes": "High correlated exposure; new trades in same basket should be avoided.",

                        },

                        # Reasonable correlated exposure

                        "CORRELATED_EXPOSURE_OPTIMAL": {

                            "condition": "correlated_exposure_pct >= 0.3 * max_correlated_exposure_pct and correlated_exposure_pct <= 0.7 * max_correlated_exposure_pct",

                            "raw_signal": "VERY_SAFE",

                            "score_range": [3, 5],

                            "notes": "Correlated exposure is in healthy band.",

                        },

                        # Very low correlated exposure

                        "CORRELATED_EXPOSURE_LOW": {

                            "condition": "correlated_exposure_pct < 0.3 * max_correlated_exposure_pct",

                            "raw_signal": "ACCEPTABLE",

                            "score_range": [0, 2],

                            "notes": "Portfolio is well diversified with respect to correlation.",

                        },

                    },

                },

                "MAJOR": {

                    "states": {},

                },

            },

        },



        "OPEN_POSITIONS_COUNT": {

            "group": "EXPOSURE_RISK",

            "weight": 0.8,

            "timeframes": {

                "MINOR": {

                    "states": {

                        "TOO_MANY_OPEN_POSITIONS": {

                            "condition": "open_positions_count > max_open_positions",

                            "raw_signal": "HIGH_RISK",

                            "score_range": [-8, -6],

                            "notes": "Number of open positions exceeds configured maximum.",

                        },

                        "NEAR_MAX_OPEN_POSITIONS": {

                            "condition": "open_positions_count == max_open_positions",

                            "raw_signal": "WARNING",

                            "score_range": [-4, -2],

                            "notes": "At maximum allowed positions – no more trades should be opened.",

                        },

                        "COMFORTABLE_NUM_POSITIONS": {

                            "condition": "open_positions_count > 0 and open_positions_count < max_open_positions",

                            "raw_signal": "ACCEPTABLE",

                            "score_range": [1, 3],

                            "notes": "Number of open positions is within the allowed range.",

                        },

                        "NO_OPEN_POSITIONS": {

                            "condition": "open_positions_count == 0",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-1, 1],

                            "notes": "No exposure via open positions.",

                        },

                    },

                },

                "MAJOR": {

                    "states": {},

                },

            },

        },

    },

}
