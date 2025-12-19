# rulebooks/news_micro_rulebook.py

"""

NEWS MICRO RULEBOOK



קובץ זה מגדיר חוקי ניקוד לחדשות ברמת החברה (STOCK_MICRO)

שתלויות ישירות בחברה הספציפית:

- Earnings / Guidance

- Dilution / Buyback

- Management / Legal / Risk

- M&A / Contracts / Product

- Dividend Changes



הקובץ הוא ספר חוקים בלבד (Rulebook):

- אין כאן חישוב בפועל

- אין כאן חיבור ל־IBKR או לזרם חדשות

- המערכת החיצונית תקבל טקסט חדשות + מטא־דאטה ותבצע מיפוי ל־NEWS_TYPE + SURPRISE_LEVEL



טווח ניקוד: -10 עד +10

"""



from __future__ import annotations

from typing import Dict, List, Literal, TypedDict, Optional, Union



ScoreRange = List[int]





class SurpriseScoring(TypedDict, total=False):

    range: ScoreRange

    conditions: List[str]

    notes: str

    # For M&A: can have different scoring for target vs acquirer

    target_company: Optional[Dict[str, "SurpriseScoring"]]

    acquirer_company: Optional[Dict[str, "SurpriseScoring"]]





class BaseImpact(TypedDict, total=False):

    positive_events: int

    negative_events: int





class SectorAdjustment(TypedDict):

    multiplier: float

    notes: Optional[str]





class TimeDecay(TypedDict):

    half_life_minutes: int

    half_life_days: int





class MicroNewsType(TypedDict, total=False):

    scope: Literal["STOCK_MICRO"]

    description: str

    applies_to: Literal["BOTH", "LONG_ONLY", "SHORT_ONLY"]

    base_impact: Union[int, BaseImpact]

    sectors_most_sensitive: Optional[List[str]]

    scoring: Dict[str, SurpriseScoring]

    sector_adjustments: Optional[Dict[str, SectorAdjustment]]

    time_decay: Optional[TimeDecay]





class NewsMicroRulebook(TypedDict):

    meta: Dict[str, object]

    types: Dict[str, MicroNewsType]





