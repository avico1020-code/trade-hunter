# rulebooks/sector_scoring_rulebook.py

"""
SECTOR SCORING RULEBOOK

קובץ זה מגדיר את חוקי הניקוד לניתוח סקטורים (Sector Analysis).
זה לא רק חדשות סקטור, אלא ניתוח טכני של מצב הסקטורים.

הקובץ כולל dimensions שונים:
- SECTOR_TREND: מגמת הסקטור (vs SPY)
- RELATIVE_STRENGTH: חוזק יחסי של הסקטור
- SECTOR_MOMENTUM: מומנטום של הסקטור
- SECTOR_VOLATILITY: תנודתיות הסקטור
- SECTOR_ROTATION: סיבוב סקטורים

כל dimension כולל:
- states עם conditions
- score_range לכל state
- base_weight לכל dimension
- context_rules

טווח ציונים: [-10, +10]
"""

from __future__ import annotations
from typing import Dict, List, Literal, TypedDict, Optional

ScoreRange = List[int]  # [min_score, max_score]


class SectorScoringState(TypedDict):
    condition: str  # Python expression
    raw_signal: Literal["STRONG_BULLISH", "MILD_BULLISH", "NEUTRAL", "MILD_BEARISH", "STRONG_BEARISH"]
    score_range: ScoreRange
    notes: str


class ContextRule(TypedDict):
    when: str  # Condition when rule applies
    adjustment: str
    reason: str


class DimensionTimeframe(TypedDict):
    states: Dict[str, SectorScoringState]
    context_rules: Optional[List[ContextRule]]


class DimensionConfig(TypedDict):
    description: str
    base_weight: float
    inputs_expected: List[str]
    timeframes: Dict[str, DimensionTimeframe]


class SectorScoringRulebook(TypedDict):
    meta: Dict[str, object]
    dimensions: Dict[str, DimensionConfig]


