# rulebooks/macro_scoring_rulebook.py

"""
MARKET MACRO SCORING RULEBOOK

קובץ זה מגדיר את חוקי הניקוד לניתוח מאקרו של השוק (Market Macro Analysis).
זה לא רק חדשות מאקרו, אלא ניתוח טכני ומאקרו-אקונומי של מצב השוק.

הקובץ כולל dimensions שונים:
- MARKET_TREND: מגמת השוק (SPY, QQQ)
- VOLATILITY: משטר תנודתיות (VIX)
- RATES_AND_DOLLAR: ריבית ודולר
- CREDIT_RISK: סיכוני אשראי
- BREADTH: רוחב השוק
- SENTIMENT_EVENT: סנטימנט ואירועים

כל dimension כולל:
- states עם conditions
- score_range לכל state
- base_weight לכל dimension
- context_rules להתייחסות בין dimensions

טווח ציונים: [-10, +10]
"""

from __future__ import annotations
from typing import Dict, List, Literal, TypedDict, Optional

ScoreRange = List[int]  # [min_score, max_score]


class MacroScoringState(TypedDict):
    condition: str  # Python expression
    raw_signal: Literal["STRONG_BULLISH", "MILD_BULLISH", "NEUTRAL", "MILD_BEARISH", "STRONG_BEARISH"]
    score_range: ScoreRange
    notes: str


class ContextRule(TypedDict):
    when: str  # Condition when rule applies
    adjustment: str  # "reinforce_bullish", "reinforce_bearish", "neutralize", etc.
    reason: str


class DimensionTimeframe(TypedDict):
    states: Dict[str, MacroScoringState]
    context_rules: Optional[List[ContextRule]]


class DimensionConfig(TypedDict):
    description: str
    base_weight: float
    inputs_expected: List[str]
    timeframes: Dict[str, DimensionTimeframe]


class MacroScoringRulebook(TypedDict):
    meta: Dict[str, object]
    dimensions: Dict[str, DimensionConfig]


