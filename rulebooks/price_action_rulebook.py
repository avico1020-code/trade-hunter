# rulebooks/price_action_rulebook.py

"""

PRICE_ACTION_RULEBOOK



מחלקת Price Action / Patterns:

- תבניות מבנה שוק (HH/HL, LH/LL, Range וכו')

- תבניות היפוך (Double Top/Bottom, Head & Shoulders וכו')

- תבניות המשך (Flags, Triangles, Pennants)

- תגובה לרמות מפתח (Support/Resistance break / bounce / fail)

- גאפים (Gap Up/Down – המשך / היפוך)

- תבניות נרות (Engulfing, Hammer, Shooting Star וכו')



שימוש:

- המחלקה לא מחשבת את התבניות בפועל.

- היא רק מגדירה איך לתרגם "מצב תבנית" → ניקוד בין -10 ל +10.

- הקוד שמנתח את הגרף (Pattern Detector) יזהה state ויעביר אותו למערכת הסקורינג.

"""



from __future__ import annotations

from typing import Dict, Any, List, Literal



# ============================================

# PRICE ACTION RULEBOOK

# ============================================



PRICE_ACTION_RULEBOOK: Dict[str, Any] = {

    "meta": {

        "score_scale": {

            "min": -10,

            "max": 10

        },

        "signal_levels": {

            "STRONG_BULLISH": [6, 10],

            "MILD_BULLISH": [2, 5],

            "NEUTRAL": [-1, 1],

            "MILD_BEARISH": [-5, -2],

            "STRONG_BEARISH": [-10, -6]

        },

        # קבוצות פנימיות בתוך מחלקת ה-Price Action (להמשך שימוש במאסטר סקורינג אם תרצה)

        "groups": {

            "STRUCTURE": {"base_weight": 1.0},       # HH/HL, LH/LL, Range

            "REVERSAL": {"base_weight": 1.1},        # Double Top/Bottom, H&S וכו'

            "CONTINUATION": {"base_weight": 1.0},    # Flags, Triangles וכו'

            "LEVEL_REACTION": {"base_weight": 1.1},  # תגובה לרמות תמיכה/התנגדות

            "GAPS": {"base_weight": 0.9},            # Gap Up/Down תבניות

            "CANDLES": {"base_weight": 0.9}          # תבניות נרות יחידות

        },
        
        # Note: Price Action is part of Technical Indicators component in Master Scoring
        # It uses the technical weight (0.26) as a group within Technical Indicators

    },

    "patterns": {

        # =========================

        # 1) STRUCTURE – HH/HL, LH/LL, RANGE

        # =========================

        "STRUCTURE": {

            "group": "STRUCTURE",

            "base_impact": 7,

            "timeframes": {

                "MINOR": {  # 1m / 5m – אינטרדיי

                    "states": {

                        "INTRADAY_STRONG_UPTREND": {

                            "condition": "structure == 'HH_HL' AND swings_count >= 3",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 6],

                            "direction_hint": "LONG",

                            "notes": "רצף ברור של Higher Highs + Higher Lows באינטרדיי – מגמה עולה בריאה."

                        },

                        "INTRADAY_WEAK_UPTREND": {

                            "condition": "structure == 'HH_HL' AND swings_count == 2",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [2, 4],

                            "direction_hint": "LONG",

                            "notes": "תחילת מגמה עולה, אבל עדיין צעירה – פחות ודאות."

                        },

                        "INTRADAY_STRONG_DOWNTREND": {

                            "condition": "structure == 'LH_LL' AND swings_count >= 3",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-6, -4],

                            "direction_hint": "SHORT",

                            "notes": "רצף Lower Highs + Lower Lows – מגמת ירידה ברורה."

                        },

                        "INTRADAY_WEAK_DOWNTREND": {

                            "condition": "structure == 'LH_LL' AND swings_count == 2",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-4, -2],

                            "direction_hint": "SHORT",

                            "notes": "תחילת מגמת ירידה אך עדיין מוקדם."

                        },

                        "INTRADAY_SIDEWAYS_RANGE_TIGHT": {

                            "condition": "range_type == 'SIDEWAYS' AND range_height <= 0.5 * intraday_ATR",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-1, 1],

                            "direction_hint": "BOTH",

                            "notes": "טווח צדדי צפוף – עדיף להימנע ממרכז הטווח, מתאים למסחר בקצוות."

                        },

                        "INTRADAY_SIDEWAYS_RANGE_WIDE": {

                            "condition": "range_type == 'SIDEWAYS' AND range_height > 0.5 * intraday_ATR",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-2, 2],

                            "direction_hint": "BOTH",

                            "notes": "טווח רחב – יכול לתת כניסות טובות מקצוות, אבל פחות טרנדי."

                        }

                    },

                    "context_rules": []

                },

                "MAJOR": {  # DAILY – בייס לטווח גדול יותר

                    "states": {

                        "DAILY_UPTREND_STRUCTURE_STRONG": {

                            "condition": "daily_structure == 'HH_HL' AND swings_count >= 4",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 6],

                            "direction_hint": "LONG",

                            "notes": "מגמת עלייה ברורה על הדיילי – בייס חיובי לסווינג / אינטרדיי עם המגמה."

                        },

                        "DAILY_UPTREND_STRUCTURE_MILD": {

                            "condition": "daily_structure == 'HH_HL' AND swings_count == 2 or 3",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [2, 4],

                            "direction_hint": "LONG",

                            "notes": "מגמה עולה צעירה יותר בדיילי."

                        },

                        "DAILY_DOWNTREND_STRUCTURE_STRONG": {

                            "condition": "daily_structure == 'LH_LL' AND swings_count >= 4",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-6, -4],

                            "direction_hint": "SHORT",

                            "notes": "מגמת ירידה ברורה בדיילי – בייס שלילי."

                        },

                        "DAILY_DOWNTREND_STRUCTURE_MILD": {

                            "condition": "daily_structure == 'LH_LL' AND swings_count == 2 or 3",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-4, -2],

                            "direction_hint": "SHORT",

                            "notes": "תחילת מגמת ירידה בדיילי."

                        },

                        "DAILY_LARGE_RANGE_CONSOLIDATION": {

                            "condition": "daily_range_type == 'SIDEWAYS' AND range_height >= 1.5 * daily_ATR",

                            "raw_signal": "NEUTRAL",

                            "score_range": [-2, 2],

                            "direction_hint": "BOTH",

                            "notes": "קונסולידציה רחבה על הדיילי – סביבת ברייקאוט עתידי."

                        }

                    },

                    "context_rules": []

                }

            }

        },

        # =========================

        # 2) REVERSAL PATTERNS – DOUBLE TOP/BOTTOM, H&S

        # =========================

        "REVERSAL": {

            "group": "REVERSAL",

            "base_impact": 9,

            "timeframes": {

                "MINOR": {

                    "states": {

                        "DOUBLE_TOP_CONFIRMED": {

                            "condition": "pattern == 'DOUBLE_TOP' AND neckline_broken == True AND volume_confirmed == True",

                            "raw_signal": "STRONG_BEARISH",

                            "score_range": [-9, -7],

                            "direction_hint": "SHORT",

                            "notes": "דאבל טופ מאושר – שיא כפול + שבירת נקודת הצוואר + ווליום תומך."

                        },

                        "DOUBLE_TOP_UNCONFIRMED": {

                            "condition": "pattern == 'DOUBLE_TOP' AND neckline_broken == False",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-4, -2],

                            "direction_hint": "SHORT",

                            "notes": "שני שיאים דומים, אבל ללא שבירת נקודת צוואר – פוטנציאל, אך לא אישור."

                        },

                        "DOUBLE_BOTTOM_CONFIRMED": {

                            "condition": "pattern == 'DOUBLE_BOTTOM' AND neckline_broken == True AND volume_confirmed == True",

                            "raw_signal": "STRONG_BULLISH",

                            "score_range": [7, 9],

                            "direction_hint": "LONG",

                            "notes": "דאבל בוטום מאושר – תבנית היפוך קלאסית."

                        },

                        "DOUBLE_BOTTOM_UNCONFIRMED": {

                            "condition": "pattern == 'DOUBLE_BOTTOM' AND neckline_broken == False",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [2, 4],

                            "direction_hint": "LONG",

                            "notes": "שני שפלים דומים – פוטנציאל היפוך, אך עדיין לא בטוח."

                        },

                        "HEAD_AND_SHOULDERS_CONFIRMED": {

                            "condition": "pattern == 'HEAD_AND_SHOULDERS' AND neckline_broken == True AND volume_confirmed == True",

                            "raw_signal": "STRONG_BEARISH",

                            "score_range": [-9, -7],

                            "direction_hint": "SHORT",

                            "notes": "ראש וכתפיים מאושר – היפוך חזק מטווח בינוני."

                        },

                        "HEAD_AND_SHOULDERS_INVERSE_CONFIRMED": {

                            "condition": "pattern == 'INVERSE_HEAD_AND_SHOULDERS' AND neckline_broken == True AND volume_confirmed == True",

                            "raw_signal": "STRONG_BULLISH",

                            "score_range": [7, 9],

                            "direction_hint": "LONG",

                            "notes": "ראש וכתפיים הפוך – היפוך שורי חזק."

                        },

                        "V_REVERSAL_SHARP": {

                            "condition": "pattern == 'V_REVERSAL' AND swing_depth >= 2 * intraday_ATR",

                            "raw_signal": "STRONG_REVERSAL",

                            "score_range": [-7, 7],

                            "direction_hint": "BOTH",

                            "notes": "היפוך חד בצורת V, אחרי מהלך קיצוני – תנועה אלימה לשני הכיוונים, תלוי בהקשר."

                        }

                    },

                    "context_rules": []

                },

                "MAJOR": {

                    "states": {

                        "DAILY_DOUBLE_TOP_CONFIRMED": {

                            "condition": "daily_pattern == 'DOUBLE_TOP' AND neckline_broken == True",

                            "raw_signal": "STRONG_BEARISH",

                            "score_range": [-9, -7],

                            "direction_hint": "SHORT",

                            "notes": "דאבל טופ על הדיילי – איתות חזק לירידות בטווח גדול."

                        },

                        "DAILY_DOUBLE_BOTTOM_CONFIRMED": {

                            "condition": "daily_pattern == 'DOUBLE_BOTTOM' AND neckline_broken == True",

                            "raw_signal": "STRONG_BULLISH",

                            "score_range": [7, 9],

                            "direction_hint": "LONG",

                            "notes": "דאבל בוטום על הדיילי – איתות לעליות בטווח גדול."

                        },

                        "DAILY_HEAD_AND_SHOULDERS_CONFIRMED": {

                            "condition": "daily_pattern == 'HEAD_AND_SHOULDERS' AND neckline_broken == True",

                            "raw_signal": "STRONG_BEARISH",

                            "score_range": [-9, -7],

                            "direction_hint": "SHORT",

                            "notes": "ראש וכתפיים בדיילי – היפוך חזק לאחר מגמת עלייה."

                        },

                        "DAILY_INVERSE_HEAD_AND_SHOULDERS_CONFIRMED": {

                            "condition": "daily_pattern == 'INVERSE_HEAD_AND_SHOULDERS' AND neckline_broken == True",

                            "raw_signal": "STRONG_BULLISH",

                            "score_range": [7, 9],

                            "direction_hint": "LONG",

                            "notes": "ראש וכתפיים הפוך בדיילי – היפוך משוק דובי לשוק שורי."

                        }

                    },

                    "context_rules": []

                }

            }

        },

        # =========================

        # 3) CONTINUATION PATTERNS – FLAGS, TRIANGLES, RANGES

        # =========================

        "CONTINUATION": {

            "group": "CONTINUATION",

            "base_impact": 7,

            "timeframes": {

                "MINOR": {

                    "states": {

                        "BULL_FLAG_CONFIRMED": {

                            "condition": "pattern == 'BULL_FLAG' AND breakout_direction == 'UP' AND volume_breakout >= 1.5 * avg_volume",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 6],

                            "direction_hint": "LONG",

                            "notes": "Bull Flag קלאסי – דגל אחרי מהלך עליות + פריצה עם ווליום."

                        },

                        "BEAR_FLAG_CONFIRMED": {

                            "condition": "pattern == 'BEAR_FLAG' AND breakout_direction == 'DOWN' AND volume_breakout >= 1.5 * avg_volume",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-6, -4],

                            "direction_hint": "SHORT",

                            "notes": "Bear Flag – המשך מגמת ירידה."

                        },

                        "ASCENDING_TRIANGLE_UPBREAK": {

                            "condition": "pattern == 'ASCENDING_TRIANGLE' AND breakout_direction == 'UP'",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5],

                            "direction_hint": "LONG",

                            "notes": "משולש עולה עם פריצה למעלה – המשך מגמה שורית."

                        },

                        "DESCENDING_TRIANGLE_DOWNBREAK": {

                            "condition": "pattern == 'DESCENDING_TRIANGLE' AND breakout_direction == 'DOWN'",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3],

                            "direction_hint": "SHORT",

                            "notes": "משולש יורד עם פריצה למטה – המשך מגמת ירידה."

                        },

                        "SYMMETRICAL_TRIANGLE_BREAKOUT": {

                            "condition": "pattern == 'SYMMETRICAL_TRIANGLE' AND breakout_direction in ['UP','DOWN']",

                            "raw_signal": "BREAKOUT",

                            "score_range": [-4, 4],

                            "direction_hint": "BOTH",

                            "notes": "פריצה מטווח דחוס – כיוון נקבע לפי כיוון הפריצה."

                        }

                    },

                    "context_rules": []

                },

                "MAJOR": {

                    "states": {

                        "DAILY_BULL_FLAG": {

                            "condition": "daily_pattern == 'BULL_FLAG' AND breakout_direction == 'UP'",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 6],

                            "direction_hint": "LONG",

                            "notes": "Bull Flag ברזולוציית דיילי – המשכיות מגמה שורית לטווח בינוני."

                        },

                        "DAILY_BEAR_FLAG": {

                            "condition": "daily_pattern == 'BEAR_FLAG' AND breakout_direction == 'DOWN'",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-6, -4],

                            "direction_hint": "SHORT",

                            "notes": "Bear Flag על הדיילי – המשך מגמת ירידה."

                        }

                    },

                    "context_rules": []

                }

            }

        },

        # =========================

        # 4) LEVEL REACTION – SUPPORT / RESISTANCE

        # =========================

        "LEVEL_REACTION": {

            "group": "LEVEL_REACTION",

            "base_impact": 8,

            "timeframes": {

                "MINOR": {

                    "states": {

                        "STRONG_REJECTION_AT_RESISTANCE": {

                            "condition": "price_touched_level == 'RESISTANCE' AND rejection_strong == True AND volume_spike == True",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-6, -4],

                            "direction_hint": "SHORT",

                            "notes": "דחייה חדה מרמת התנגדות, עם ווליום – איתות שורי לשורט."

                        },

                        "STRONG_BOUNCE_AT_SUPPORT": {

                            "condition": "price_touched_level == 'SUPPORT' AND rejection_strong == True AND volume_spike == True",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 6],

                            "direction_hint": "LONG",

                            "notes": "קפיצה חדה מרמת תמיכה משמעותית – איתות לונג."

                        },

                        "BREAK_ABOVE_RESISTANCE_CONFIRMED": {

                            "condition": "level_type == 'RESISTANCE' AND close_above_level == True AND retest_held == True",

                            "raw_signal": "STRONG_BULLISH",

                            "score_range": [7, 9],

                            "direction_hint": "LONG",

                            "notes": "פריצה מעל התנגדות + ריטסט שהחזיק – ברייקאוט חזק."

                        },

                        "BREAK_BELOW_SUPPORT_CONFIRMED": {

                            "condition": "level_type == 'SUPPORT' AND close_below_level == True AND retest_rejected == True",

                            "raw_signal": "STRONG_BEARISH",

                            "score_range": [-9, -7],

                            "direction_hint": "SHORT",

                            "notes": "שבירה של תמיכה + ריטסט כישות התנגדות – ברייקדאון אמיתי."

                        },

                        "FAILED_BREAKOUT_AT_RESISTANCE": {

                            "condition": "level_type == 'RESISTANCE' AND intraday_break_above == True AND close_below_level == True",

                            "raw_signal": "STRONG_BEARISH",

                            "score_range": [-9, -7],

                            "direction_hint": "SHORT",

                            "notes": "פריצת שווא של התנגדות – Bull Trap."

                        },

                        "FAILED_BREAKDOWN_AT_SUPPORT": {

                            "condition": "level_type == 'SUPPORT' AND intraday_break_below == True AND close_above_level == True",

                            "raw_signal": "STRONG_BULLISH",

                            "score_range": [7, 9],

                            "direction_hint": "LONG",

                            "notes": "שבירת שווא של תמיכה – Bear Trap."

                        }

                    },

                    "context_rules": []

                },

                "MAJOR": {

                    "states": {

                        "DAILY_MAJOR_SUPPORT_HOLD": {

                            "condition": "daily_level_type == 'MAJOR_SUPPORT' AND close_above_level == True",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5],

                            "direction_hint": "LONG",

                            "notes": "רמת תמיכה מרכזית בדיילי שמחזיקה – רקע חיובי."

                        },

                        "DAILY_MAJOR_RESISTANCE_REJECT": {

                            "condition": "daily_level_type == 'MAJOR_RESISTANCE' AND close_below_level == True",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3],

                            "direction_hint": "SHORT",

                            "notes": "דחייה מרמת התנגדות מרכזית בדיילי."

                        }

                    },

                    "context_rules": []

                }

            }

        },

        # =========================

        # 5) GAPS – Gap Up / Gap Down

        # =========================

        "GAPS": {

            "group": "GAPS",

            "base_impact": 7,

            "timeframes": {

                "MINOR": {

                    "states": {

                        "GAP_UP_WITH_FOLLOW_THROUGH": {

                            "condition": "gap_type == 'UP' AND price_stays_above_gap_mid == True AND intraday_trend == 'UP'",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 6],

                            "direction_hint": "LONG",

                            "notes": "Gap Up שמחזיק – המשך מגמה שורית בדרך כלל."

                        },

                        "GAP_UP_FILLED_AND_REJECTED": {

                            "condition": "gap_type == 'UP' AND gap_filled == True AND price_rejected_from_gap_top == True",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-6, -4],

                            "direction_hint": "SHORT",

                            "notes": "Exhaustion Gap – שיא מקומי, נטייה להיפוך מטה."

                        },

                        "GAP_DOWN_WITH_FOLLOW_THROUGH": {

                            "condition": "gap_type == 'DOWN' AND price_stays_below_gap_mid == True AND intraday_trend == 'DOWN'",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-6, -4],

                            "direction_hint": "SHORT",

                            "notes": "Gap Down שממשיך – איתות דובי."

                        },

                        "GAP_DOWN_FILLED_AND_RECLAIMED": {

                            "condition": "gap_type == 'DOWN' AND gap_filled == True AND price_close_above_gap_top == True",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 6],

                            "direction_hint": "LONG",

                            "notes": "Short-covering / Reversal אחרי Gap Down."

                        }

                    },

                    "context_rules": []

                },

                "MAJOR": {

                    "states": {

                        "DAILY_BREAKAWAY_GAP_UP": {

                            "condition": "daily_gap_type == 'UP' AND gap_originates_from_base == True",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 7],

                            "direction_hint": "LONG",

                            "notes": "Breakaway Gap למעלה אחרי דשדוש – תחילת מגמה שורית חזקה."

                        },

                        "DAILY_BREAKAWAY_GAP_DOWN": {

                            "condition": "daily_gap_type == 'DOWN' AND gap_originates_from_top == True",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-7, -4],

                            "direction_hint": "SHORT",

                            "notes": "Breakaway Gap כלפי מטה – שינוי מגמה לדובי."

                        }

                    },

                    "context_rules": []

                }

            }

        },

        # =========================

        # 6) CANDLE PATTERNS – Engulfing, Hammer, Doji, וכו'

        # =========================

        "CANDLES": {

            "group": "CANDLES",

            "base_impact": 6,

            "timeframes": {

                "MINOR": {

                    "states": {

                        "BULLISH_ENGULFING_AT_SUPPORT": {

                            "condition": "candle_pattern == 'BULLISH_ENGULFING' AND near_support == True AND after_downmove == True",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5],

                            "direction_hint": "LONG",

                            "notes": "Bullish Engulfing אחרי ירידות סמוך לתמיכה – איתות שורי טוב."

                        },

                        "BEARISH_ENGULFING_AT_RESISTANCE": {

                            "condition": "candle_pattern == 'BEARISH_ENGULFING' AND near_resistance == True AND after_upmove == True",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3],

                            "direction_hint": "SHORT",

                            "notes": "Bearish Engulfing קרוב להתנגדות – איתות דובי."

                        },

                        "HAMMER_AT_SUPPORT": {

                            "condition": "candle_pattern == 'HAMMER' AND near_support == True AND after_downmove == True",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [3, 5],

                            "direction_hint": "LONG",

                            "notes": "Hammer בתחתית – קונים נכנסים לתמונה."

                        },

                        "SHOOTING_STAR_AT_RESISTANCE": {

                            "condition": "candle_pattern == 'SHOOTING_STAR' AND near_resistance == True AND after_upmove == True",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-5, -3],

                            "direction_hint": "SHORT",

                            "notes": "Shooting Star אחרי מהלך עליות – אפשרות לרברסל."

                        },

                        "DOJI_AFTER_STRONG_MOVE": {

                            "condition": "candle_pattern == 'DOJI' AND strong_trend_before == True",

                            "raw_signal": "INDECISION",

                            "score_range": [-2, 2],

                            "direction_hint": "BOTH",

                            "notes": "Doji אחרי מהלך חזק – אות ראשון להאטה ובלבול."

                        },

                        "MARUBOZU_WITH_VOLUME": {

                            "condition": "candle_pattern == 'MARUBOZU' AND volume_spike == True",

                            "raw_signal": "MOMENTUM_BAR",

                            "score_range": [-6, 6],

                            "direction_hint": "BOTH",

                            "notes": "Marubozu עם ווליום – בר מומנטום, כיוון יקבע לפי שורט/לונג (ירוק/אדום)."

                        }

                    },

                    "context_rules": []

                },

                "MAJOR": {

                    "states": {

                        "DAILY_BULLISH_ENGULFING": {

                            "condition": "daily_candle_pattern == 'BULLISH_ENGULFING' AND after_downtrend == True",

                            "raw_signal": "MILD_BULLISH",

                            "score_range": [4, 6],

                            "direction_hint": "LONG",

                            "notes": "Bullish Engulfing על הדיילי – איתות היפוך סווינג."

                        },

                        "DAILY_BEARISH_ENGULFING": {

                            "condition": "daily_candle_pattern == 'BEARISH_ENGULFING' AND after_uptrend == True",

                            "raw_signal": "MILD_BEARISH",

                            "score_range": [-6, -4],

                            "direction_hint": "SHORT",

                            "notes": "Bearish Engulfing על הדיילי – איתות היפוך כלפי מטה."

                        }

                    },

                    "context_rules": []

                }

            }

        }

    }

}



# Export for use by Master Scoring System

__all__ = ["PRICE_ACTION_RULEBOOK"]

