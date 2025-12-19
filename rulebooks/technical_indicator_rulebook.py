# rulebooks/technical_indicator_rulebook.py

"""

TECHNICAL INDICATOR RULEBOOK



This file defines scoring rules for technical indicators.

It is completely separate from the news rulebooks and belongs to a different scoring category.

"""



from __future__ import annotations

from typing import Dict, Any, List, Literal



# ============================================

# TECHNICAL INDICATOR RULEBOOK

# ============================================



TECHNICAL_INDICATOR_RULEBOOK: Dict[str, Any] = {

    "meta": {

        "score_scale": {"min": -10, "max": 10},

        "signal_levels": {

            "STRONG_BULLISH": [6, 10],

            "MILD_BULLISH": [2, 5],

            "NEUTRAL": [-1, 1],

            "MILD_BEARISH": [-5, -2],

            "STRONG_BEARISH": [-10, -6],

        },

        # Weights per indicator group

        "groups": {

            "MOMENTUM": {"base_weight": 1.0},

            "TREND": {"base_weight": 1.0},

            "VOLUME": {"base_weight": 1.1},

            "VOLATILITY": {"base_weight": 0.8},

            "PRICE_ACTION": {"base_weight": 1.2},

        },
        
        "master_scoring_weight": 0.26,  # Weight in Master Scoring System (w_technical from scoring_system.py)
        
        # Refresh rules note:
        # The Technical Indicators department must recompute its department score
        # whenever any contained indicator triggers a refresh event.
        # Each indicator has its own refresh_on conditions defined below.

    },

    "indicators": {

        # =========================

        # MOMENTUM: RSI

        # =========================

        "RSI": {

            "group": "MOMENTUM",

            "weight": 1.0,  # Indicator weight within MOMENTUM group (canonical specification)
            
            "base_impact": 6,  # Legacy field for backward compatibility
            
            # Refresh rules - when to recalculate RSI
            "refresh_on": [
                "Close price change beyond micro-threshold",
                "Candle close on any timeframe",
                "Momentum shift event (ex: oversold → neutral, neutral → overbought)",
                "Intrabar only if delta > defined RSI sensitivity"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {

                        "EXTREME_OVERBOUGHT_80PLUS": {

                            "condition": "rsi >= 80",

                            "raw_signal": "STRONG_BEARISH",

                            "score_range": [-9, -7],

                            "notes": "Extreme overbought mean-reversion zone"

                        },

                        "OVERBOUGHT_70_80": {

                            "condition": "70 <= rsi < 80",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3]

                        },

                        "UPPER_RANGE_60_70": {

                            "condition": "60 <= rsi < 70",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [2, 4]

                        },

                        "NEUTRAL_40_60": {

                            "condition": "40 <= rsi < 60",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-1, 1]

                        },

                        "LOWER_RANGE_30_40": {

                            "condition": "30 <= rsi < 40",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-3, -1]

                        },

                        "OVERSOLD_20_30": {

                            "condition": "20 <= rsi < 30",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [2, 4]

                        },

                        "EXTREME_OVERSOLD_20MINUS": {

                            "condition": "rsi < 20",

                            "raw_signal": "STRONG_BULLISH",

                            "score_range": [7, 9]

                        }

                    },

                    "context_rules": []

                },

                "MAJOR": {

                    "states": {

                        "DAILY_OVERBOUGHT_75_85": {

                            "condition": "75 <= rsi < 85",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3]

                        },

                        "DAILY_NEUTRAL_45_60": {

                            "condition": "45 <= rsi < 60",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-1, 1]

                        },

                        "DAILY_OVERSOLD_20_30": {

                            "condition": "20 <= rsi < 30",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5]

                        }

                    },

                    "context_rules": []

                }

            }

        },

        # =========================

        # MOMENTUM: MACD

        # =========================

        "MACD": {

            "group": "MOMENTUM",

            "weight": 1.2,  # Indicator weight within MOMENTUM group (canonical specification)
            
            "base_impact": 7,  # Legacy field for backward compatibility
            
            # Refresh rules - when to recalculate MACD
            "refresh_on": [
                "Candle close (standard recalculation event)",
                "MACD line / Signal line cross",
                "Histogram polarity change",
                "Intrabar MACD shift > threshold (optional)"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {

                        "BULLISH_CROSS": {

                            "condition": "macd crosses above signal",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5]

                        },

                        "BEARISH_CROSS": {

                            "condition": "macd crosses below signal",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3]

                        }

                    },

                    "context_rules": []

                },

                "MAJOR": {

                    "states": {

                        "DAILY_BULLISH_TREND": {

                            "condition": "macd > 0",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5]

                        },

                        "DAILY_BEARISH_TREND": {

                            "condition": "macd < 0",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3]

                        }

                    },

                    "context_rules": []

                }

            }

        },

        # =========================

        # TREND: MOVING AVERAGES

        # =========================

        "MOVING_AVERAGE_ALIGNMENT": {

            "group": "TREND",

            "weight": 1.0,  # Indicator weight within TREND group (canonical specification)
            
            "base_impact": 7,  # Legacy field for backward compatibility
            
            # Refresh rules - when to recalculate Moving Averages
            "refresh_on": [
                "Candle close",
                "Price crossing above/below SMA (trigger if crossing is confirmed)",
                "Significant intrabar price movement > MA sensitivity threshold"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {

                        "BULLISH_ALIGNMENT": {

                            "condition": "price > sma9 > sma20 > sma50",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5]

                        },

                        "BEARISH_ALIGNMENT": {

                            "condition": "price < sma9 < sma20 < sma50",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3]

                        }

                    }

                },

                "MAJOR": {

                    "states": {

                        "DAILY_UPTREND": {

                            "condition": "price > sma50",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5]

                        },

                        "DAILY_DOWNTREND": {

                            "condition": "price < sma50",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3]

                        }

                    }

                }

            }

        },

        # =========================

        # VOLUME: VWAP / VOLUME

        # =========================

        "VWAP_DISTANCE": {

            "group": "VOLUME",

            "weight": 1.1,  # Indicator weight within VOLUME group (canonical specification)
            
            "base_impact": 9,  # Legacy field for backward compatibility
            
            # Refresh rules - when to recalculate VWAP
            "refresh_on": [
                "Every tick update (VWAP is tick-driven)",
                "Volume spike > volume_surge_threshold",
                "Large block transaction detected"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {

                        "PRICE_ABOVE_VWAP": {

                            "condition": "price > vwap",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5]

                        },

                        "PRICE_BELOW_VWAP": {

                            "condition": "price < vwap",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3]

                        }

                    }

                }

            }

        },

        "VOLUME_SURGE": {

            "group": "VOLUME",

            "weight": 1.0,  # Indicator weight within VOLUME group (canonical specification)
            
            "base_impact": 8,  # Legacy field for backward compatibility
            
            # Refresh rules - when to recalculate Volume Surge
            "refresh_on": [
                "Every new tick",
                "Volume > rolling average * surge_multiplier",
                "Candle close"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {

                        "VOLUME_SURGE": {

                            "condition": "volume >= 2 * avg_volume",

                            "raw_signal": "STRONG_CONFIRMATION",

                            "score_range": [6, 9]

                        }

                    }

                }

            }

        },

        # =========================

        # VOLATILITY: ATR / Bollinger

        # =========================

        "ATR": {

            "group": "VOLATILITY",

            "weight": 0.8,  # Indicator weight within VOLATILITY group (canonical specification)
            
            "base_impact": 4,  # Legacy field for backward compatibility
            
            # Refresh rules - when to recalculate ATR
            "refresh_on": [
                "Candle close",
                "Intrabar range expansion > ATR sensitivity threshold"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {

                        "HIGH_VOL": {

                            "condition": "atr high",

                            "raw_signal": "HIGH_VOLATILITY",

                            "score_range": [-2, 2]

                        }

                    }

                }

            }

        },

        "BOLLINGER_POSITION": {

            "group": "VOLATILITY",

            "weight": 1.0,  # Indicator weight within VOLATILITY group (canonical specification)
            
            "base_impact": 6,  # Legacy field for backward compatibility

            "description": "Distance from Bollinger bands, squeeze breakout",
            
            # Refresh rules - when to recalculate Bollinger Bands
            "refresh_on": [
                "Candle close",
                "Volatility expansion event (sigma shift event)",
                "Price breakout above/below band"
            ],

            "timeframes": {

                "MINOR": {

                    "states": {

                        "UPPER_BAND_TOUCH": {

                            "condition": "close > upper_band",

                            "raw_signal": "MEAN_REVERSION_SELL",

                            "score_range": [-5, -3]

                        },

                        "LOWER_BAND_TOUCH": {

                            "condition": "close < lower_band",

                            "raw_signal": "MEAN_REVERSION_BUY",

                            "score_range": [3, 5]

                        }

                    }

                }

            }

        },

        # =========================
        # PRICE ACTION GROUP
        # =========================
        # Note: Price Action indicators (STRUCTURE, REVERSAL, CONTINUATION, LEVEL_REACTION, GAPS, CANDLES)
        # are defined in price_action_rulebook.py and should be imported/integrated.
        # According to canonical specification:
        # - STRUCTURE: weight 1.0, refresh_on: ["Candle close", "Formation of new swing high/swing low", "Break of previous structure point"]
        # - REVERSAL: weight 1.2, refresh_on: ["Candle close (confirmation required)", "Neckline break", "Pattern invalidation on intrabar wick"]
        # - CONTINUATION: weight 0.9, refresh_on: ["Candle close", "Breakout above/below pattern boundary", "Volume confirmation event"]
        # - LEVEL_REACTION: weight 1.1, refresh_on: ["Candle close", "Support/resistance touch with volume confirmation", "Rejection wick event"]
        # - GAPS: weight 1.0, refresh_on: ["Market open", "Gap fill event", "Gap continuation pattern formation"]
        # - CANDLES: weight 0.8, refresh_on: ["Candle close (mandatory)", "Pattern confirmation (engulfing/hammers/etc.)"]
        # Total PRICE_ACTION weight sum = 6.0
        # PRICE_ACTION group base_weight = 1.2 (23.5% of Technical Indicators)

    }

}



# Export for use by Master Scoring System

__all__ = ["TECHNICAL_INDICATOR_RULEBOOK"]