MACRO_SCORING_RULEBOOK: MacroScoringRulebook = {
    "meta": {
        "score_scale": {"min": -10, "max": 10},
        "bias_levels": {
            "STRONG_BULLISH": [6, 10],
            "MILD_BULLISH": [2, 5],
            "NEUTRAL": [-1, 1],
            "MILD_BEARISH": [-5, -2],
            "STRONG_BEARISH": [-10, -6]
        },
        "timeframes": {
            "DAILY": {
                "description": "Higher-timeframe context (swing bias for the session).",
                "typical_bars": "1D"
            },
            "INTRADAY": {
                "description": "Real-time state for today (5m / 15m bars).",
                "typical_bars": "5m / 15m"
            }
        },
        "master_scoring_weight": 0.14,  # Weight in Master Scoring System (canonical specification)
        
        # Canonical specification weights for each dimension:
        # MARKET_TREND: 1.3 (18.8% of macro_score)
        # VOLATILITY: 1.2 (17.4% of macro_score)
        # RATES_AND_DOLLAR: 1.1 (15.9% of macro_score)
        # CREDIT_RISK: 1.0 (14.5% of macro_score)
        # BREADTH: 1.2 (17.4% of macro_score)
        # SENTIMENT_EVENT: 0.9 (13.0% of macro_score)
        # Total weight = 6.9
        # 
        # Canonical formula:
        # macro_score = (
        #     market_trend_score * 1.3 +
        #     volatility_score * 1.2 +
        #     rates_dollar_score * 1.1 +
        #     credit_risk_score * 1.0 +
        #     breadth_score * 1.2 +
        #     sentiment_event_score * 0.9
        # ) / 6.9
        # Final contribution to Master Score = macro_score * 0.14
        
        # Refresh rules note:
        # The Macro Scoring department must recompute its department score
        # whenever any contained dimension triggers a refresh event.
        # Each dimension has its own refresh_on conditions defined below.
    },
    "dimensions": {
        "MARKET_TREND": {
            "description": "Trend regime of main indices (SPY, QQQ, maybe IWM/DIA).",
            "base_weight": 1.3,
            # Refresh rules - when to recalculate Market Trend
            "refresh_on": [
                "Daily close of major indices (SPY, QQQ)",
                "Regime shift event (trend → consolidation → trend)",
                "Breakout or breakdown beyond major levels",
                "Key moving average cross events (SMA50/SMA200)"
            ],
            "inputs_expected": [
                "spy_price", "spy_sma50", "spy_sma200",
                "spy_trend_daily_structure", "qqq_trend_daily_structure",
                "spy_return_5d", "spy_return_20d",
                "intraday_trend_spy", "intraday_trend_qqq"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "BULL_TREND_STRONG": {
                            "condition": (
                                "spy_price > spy_sma50 AND spy_price > spy_sma200 "
                                "AND spy_sma50 > spy_sma200 "
                                "AND spy_trend_daily_structure == 'UP'"
                            ),
                            "raw_signal": "STRONG_BULLISH",
                            "score_range": [7, 9],
                            "notes": "Classic bull regime: price and MAs aligned up (SPY)."
                        },
                        "BULL_TREND_MILD": {
                            "condition": (
                                "spy_price > spy_sma50 AND spy_sma50 > spy_sma200 "
                                "AND spy_trend_daily_structure == 'UP'"
                            ),
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [3, 5],
                            "notes": "Bullish but not as strong - price might be choppy."
                        },
                        "NEUTRAL_TREND": {
                            "condition": (
                                "(spy_price > spy_sma50 AND spy_price < spy_sma200) OR "
                                "(spy_price < spy_sma50 AND spy_price > spy_sma200)"
                            ),
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Mixed signals - ranging market."
                        },
                        "BEAR_TREND_MILD": {
                            "condition": (
                                "spy_price < spy_sma50 AND spy_sma50 < spy_sma200 "
                                "AND spy_trend_daily_structure == 'DOWN'"
                            ),
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-3, -5],
                            "notes": "Bearish but not as strong."
                        },
                        "BEAR_TREND_STRONG": {
                            "condition": (
                                "spy_price < spy_sma50 AND spy_price < spy_sma200 "
                                "AND spy_sma50 < spy_sma200 "
                                "AND spy_trend_daily_structure == 'DOWN'"
                            ),
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-7, -9],
                            "notes": "Classic bear regime: price and MAs aligned down."
                        }
                    },
                    "context_rules": [
                        {
                            "when": "BULL_TREND_STRONG active AND qqq_trend_daily_structure == 'UP'",
                            "adjustment": "reinforce_bullish",
                            "reason": "Both SPY and QQQ in confirmed bull trends → strong risk-on."
                        },
                        {
                            "when": "BEAR_TREND_STRONG active AND qqq_trend_daily_structure == 'DOWN'",
                            "adjustment": "reinforce_bearish",
                            "reason": "Both SPY and QQQ in confirmed bear trends → strong risk-off."
                        }
                    ]
                },
                "INTRADAY": {
                    "states": {
                        "INTRADAY_UPTREND": {
                            "condition": (
                                "intraday_trend_spy == 'UP' "
                                "AND intraday_trend_qqq == 'UP'"
                            ),
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 4],
                            "notes": "Intraday higher highs/higher lows, above VWAP."
                        },
                        "INTRADAY_DOWNTREND": {
                            "condition": (
                                "intraday_trend_spy == 'DOWN' "
                                "AND intraday_trend_qqq == 'DOWN'"
                            ),
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -4],
                            "notes": "Intraday lower highs/lower lows, below VWAP."
                        },
                        "INTRADAY_NEUTRAL": {
                            "condition": (
                                "intraday_trend_spy == 'NEUTRAL' "
                                "OR intraday_trend_qqq == 'NEUTRAL'"
                            ),
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Choppy intraday action."
                        }
                    },
                    "context_rules": [
                        {
                            "when": "DAILY state == 'BULL_TREND_STRONG' AND INTRADAY state == 'INTRADAY_UPTREND'",
                            "adjustment": "reinforce_bullish",
                            "reason": "Daily and intraday aligned up – best environment for long setups."
                        },
                        {
                            "when": "DAILY state == 'BEAR_TREND_STRONG' AND INTRADAY state == 'INTRADAY_DOWNTREND'",
                            "adjustment": "reinforce_bearish",
                            "reason": "Daily and intraday aligned down – best environment for short setups."
                        }
                    ]
                }
            }
        },
        "VOLATILITY": {
            "description": "Systemic volatility regime (VIX, realized vol).",
            "base_weight": 1.2,
            # Refresh rules - when to recalculate Volatility (Systemic Volatility)
            "refresh_on": [
                "VIX daily close",
                "Intraday VIX spike above volatility threshold (+sigma event)",
                "Volatility crush after major macro news",
                "Shift from low-vol regime → high-vol regime or inverse"
            ],
            "inputs_expected": [
                "vix_level", "vix_sma20", "vix_structure",
                "spy_realized_vol_20d", "spy_realized_vol_5d"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "LOW_VOL_STABLE": {
                            "condition": "vix_level < 15 AND vix_level < vix_sma20",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 4],
                            "notes": "Low VIX = complacency, but can support continued upside."
                        },
                        "NORMAL_VOL": {
                            "condition": "15 <= vix_level < 25",
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Normal volatility range."
                        },
                        "ELEVATED_VOL": {
                            "condition": "25 <= vix_level < 35",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -4],
                            "notes": "Elevated fear - risk-off environment."
                        },
                        "EXTREME_VOL": {
                            "condition": "vix_level >= 35",
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-6, -8],
                            "notes": "Extreme fear - market stress, avoid new positions."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "VIX_SPIKING": {
                            "condition": "vix_level > vix_sma20 * 1.2",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-3, -5],
                            "notes": "VIX spiking intraday - sudden fear."
                        },
                        "VIX_COMPRESSING": {
                            "condition": "vix_level < vix_sma20 * 0.8",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 3],
                            "notes": "VIX compressing - fear subsiding."
                        }
                    },
                    "context_rules": []
                }
            }
        },
        "RATES_AND_DOLLAR": {
            "description": "Rates (10Y, curve) and USD strength.",
            "base_weight": 1.1,
            # Refresh rules - when to recalculate Rates and Dollar
            "refresh_on": [
                "10Y Treasury yield movement above defined sensitivity threshold",
                "Yield curve inversion or steepening beyond threshold",
                "Dollar index (DXY) breakout or breakdown",
                "FOMC announcement or Fed speaker events"
            ],
            "inputs_expected": [
                "tnx_level", "tnx_change_5d", "yield_curve_slope",
                "dxy_level", "dxy_change_5d"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "RATES_FALLING_STRONG": {
                            "condition": "tnx_change_5d < -0.5",
                            "raw_signal": "STRONG_BULLISH",
                            "score_range": [6, 8],
                            "notes": "Falling rates - bullish for growth stocks."
                        },
                        "RATES_FALLING_MILD": {
                            "condition": "-0.5 <= tnx_change_5d < -0.2",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 4],
                            "notes": "Mildly falling rates."
                        },
                        "RATES_STABLE": {
                            "condition": "-0.2 <= tnx_change_5d <= 0.2",
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Stable rate environment."
                        },
                        "RATES_RISING_MILD": {
                            "condition": "0.2 < tnx_change_5d <= 0.5",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -4],
                            "notes": "Rising rates - bearish for growth stocks."
                        },
                        "RATES_RISING_STRONG": {
                            "condition": "tnx_change_5d > 0.5",
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-6, -8],
                            "notes": "Strongly rising rates - major headwind."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "RATES_SPIKING": {
                            "condition": "tnx_change_5d > 0.3",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -4],
                            "notes": "Rates spiking intraday - negative for tech/growth."
                        },
                        "RATES_FALLING": {
                            "condition": "tnx_change_5d < -0.3",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 4],
                            "notes": "Rates falling intraday - positive for tech/growth."
                        }
                    },
                    "context_rules": []
                }
            }
        },
        "CREDIT_RISK": {
            "description": "Credit spreads, high yield vs investment grade.",
            "base_weight": 1.0,
            # Refresh rules - when to recalculate Credit Risk
            "refresh_on": [
                "High-yield vs investment-grade spread changes",
                "Widening or tightening of credit spreads beyond threshold",
                "Macro-risk events impacting credit markets (geopolitical, liquidity shocks)",
                "Major bond market dislocations"
            ],
            "inputs_expected": [
                "hyg_spread", "hyg_spread_sma20", "lqd_performance"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "CREDIT_HEALTHY": {
                            "condition": "hyg_spread < hyg_spread_sma20",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 4],
                            "notes": "Tight spreads - healthy credit conditions."
                        },
                        "CREDIT_NEUTRAL": {
                            "condition": "hyg_spread == hyg_spread_sma20",
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Normal credit conditions."
                        },
                        "CREDIT_STRESS": {
                            "condition": "hyg_spread > hyg_spread_sma20 * 1.2",
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-6, -8],
                            "notes": "Widening spreads - credit stress, risk-off."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "CREDIT_IMPROVING": {
                            "condition": "hyg_spread < hyg_spread_sma20 * 0.9",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [1, 3],
                            "notes": "Credit improving intraday."
                        },
                        "CREDIT_DETERIORATING": {
                            "condition": "hyg_spread > hyg_spread_sma20 * 1.1",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -4],
                            "notes": "Credit deteriorating intraday."
                        }
                    },
                    "context_rules": []
                }
            }
        },
        "BREADTH": {
            "description": "Market breadth (% above MAs, adv/decline, new highs/lows).",
            "base_weight": 1.2,
            # Refresh rules - when to recalculate Breadth
            "refresh_on": [
                "Daily close of advance/decline line",
                "% of stocks above SMAs recalculated at daily close",
                "Sector-wide breadth thrust event",
                "Market-wide participation shift (broad → narrow or inverse)"
            ],
            "inputs_expected": [
                "adv_decline_ratio", "new_highs_new_lows",
                "percent_above_sma50", "percent_above_sma200"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "BREADTH_VERY_STRONG": {
                            "condition": (
                                "percent_above_sma50 > 70 AND "
                                "percent_above_sma200 > 60 AND "
                                "adv_decline_ratio > 2.0"
                            ),
                            "raw_signal": "STRONG_BULLISH",
                            "score_range": [6, 8],
                            "notes": "Very broad participation - healthy bull market."
                        },
                        "BREADTH_STRONG": {
                            "condition": (
                                "percent_above_sma50 > 50 AND "
                                "adv_decline_ratio > 1.5"
                            ),
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [3, 5],
                            "notes": "Good breadth - most stocks participating."
                        },
                        "BREADTH_NEUTRAL": {
                            "condition": (
                                "30 <= percent_above_sma50 <= 70 AND "
                                "0.8 <= adv_decline_ratio <= 1.5"
                            ),
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Mixed breadth."
                        },
                        "BREADTH_WEAK": {
                            "condition": (
                                "percent_above_sma50 < 30 OR "
                                "adv_decline_ratio < 0.8"
                            ),
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-3, -5],
                            "notes": "Weak breadth - narrow participation."
                        },
                        "BREADTH_VERY_WEAK": {
                            "condition": (
                                "percent_above_sma50 < 20 AND "
                                "percent_above_sma200 < 30 AND "
                                "adv_decline_ratio < 0.6"
                            ),
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-6, -8],
                            "notes": "Very weak breadth - bear market conditions."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "BREADTH_IMPROVING": {
                            "condition": "adv_decline_ratio > 1.5",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 3],
                            "notes": "Breadth improving intraday."
                        },
                        "BREADTH_DETERIORATING": {
                            "condition": "adv_decline_ratio < 0.7",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -3],
                            "notes": "Breadth deteriorating intraday."
                        }
                    },
                    "context_rules": []
                }
            }
        },
        "SENTIMENT_EVENT": {
            "description": "Event-risk and sentiment regime for today (macro calendar, gap structure).",
            "base_weight": 0.9,
            # Refresh rules - when to recalculate Sentiment Event
            "refresh_on": [
                "Major macro news event (CPI, PPI, NFP, GDP)",
                "FED rate decision, FOMC minutes release",
                "Large volatility shock",
                "Geopolitical escalation or de-escalation",
                "Unexpected macro catalyst (bank failure, commodity shock)"
            ],
            "inputs_expected": [
                "fear_greed_index", "gap_structure",
                "macro_events_today", "earnings_density"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "SENTIMENT_EXTREME_GREED": {
                            "condition": "fear_greed_index > 75",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -4],
                            "notes": "Extreme greed - contrarian bearish signal."
                        },
                        "SENTIMENT_GREED": {
                            "condition": "55 < fear_greed_index <= 75",
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Greedy but not extreme."
                        },
                        "SENTIMENT_NEUTRAL": {
                            "condition": "45 <= fear_greed_index <= 55",
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Neutral sentiment."
                        },
                        "SENTIMENT_FEAR": {
                            "condition": "25 <= fear_greed_index < 45",
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Fearful but not extreme."
                        },
                        "SENTIMENT_EXTREME_FEAR": {
                            "condition": "fear_greed_index < 25",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 4],
                            "notes": "Extreme fear - contrarian bullish signal."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "MAJOR_EVENT_TODAY": {
                            "condition": "macro_events_today > 0",
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Major macro event today - increased volatility expected."
                        },
                        "GAP_UP_STRONG": {
                            "condition": "gap_structure == 'GAP_UP_STRONG'",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [1, 3],
                            "notes": "Strong gap up - positive sentiment."
                        },
                        "GAP_DOWN_STRONG": {
                            "condition": "gap_structure == 'GAP_DOWN_STRONG'",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-1, -3],
                            "notes": "Strong gap down - negative sentiment."
                        }
                    },
                    "context_rules": []
                }
            }
        }
    }
}