SECTOR_SCORING_RULEBOOK: SectorScoringRulebook = {
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
                "description": "Higher-timeframe context for sector analysis.",
                "typical_bars": "1D"
            },
            "INTRADAY": {
                "description": "Real-time sector state for today.",
                "typical_bars": "5m / 15m"
            }
        },
        "master_scoring_weight": 0.14,  # Weight in Master Scoring System (canonical specification)
        
        # Canonical specification weights for each dimension:
        # SECTOR_TREND: 1.3 (23.6% of sector_score)
        # RELATIVE_STRENGTH: 1.2 (21.8% of sector_score)
        # SECTOR_MOMENTUM: 1.1 (20.0% of sector_score)
        # SECTOR_VOLATILITY: 0.9 (16.4% of sector_score)
        # SECTOR_ROTATION: 1.0 (18.2% of sector_score)
        # Total weight = 5.5
        # 
        # Canonical formula:
        # sector_score = (
        #     sector_trend_score * 1.3 +
        #     relative_strength_score * 1.2 +
        #     momentum_score * 1.1 +
        #     volatility_score * 0.9 +
        #     rotation_score * 1.0
        # ) / 5.5
        # Final contribution to Master Score = sector_score * 0.14
        
        # Refresh rules note:
        # The Sector Scoring department must recompute its department score
        # whenever any contained dimension triggers a refresh event.
        # Each dimension has its own refresh_on conditions defined below.
        
        "sectors_tracked": [
            "XLK",  # Technology
            "XLE",  # Energy
            "XLF",  # Financials
            "XLV",  # Healthcare
            "XLRE", # Real Estate
            "XLI",  # Industrials
            "XLB",  # Materials
            "XLY",  # Consumer Discretionary
            "XLP",  # Consumer Staples
            "XLU"   # Utilities
        ]
    },
    "dimensions": {
        "SECTOR_TREND": {
            "description": "Trend of the sector ETF vs SPY and its own moving averages.",
            "base_weight": 1.3,
            # Refresh rules - when to recalculate Sector Trend
            "refresh_on": [
                "Daily close of the sector ETF (XLK, XLF, XLE, XLY, etc.)",
                "Significant intraday breakout or breakdown relative to major SMAs",
                "Trend regime shift (bull → neutral → bear)",
                "Sector SMA cross events (SMA20/SMA50/SMA200)"
            ],
            "inputs_expected": [
                "sector_price", "sector_sma50", "sector_sma200",
                "sector_vs_spy_ratio", "sector_trend_structure",
                "spy_price", "spy_sma50"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "SECTOR_OUTPERFORMING_STRONG": {
                            "condition": (
                                "sector_price > sector_sma50 AND sector_price > sector_sma200 "
                                "AND sector_vs_spy_ratio > 1.05 AND sector_trend_structure == 'UP'"
                            ),
                            "raw_signal": "STRONG_BULLISH",
                            "score_range": [7, 9],
                            "notes": "Sector strongly outperforming with strong uptrend."
                        },
                        "SECTOR_OUTPERFORMING_MILD": {
                            "condition": (
                                "sector_price > sector_sma50 "
                                "AND sector_vs_spy_ratio > 1.02"
                            ),
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [3, 5],
                            "notes": "Sector outperforming but trend not as strong."
                        },
                        "SECTOR_NEUTRAL": {
                            "condition": (
                                "(sector_vs_spy_ratio >= 0.98 AND sector_vs_spy_ratio <= 1.02) OR "
                                "(sector_price > sector_sma50 AND sector_price < sector_sma200)"
                            ),
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Sector performing in line with market."
                        },
                        "SECTOR_UNDERPERFORMING_MILD": {
                            "condition": (
                                "sector_price < sector_sma50 "
                                "OR sector_vs_spy_ratio < 0.98"
                            ),
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-3, -5],
                            "notes": "Sector underperforming vs market."
                        },
                        "SECTOR_UNDERPERFORMING_STRONG": {
                            "condition": (
                                "sector_price < sector_sma50 AND sector_price < sector_sma200 "
                                "AND sector_vs_spy_ratio < 0.95 AND sector_trend_structure == 'DOWN'"
                            ),
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-7, -9],
                            "notes": "Sector strongly underperforming with strong downtrend."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "SECTOR_ACCELERATING_UP": {
                            "condition": (
                                "sector_trend_structure == 'UP' "
                                "AND sector_vs_spy_ratio > 1.01"
                            ),
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 4],
                            "notes": "Sector accelerating intraday vs SPY."
                        },
                        "SECTOR_DECELERATING_DOWN": {
                            "condition": (
                                "sector_trend_structure == 'DOWN' "
                                "OR sector_vs_spy_ratio < 0.99"
                            ),
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -4],
                            "notes": "Sector decelerating intraday vs SPY."
                        }
                    },
                    "context_rules": []
                }
            }
        },
        "RELATIVE_STRENGTH": {
            "description": "Relative strength of sector vs SPY and other sectors.",
            "base_weight": 1.2,
            # Refresh rules - when to recalculate Relative Strength
            "refresh_on": [
                "Daily close comparison between sector ETF and SPY/QQQ",
                "Intraday RS spike above defined sensitivity threshold",
                "Sector underperformance or outperformance streak (3+ days)",
                "RS flipping from positive → negative or vice versa"
            ],
            "inputs_expected": [
                "sector_relative_strength_5d", "sector_relative_strength_20d",
                "sector_rank_vs_all_sectors", "sector_rsi"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "RELATIVE_STRENGTH_VERY_STRONG": {
                            "condition": (
                                "sector_relative_strength_5d > 0.05 AND "
                                "sector_relative_strength_20d > 0.03 AND "
                                "sector_rank_vs_all_sectors <= 3"
                            ),
                            "raw_signal": "STRONG_BULLISH",
                            "score_range": [6, 8],
                            "notes": "Sector is top performer - very strong relative strength."
                        },
                        "RELATIVE_STRENGTH_STRONG": {
                            "condition": (
                                "sector_relative_strength_5d > 0.02 AND "
                                "sector_rank_vs_all_sectors <= 5"
                            ),
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [3, 5],
                            "notes": "Sector showing good relative strength."
                        },
                        "RELATIVE_STRENGTH_NEUTRAL": {
                            "condition": (
                                "-0.02 <= sector_relative_strength_5d <= 0.02 AND "
                                "5 < sector_rank_vs_all_sectors <= 6"
                            ),
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Average relative strength."
                        },
                        "RELATIVE_STRENGTH_WEAK": {
                            "condition": (
                                "sector_relative_strength_5d < -0.02 OR "
                                "sector_rank_vs_all_sectors >= 7"
                            ),
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-3, -5],
                            "notes": "Sector showing weak relative strength."
                        },
                        "RELATIVE_STRENGTH_VERY_WEAK": {
                            "condition": (
                                "sector_relative_strength_5d < -0.05 AND "
                                "sector_relative_strength_20d < -0.03 AND "
                                "sector_rank_vs_all_sectors >= 8"
                            ),
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-6, -8],
                            "notes": "Sector is weakest performer - avoid."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "RS_IMPROVING": {
                            "condition": "sector_relative_strength_5d > 0.01",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 3],
                            "notes": "Relative strength improving intraday."
                        },
                        "RS_DETERIORATING": {
                            "condition": "sector_relative_strength_5d < -0.01",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -3],
                            "notes": "Relative strength deteriorating intraday."
                        }
                    },
                    "context_rules": []
                }
            }
        },
        "SECTOR_MOMENTUM": {
            "description": "Momentum indicators for the sector (RSI, MACD, rate of change).",
            "base_weight": 1.1,
            # Refresh rules - when to recalculate Sector Momentum
            "refresh_on": [
                "Daily candle close",
                "Volume thrust event inside sector ETF",
                "Acceleration of momentum above momentum_sensitivity parameter",
                "Sector-wide price expansion event"
            ],
            "inputs_expected": [
                "sector_rsi", "sector_macd_histogram",
                "sector_roc_5d", "sector_roc_20d"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "MOMENTUM_VERY_STRONG": {
                            "condition": (
                                "sector_rsi > 70 AND sector_rsi < 80 AND "
                                "sector_macd_histogram > 0 AND sector_roc_5d > 0.05"
                            ),
                            "raw_signal": "STRONG_BULLISH",
                            "score_range": [6, 8],
                            "notes": "Very strong momentum - sector is hot."
                        },
                        "MOMENTUM_STRONG": {
                            "condition": (
                                "60 <= sector_rsi <= 70 AND sector_macd_histogram > 0"
                            ),
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [3, 5],
                            "notes": "Good momentum."
                        },
                        "MOMENTUM_NEUTRAL": {
                            "condition": (
                                "40 <= sector_rsi <= 60 AND "
                                "-0.02 <= sector_roc_5d <= 0.02"
                            ),
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Neutral momentum."
                        },
                        "MOMENTUM_WEAK": {
                            "condition": (
                                "30 <= sector_rsi < 40 OR sector_macd_histogram < 0"
                            ),
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-3, -5],
                            "notes": "Weak momentum."
                        },
                        "MOMENTUM_VERY_WEAK": {
                            "condition": (
                                "sector_rsi < 30 AND sector_macd_histogram < 0 "
                                "AND sector_roc_5d < -0.05"
                            ),
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-6, -8],
                            "notes": "Very weak momentum - oversold but avoid."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "MOMENTUM_ACCELERATING": {
                            "condition": "sector_roc_5d > 0.02 AND sector_macd_histogram > 0",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 3],
                            "notes": "Momentum accelerating intraday."
                        },
                        "MOMENTUM_DECELERATING": {
                            "condition": "sector_roc_5d < -0.02 OR sector_macd_histogram < 0",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -3],
                            "notes": "Momentum decelerating intraday."
                        }
                    },
                    "context_rules": []
                }
            }
        },
        "SECTOR_VOLATILITY": {
            "description": "Volatility regime of the sector (ATR, volatility vs normal).",
            "base_weight": 0.9,
            # Refresh rules - when to recalculate Sector Volatility
            "refresh_on": [
                "Daily ATR recalculation for sector ETF",
                "Intraday volatility spike > volatility_threshold",
                "Regime shift from low vol → high vol or the opposite",
                "Breakout/breakdown of volatility bands"
            ],
            "inputs_expected": [
                "sector_atr", "sector_atr_sma20",
                "sector_volatility_ratio", "sector_bb_width"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "LOW_VOL_STABLE": {
                            "condition": (
                                "sector_atr < sector_atr_sma20 * 0.8 AND "
                                "sector_volatility_ratio < 1.0"
                            ),
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 3],
                            "notes": "Low volatility - stable trend continuation likely."
                        },
                        "NORMAL_VOL": {
                            "condition": (
                                "0.8 <= sector_atr / sector_atr_sma20 <= 1.2"
                            ),
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "Normal volatility."
                        },
                        "HIGH_VOL_UNSTABLE": {
                            "condition": (
                                "sector_atr > sector_atr_sma20 * 1.5 OR "
                                "sector_volatility_ratio > 1.5"
                            ),
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-3, -5],
                            "notes": "High volatility - unstable, avoid new positions."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "VOL_EXPANDING": {
                            "condition": "sector_atr > sector_atr_sma20 * 1.2",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -3],
                            "notes": "Volatility expanding intraday - caution."
                        },
                        "VOL_COMPRESSING": {
                            "condition": "sector_atr < sector_atr_sma20 * 0.9",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [1, 2],
                            "notes": "Volatility compressing - potential breakout setup."
                        }
                    },
                    "context_rules": []
                }
            }
        },
        "SECTOR_ROTATION": {
            "description": "Sector rotation patterns (money flowing in/out of sectors).",
            "base_weight": 1.0,
            # Refresh rules - when to recalculate Sector Rotation
            "refresh_on": [
                "Fund flow event indicating rotation into/out of sector",
                "Cross-sector comparison shifting sector from laggard to leader",
                "ETF inflow/outflow > volume_threshold",
                "Macro catalyst signaling sector capital reallocation (rates, commodities, policy changes)"
            ],
            "inputs_expected": [
                "sector_volume_ratio", "sector_fund_flows",
                "sector_correlation_vs_spy", "sector_lead_lag"
            ],
            "timeframes": {
                "DAILY": {
                    "states": {
                        "ROTATION_INTO_SECTOR": {
                            "condition": (
                                "sector_volume_ratio > 1.2 AND "
                                "sector_fund_flows > 0"
                            ),
                            "raw_signal": "STRONG_BULLISH",
                            "score_range": [6, 8],
                            "notes": "Money rotating INTO sector - very bullish."
                        },
                        "ROTATION_OUT_OF_SECTOR": {
                            "condition": (
                                "sector_volume_ratio < 0.8 AND "
                                "sector_fund_flows < 0"
                            ),
                            "raw_signal": "STRONG_BEARISH",
                            "score_range": [-6, -8],
                            "notes": "Money rotating OUT of sector - very bearish."
                        },
                        "NO_ROTATION": {
                            "condition": (
                                "0.9 <= sector_volume_ratio <= 1.1"
                            ),
                            "raw_signal": "NEUTRAL",
                            "score_range": [-1, 1],
                            "notes": "No significant rotation."
                        }
                    },
                    "context_rules": []
                },
                "INTRADAY": {
                    "states": {
                        "INTRADAY_ROTATION_IN": {
                            "condition": "sector_volume_ratio > 1.1",
                            "raw_signal": "MILD_BULLISH",
                            "score_range": [2, 3],
                            "notes": "Increased volume intraday - rotation in."
                        },
                        "INTRADAY_ROTATION_OUT": {
                            "condition": "sector_volume_ratio < 0.9",
                            "raw_signal": "MILD_BEARISH",
                            "score_range": [-2, -3],
                            "notes": "Decreased volume intraday - rotation out."
                        }
                    },
                    "context_rules": []
                }
            }
        }
    }
}