NEWS_MICRO_RULEBOOK: NewsMicroRulebook = {

    "meta": {

        "score_scale": {"min": -10, "max": 10},

        "surprise_levels": [

            "HUGE_POSITIVE",

            "MILD_POSITIVE",

            "INLINE",

            "MILD_NEGATIVE",

            "HUGE_NEGATIVE",

        ],

        # ברירת מחדל לדעיכה בזמן – ברמת החברה

        "default_time_decay": {

            "intraday": {"half_life_minutes": 90},  # אחרי ~ שעה וחצי ההשפעה נחלשת משמעותית

            "multi_day": {"half_life_days": 2},  # חדשות חברה חזקות משפיעות כמה ימים

        },

        # הפניה לטבלת הרגישות הסקטוריאלית מה־SECTOR_RULEBOOK

        "sector_sensitivity_ref": "SECTOR_SENSITIVITY_TABLE",

    },

    "types": {

        # =========================

        # 1. EARNINGS / GUIDANCE

        # =========================

        "EARNINGS": {

            "scope": "STOCK_MICRO",  # תלוי חברה ותלוי סקטור

            "description": "Quarterly results: EPS, Revenue vs expectations, plus reaction pattern.",

            "applies_to": "BOTH",

            "base_impact": {"positive_events": 9, "negative_events": 10},

            "sectors_most_sensitive": ["XLK", "XLY", "XLE", "XLF", "XLV", "XLRE", "XLI", "XLB"],

            "scoring": {

                "HUGE_POSITIVE": {

                    "range": [8, 9],

                    "conditions": [

                        "EPS beat AND Revenue beat",

                        "Guidance raised meaningfully",

                        "Strong market reaction with volume confirmation",

                    ],

                    "notes": "Very strong quarter + חיוביות קדימה; ברוב המקרים יוצר טרנד המשכי ולא רק גאפ בודד.",

                },

                "MILD_POSITIVE": {

                    "range": [3, 5],

                    "conditions": ["EPS beat OR Revenue beat", "Guidance inline or slightly up"],

                    "notes": "רבעון טוב אבל לא יוצא דופן; לרוב יוצר מהלך חיובי אבל פחות אלים.",

                },

                "INLINE": {

                    "range": [-1, 1],

                    "conditions": ["EPS + Revenue inline", "No material change in guidance"],

                    "notes": "שוק כבר תימחר חלק גדול מהמידע; האפקט העיקרי מגיע מהפרייס אקשן בזמן הדוח.",

                },

                "MILD_NEGATIVE": {

                    "range": [-3, -5],

                    "conditions": ["Small EPS miss OR Revenue miss", "Slightly lower guidance"],

                    "notes": "אכזבה קלה; לעיתים מתבטאת בירידה עם אופציה לריברסל אם הסיפור הגדול חיובי.",

                },

                "HUGE_NEGATIVE": {

                    "range": [-8, -10],

                    "conditions": [

                        "Big EPS/Revenue miss",

                        "Guidance slashed",

                        "Margin compression / serious demand slowdown",

                    ],

                    "notes": "פגיעה חזקה בתזה; לרוב גורר ראלי ירידות רב־יומי עם ראלי חולשה (dead cat bounces).",

                },

            },

            "sector_adjustments": {

                # מכפילי רגישות – למשל, טֶק מושפע יותר מהפתעה בצמיחה

                "XLK": {"multiplier": 1.2, "notes": "צמיחה/קצב ARR ו־Cloud מאוד קריטיים; Earnings מייצר תזוזות חדות."},

                "XLY": {"multiplier": 1.2, "notes": "תלוי צרכן; רגיש במיוחד ל־guidance ו־consumer demand."},

                "XLV": {"multiplier": 1.1, "notes": "חברות פארמה/ביוטק כבדות – earnings פחות דרמטי מ־FDA / ניסויים קליניים."},

                "XLRE": {"multiplier": 1.1, "notes": "רגיש במיוחד ל־occupancy ול־FFO, במיוחד בתקופות ריבית משתנה."},

            },

            "time_decay": {"intraday": {"half_life_minutes": 120}, "multi_day": {"half_life_days": 3}},

        },

        "GUIDANCE_ONLY": {

            "scope": "STOCK_MICRO",

            "description": "Standalone guidance update without regular earnings report (pre-announcement, profit warning, or guidance raise).",

            "applies_to": "BOTH",

            "base_impact": 8,

            "scoring": {

                "HUGE_POSITIVE": {

                    "range": [7, 9],

                    "conditions": ["Raises guidance significantly above street consensus"],

                    "notes": "אחד הקטליזטורים הכי חזקים – שדרוג ציפיות קדימה בלי לחכות לדוח.",

                },

                "MILD_POSITIVE": {

                    "range": [3, 5],

                    "conditions": ["Slightly higher guidance", "Narrowed range higher"],

                    "notes": "משדר ביטחון הנהלה; מחזק טרנד קיים.",

                },

                "INLINE": {"range": [-1, 1], "conditions": ["Guidance reaffirmed", "Narrative unchanged"], "notes": "לרוב כמעט בלי אפקט עצמאי."},

                "MILD_NEGATIVE": {"range": [-3, -5], "conditions": ["Guidance lowered modestly"], "notes": "אזהרה רכה; השוק בוחן אם זו מגמה או אירוע נקודתי."},

                "HUGE_NEGATIVE": {

                    "range": [-8, -10],

                    "conditions": ["Profit warning", "Dramatically lowered guidance", "Talk of structural demand slowdown"],

                    "notes": "לעיתים גורר פתיחת גאפ גדול + המשך ירידות לאורך מספר ימים/שבועות.",

                },

            },

            "sector_adjustments": {"XLK": {"multiplier": 1.3}, "XLY": {"multiplier": 1.2}, "XLF": {"multiplier": 1.0}, "XLP": {"multiplier": 0.9}},

            "time_decay": {"intraday": {"half_life_minutes": 180}, "multi_day": {"half_life_days": 4}},

        },

        # =========================

        # 2. DILUTION / BUYBACK

        # =========================

        "DILUTION": {

            "scope": "STOCK_MICRO",

            "description": "Secondary offerings, ATM programs, equity raises, convertibles – anything that increases share count.",

            "applies_to": "SHORT_ONLY",

            "base_impact": 8,

            "scoring": {

                "HUGE_NEGATIVE": {

                    "range": [-8, -9],

                    "conditions": ["Large secondary at deep discount to market", "Surprise offering after big rally"],

                    "notes": "ברוב המקרים יוצר מהלך ירידות חד גם אינטרדיי וגם רב־יומי, במיוחד במניות צמיחה/ביוטק.",

                },

                "MILD_NEGATIVE": {

                    "range": [-3, -5],

                    "conditions": ["Moderate secondary", "Well-telegraphed equity raise"],

                    "notes": "לחץ מכירה מתון יותר; חשוב לראות אם יש buyer demand שסופג את ההיצע.",

                },

                "INLINE": {

                    "range": [0, -2],

                    "conditions": ["Small ATM", "Already expected by market"],

                    "notes": "אם השוק כבר ציפה לדילול, ההשפעה קטנה – הפרייס אקשן קובע יותר מהכותרת.",

                },

            },

            "sector_adjustments": {"XLK": {"multiplier": 1.1}, "XLV": {"multiplier": 1.2}, "XLB": {"multiplier": 1.0}},

            "time_decay": {"intraday": {"half_life_minutes": 120}, "multi_day": {"half_life_days": 5}},

        },

        "BUYBACK": {

            "scope": "STOCK_MICRO",

            "description": "Share repurchase programs – announcements or expansions of buybacks.",

            "applies_to": "LONG_ONLY",

            "base_impact": 5,

            "scoring": {

                "HUGE_POSITIVE": {

                    "range": [5, 6],

                    "conditions": ["Buyback size large vs float (e.g. >5–10%)", "Immediate execution or accelerated program"],

                    "notes": "תמיכת קונים מובטחת; משפר profile של risk/reward במיוחד בדיפס.",

                },

                "MILD_POSITIVE": {

                    "range": [2, 3],

                    "conditions": ["Moderate buyback program", "Extension of existing plan"],

                    "notes": "איתות חיובי אבל לא בהכרח טריגר לראלי עצמאי.",

                },

                "INLINE": {"range": [0, 1], "conditions": ["Small symbolic buyback", "Already widely expected"], "notes": "אפקט בעיקר פסיכולוגי."},

            },

            "sector_adjustments": {"XLF": {"multiplier": 1.1}, "XLP": {"multiplier": 1.0}, "XLK": {"multiplier": 0.9}},

            "time_decay": {"intraday": {"half_life_minutes": 90}, "multi_day": {"half_life_days": 6}},

        },

        # =========================

        # 3. MANAGEMENT / LEGAL / RISK

        # =========================

        "MANAGEMENT_CHANGE": {

            "scope": "STOCK_MICRO",

            "description": "Executive transitions like CEO/CFO resignations, appointments, or board changes.",

            "applies_to": "BOTH",

            "base_impact": 6,

            "scoring": {

                "HUGE_NEGATIVE": {

                    "range": [-6, -7],

                    "conditions": ["Sudden CEO/CFO resignation", "Departure with no clear succession"],

                    "notes": "השוק נלחץ במיוחד אם זה קורה אחרי תקופה חלשה או לפני אירוע גדול (earnings, FDA וכו').",

                },

                "MILD_NEGATIVE": {

                    "range": [0, -3],

                    "conditions": ["Orderly transition", "CFO change without red flags"],

                    "notes": "לעיתים כמעט ניטרלי; צריך להצליב עם macro/technical.",

                },

                "HUGE_POSITIVE": {

                    "range": [4, 6],

                    "conditions": ["Respected new CEO", "Turnaround specialist brought in"],

                    "notes": "יכול להניע רה־רייטינג במניה, במיוחד אם יש תזה של turnaround.",

                },

            },

            "sector_adjustments": {"XLK": {"multiplier": 1.0}, "XLF": {"multiplier": 1.0}, "XLV": {"multiplier": 1.1}},

            "time_decay": {"intraday": {"half_life_minutes": 60}, "multi_day": {"half_life_days": 3}},

        },

        "LEGAL_REGULATORY": {

            "scope": "STOCK_MICRO",

            "description": "Fraud allegations, SEC investigations, antitrust, class actions, regulatory fines.",

            "applies_to": "SHORT_ONLY",

            "base_impact": 9,

            "scoring": {

                "HUGE_NEGATIVE": {

                    "range": [-8, -10],

                    "conditions": ["SEC/DOJ investigation", "Accounting irregularities", "Serious fraud allegations"],

                    "notes": "חדשות מהכבדות ביותר; יכולות למחוק אחוזים דו־ספרתיים ולשנות את תזת ההשקעה לחלוטין.",

                },

                "MILD_NEGATIVE": {

                    "range": [-3, -6],

                    "conditions": ["Class action", "Moderate regulatory fine"],

                    "notes": "פגיעה בתדמית/במוניטין, לעיתים דחופה בעיקר בסנטימנט קצר טווח.",

                },

                "INLINE": {"range": [-1, 0], "conditions": ["Legacy cases", "Already settled"], "notes": "אם המידע כבר מתומחר – האפקט מוגבל, יותר רעש מרקע."},

            },

            "sector_adjustments": {"XLK": {"multiplier": 1.1}, "XLV": {"multiplier": 1.2}, "XLF": {"multiplier": 1.3}},

            "time_decay": {"intraday": {"half_life_minutes": 180}, "multi_day": {"half_life_days": 7}},

        },

        "CYBER_DATA_RECALL": {

            "scope": "STOCK_MICRO",

            "description": "Cyberattack, data breach, product recall, major operational disruption.",

            "applies_to": "SHORT_ONLY",

            "base_impact": 7,

            "scoring": {

                "HUGE_NEGATIVE": {

                    "range": [-7, -9],

                    "conditions": ["Massive data breach", "Safety-critical product recall"],

                    "notes": "פוגע באמון הלקוחות ויכול לגרור עלויות משפטיות/תפעוליות כבדות.",

                },

                "MILD_NEGATIVE": {

                    "range": [-2, -5],

                    "conditions": ["Contained cyber incident", "Limited recall"],

                    "notes": "השפעה בעיקר קצר טווח; חשוב לעקוב אחרי התגובה של החברה והלקוחות.",

                },

                "INLINE": {"range": [-1, 0], "conditions": ["Fully resolved with minor impact"], "notes": "Event קטן/מקומי; לרוב לא משנה את התזה."},

            },

            "sector_adjustments": {"XLK": {"multiplier": 1.2}, "XLP": {"multiplier": 1.0}, "XLI": {"multiplier": 1.1}},

            "time_decay": {"intraday": {"half_life_minutes": 120}, "multi_day": {"half_life_days": 4}},

        },

        # =========================

        # 4. M&A / CONTRACTS / PRODUCT

        # =========================

        "M_AND_A": {

            "scope": "STOCK_MICRO",

            "description": "Mergers, acquisitions, buyout offers, strategic or hostile deals.",

            "applies_to": "BOTH",

            "base_impact": 7,

            "scoring": {

                # M&A has different scoring for target vs acquirer

                "target_company": {

                    "HUGE_POSITIVE": {

                        "range": [7, 9],

                        "conditions": ["Cash offer with large premium", "Bidding war / multiple bidders"],

                        "notes": "המניה של ה־target כמעט תמיד מזנקת, לעיתים נסחרת מתחת למחיר ההצעה בגלל סיכון סגירה.",

                    },

                    "HUGE_NEGATIVE": {

                        "range": [-6, -8],

                        "conditions": ["Deal collapse", "Regulators block takeover"],

                        "notes": "במקרים רבים מחזירה את המניה לאזור לפני ההצעה או נמוך יותר.",

                    },

                },

                "acquirer_company": {

                    "overpriced_deal": {

                        "range": [-3, -6],

                        "conditions": ["High premium", "Highly dilutive", "Strategic doubts"],

                        "notes": "השוק שונא overpay; במיוחד אם יש דילול כבד/חוב חדש.",

                    },

                    "strategic_deal": {

                        "range": [2, 4],

                        "conditions": ["Strong strategic fit", "Accretive to EPS"],

                        "notes": "בטווח בינוני יכול לשפר תזרים/רווחיות ולהצדיק Re-rating.",

                    },

                },

            },

            "sector_adjustments": {"XLK": {"multiplier": 1.1}, "XLI": {"multiplier": 1.0}, "XLV": {"multiplier": 1.2}},

            "time_decay": {"intraday": {"half_life_minutes": 120}, "multi_day": {"half_life_days": 10}},

        },

        "PRODUCT_LAUNCH_PIPELINE": {

            "scope": "STOCK_MICRO",

            "description": "Major product launches, AI features, pipeline updates, new services.",

            "applies_to": "LONG_ONLY",

            "base_impact": 6,

            "scoring": {

                "HUGE_POSITIVE": {

                    "range": [6, 8],

                    "conditions": ["Breakthrough product", "Massive TAM expansion"],

                    "notes": "יכול להניע Story חדש במניה, במיוחד בטֶק/קונסיומר.",

                },

                "MILD_POSITIVE": {

                    "range": [2, 4],

                    "conditions": ["Incremental upgrade", "New SKU within existing line"],

                    "notes": "רוב ההשפעה תלויה בביצוע לאורך זמן יותר מאשר ביום ההודעה.",

                },

                "INLINE": {"range": [-1, 1], "conditions": ["Minor feature update", "Already expected"], "notes": "ברוב המקרים רעש בלבד."},

            },

            "sector_adjustments": {"XLK": {"multiplier": 1.3}, "XLY": {"multiplier": 1.2}, "XLV": {"multiplier": 1.1}},

            "time_decay": {"intraday": {"half_life_minutes": 90}, "multi_day": {"half_life_days": 5}},

        },

        "SUPPLY_CHAIN_CONTRACTS": {

            "scope": "STOCK_MICRO",

            "description": "Large customer wins or losses, long-term supply agreements, cancellations.",

            "applies_to": "BOTH",

            "base_impact": 6,

            "scoring": {

                "HUGE_POSITIVE": {

                    "range": [6, 8],

                    "conditions": ["Major long-term contract win", "Strategic partnership with big customer"],

                    "notes": "מגדיל וודאות הכנסות קדימה, במיוחד בסקטורי תעשייה/צ'יפים/ספקים גדולים.",

                },

                "MILD_POSITIVE": {

                    "range": [2, 4],

                    "conditions": ["Medium-size contract", "Extension of existing deal"],

                    "notes": "תומך בתזה אבל לא מהלך life-changing.",

                },

                "MILD_NEGATIVE": {

                    "range": [-2, -4],

                    "conditions": ["Contract reduction", "Partial loss"],

                    "notes": "פוגע בשורה העליונה; חשוב לראות מה המשקל של הלקוח בתמהיל.",

                },

                "HUGE_NEGATIVE": {

                    "range": [-6, -8],

                    "conditions": ["Full contract cancellation", "Loss of key customer"],

                    "notes": "עלול להפוך מניה מצמיחה לבעייתית; השוק שונא ריכוזיות לקוח גבוהה.",

                },

            },

            "sector_adjustments": {"XLI": {"multiplier": 1.2}, "XLB": {"multiplier": 1.1}, "XLK": {"multiplier": 1.1}},

            "time_decay": {"intraday": {"half_life_minutes": 120}, "multi_day": {"half_life_days": 6}},

        },

        "DIVIDEND_CHANGE": {

            "scope": "STOCK_MICRO",

            "description": "Dividend initiation, increases, cuts, or suspensions.",

            "applies_to": "BOTH",

            "base_impact": 5,

            "scoring": {

                "HUGE_POSITIVE": {

                    "range": [4, 6],

                    "conditions": ["Large dividend increase", "Dividend initiation with attractive yield"],

                    "notes": "חשוב במיוחד בסקטורים דפנסיביים ו־REITs; מעיד על ביטחון תזרימי.",

                },

                "MILD_POSITIVE": {"range": [1, 3], "conditions": ["Small increase", "Regular annual raise"], "notes": "שגרתי; יותר חיזוק לתזה מאשר טריגר עצמאי."},

                "MILD_NEGATIVE": {

                    "range": [-3, -5],

                    "conditions": ["Dividend cut", "Suspension"],

                    "notes": "סיגנל קצת 'שבור'; אומר להמון משקיעים שהסיפור השתנה.",

                },

            },

            "sector_adjustments": {"XLP": {"multiplier": 1.2}, "XLU": {"multiplier": 1.3}, "XLRE": {"multiplier": 1.3}},

            "time_decay": {"intraday": {"half_life_minutes": 60}, "multi_day": {"half_life_days": 5}},

        },

    },

}

