# rulebooks/news_micro_global_rulebook.py

"""

NEWS MICRO GLOBAL RULEBOOK



קובץ זה מגדיר חוקי ניקוד לחדשות ברמת החברה (STOCK_MICRO_GLOBAL),

שאינן תלויות ישירות בסקטור:

- שינוי המלצת אנליסטים (ANALYST_RATING_CHANGE)

- כניסה/יציאה מאינדקס (INDEX_INCLUSION_REMOVAL)

- פעילות פנים (INSIDER_ACTIVITY)

- שינוי בשורט (SHORT_INTEREST_CHANGE)



הקובץ הוא ספר חוקים בלבד (Rulebook):

- אין כאן חישוב בפועל

- אין כאן חיבור ל־IBKR או לזרם חדשות

- המערכת החיצונית תקבל טקסט חדשות + מטא־דאטה (source, זמן, סנטימנט)

  ותבצע מיפוי ל־NEWS_TYPE + SURPRISE_LEVEL + SOURCE_QUALITY וכד’.



טווח ניקוד: -10 עד +10

"""



from __future__ import annotations

from typing import Dict, List, Literal, TypedDict, Optional



ScoreRange = List[int]





class SurpriseScoring(TypedDict):

    score_range: ScoreRange

    note: str





class SourceWeight(TypedDict):

    weight: float

    description: str





class TimeBucketWeight(TypedDict):

    intraday_0_15m: float

    intraday_15_60m: float

    intraday_1_3h: float

    intraday_3h_plus: float

    daily_context: float





class MicroNewsType(TypedDict, total=False):

    scope: Literal["STOCK_MICRO_GLOBAL"]

    description: str

    base_impact: int

    scoring: Dict[str, SurpriseScoring]

    time_weights: TimeBucketWeight

    source_weights: Dict[str, SourceWeight]

    keywords: List[str]

    micro_logic_notes: str





class NewsMicroGlobalRulebook(TypedDict):

    meta: Dict[str, object]

    news_types: Dict[str, MicroNewsType]





NEWS_MICRO_GLOBAL_RULEBOOK: NewsMicroGlobalRulebook = {

    "meta": {

        "score_scale": {"min": -10, "max": 10},

        "surprise_levels": {

            "HUGE_POSITIVE": {"multiplier": 1.0, "description": "הפתעה חיובית חזקה לחברה."},

            "MILD_POSITIVE": {"multiplier": 0.5, "description": "חיובית מתונה."},

            "INLINE": {"multiplier": 0.0, "description": "תואם ציפיות / ללא הפתעה."},

            "MILD_NEGATIVE": {"multiplier": -0.5, "description": "שלילית מתונה."},

            "HUGE_NEGATIVE": {"multiplier": -1.0, "description": "שלילית חזקה."},

        },

        # משקל מקור החדשות – ישמש ע"י מנוע הניקוד (לא כאן)

        "default_source_weights": {

            "TIER1_NEWS": {"weight": 1.0, "description": "אתרי חדשות פיננסיים מרכזיים (Bloomberg, Reuters וכו')."},

            "OFFICIAL_FILINGS": {"weight": 1.1, "description": "דוחות רשמיים – SEC, 8-K, 10-Q וכו'."},

            "COMPANY_PR": {"weight": 0.9, "description": "הודעות PR של החברה עצמה."},

            "HIGH_CRED_SOCIAL": {

                "weight": 0.9,

                "description": "טוויטר/רשתות חברתיות של דמויות בעלות אמינות גבוהה (למשל מנהלים, פוליטיקאים, אנליסטים בכירים).",

            },

            "LOW_CRED_SOCIAL": {

                "weight": 0.5,

                "description": "מקורות אנונימיים / סנטימנטיים בלבד – פחות אמין.",

            },

        },

        "default_time_weights": {

            # חדשות מיקרו־גלובליות משפיעות חזק מסביב לזמן הפרסום

            "intraday_0_15m": 1.0,

            "intraday_15_60m": 0.85,

            "intraday_1_3h": 0.7,

            "intraday_3h_plus": 0.6,

            "daily_context": 0.8,

        },

    },



    "news_types": {

        # =========================

        # ANALYST_RATING_CHANGE

        # =========================

        "ANALYST_RATING_CHANGE": {

            "scope": "STOCK_MICRO_GLOBAL",

            "description": "שינוי המלצת אנליסטים או מחיר יעד (Upgrade/Downgrade/Initiation).",

            "base_impact": 5,  # שינויים קיצוניים יכולים להיות חזקים, אבל ברירת מחדל בינונית

            "keywords": [

                "upgraded to Buy",

                "upgraded to Overweight",

                "downgraded to Sell",

                "downgraded to Underweight",

                "price target raised",

                "price target cut",

                "initiated with Buy",

                "initiated with Sell",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [5, 7],

                    "note": "שדרוג חזק (למשל Sell→Buy) או העלאת מחיר יעד חדה מעל המחיר.",

                },

                "MILD_POSITIVE": {

                    "score_range": [2, 4],

                    "note": "שדרוג מ-Hold ל-Buy / העלאת מחיר יעד מתונה.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "Reiterate או שינוי זניח במחיר יעד.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-2, -4],

                    "note": "Downgrade מ-Buy ל-Hold או הורדת מחיר יעד מתונה.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-5, -7],

                    "note": "Downgrade חד (Buy→Sell) או הורדת מחיר יעד משמעותית מתחת למחיר.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 1.0,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.75,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.7,

            },

            "source_weights": {

                "TIER1_NEWS": {"weight": 1.0, "description": "שינוי דירוג מדווח דרך גופי חדשות מרכזיים."},

                "OFFICIAL_FILINGS": {"weight": 1.0, "description": "בד\"כ פחות רלוונטי לסוג זה."},

                "COMPANY_PR": {"weight": 0.8, "description": "אם החברה מצטטת אנליסטים – טיפול בזהירות."},

                "HIGH_CRED_SOCIAL": {"weight": 0.9, "description": "אנליסט בית השקעות מפרסם בטוויטר."},

                "LOW_CRED_SOCIAL": {"weight": 0.5, "description": "שמועה בלבד."},

            },

            "micro_logic_notes": (

                "משמעות הידיעה תלויה ברמת האנליסט/בית ההשקעות. "

                "האלגוריתם החיצוני יכול לשקלל בנפרד Tier גבוה יותר לגופים כמו GS/JPM."

            ),

        },



        # =========================

        # INDEX_INCLUSION_REMOVAL

        # =========================

        "INDEX_INCLUSION_REMOVAL": {

            "scope": "STOCK_MICRO_GLOBAL",

            "description": "כניסה או יציאה ממדדים גדולים (S&P 500, Nasdaq 100 וכו').",

            "base_impact": 6,

            "keywords": [

                "added to S&P 500",

                "removed from S&P 500",

                "joins Nasdaq 100",

                "index inclusion",

                "index removal",

                "index rebalancing",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [6, 8],

                    "note": "הוספה למדד גדול → רכישת חובה מצד קרנות מדד.",

                },

                "MILD_POSITIVE": {

                    "score_range": [3, 4],

                    "note": "שינוי חיובי במדד פחות מרכזי / השפעה חלקית.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "Rebalance קטן / ללא משמעות מהותית.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-3, -4],

                    "note": "הוצאה ממדד משני או צמצום משקל.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-6, -8],

                    "note": "הוצאה ממדד מרכזי → לחץ מכירות חזק מצד קרנות פסיביות.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 0.95,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.8,

                "intraday_3h_plus": 0.7,

                "daily_context": 0.85,

            },

            "source_weights": {

                "TIER1_NEWS": {"weight": 1.0, "description": "הודעה רשמית דרך ספק מדדים/חדשות."},

                "OFFICIAL_FILINGS": {"weight": 1.05, "description": "אישור רשמי."},

                "COMPANY_PR": {"weight": 0.9, "description": "החברה מודיעה על הכנסת/הוצאתה."},

                "HIGH_CRED_SOCIAL": {"weight": 0.85, "description": "דיווח מוקדם של עיתונאי מוכר."},

                "LOW_CRED_SOCIAL": {"weight": 0.4, "description": "שמועה שלא אושרה."},

            },

            "micro_logic_notes": (

                "ההשפעה המעשית מורגשת במיוחד סביב תאריכי Rebalance בפועל. "

                "מומלץ שמנוע הניקוד החיצוני ידע לזהות proximity ליום הרכב המדד."

            ),

        },



        # =========================

        # INSIDER_ACTIVITY

        # =========================

        "INSIDER_ACTIVITY": {

            "scope": "STOCK_MICRO_GLOBAL",

            "description": "קניות/מכירות של מנהלים ודירקטורים (Form 4 וכו').",

            "base_impact": 4,

            "keywords": [

                "insider buying",

                "insider selling",

                "CEO buys shares",

                "CFO buys shares",

                "director sells shares",

                "Form 4",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [3, 5],

                    "note": "קנייה משמעותית על ידי מספר מנהלים בכירים (cluster buying).",

                },

                "MILD_POSITIVE": {

                    "score_range": [1, 2],

                    "note": "קנייה מתונה של מנהל/דירקטור יחיד.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "מכירה שגרתית (אופציות, Vesting) או עסקה קטנה.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-1, -3],

                    "note": "מכירה גדלה של מנהלים אחרי ירידה במחיר.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-3, -5],

                    "note": "מכירה משמעותית על ידי בכירים בזמן חולשה במניה.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 0.7,

                "intraday_15_60m": 0.7,

                "intraday_1_3h": 0.65,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.8,

            },

            "source_weights": {

                "TIER1_NEWS": {"weight": 0.95, "description": "דיווחי סיכום בחדשות."},

                "OFFICIAL_FILINGS": {"weight": 1.1, "description": "Form 4 רשמי – מקור אמין ביותר."},

                "COMPANY_PR": {"weight": 0.9, "description": "החברה מציגה פעילות אינסיידרים."},

                "HIGH_CRED_SOCIAL": {"weight": 0.8, "description": "משתמש טוויטר מוכר שמצטט Form 4."},

                "LOW_CRED_SOCIAL": {"weight": 0.4, "description": "שמועה על פנימי שמכר/קנה."},

            },

            "micro_logic_notes": (

                "ההקשר חשוב: מכירה לאחר ראלי גדול פחות שלילית מאשר מכירה בזמן חולשה. "

                "את ההקשר ישקלל מנוע הניקוד החיצוני יחד עם מחלקת Technical/Trend."

            ),

        },



        # =========================

        # SHORT_INTEREST_CHANGE

        # =========================

        "SHORT_INTEREST_CHANGE": {

            "scope": "STOCK_MICRO_GLOBAL",

            "description": "שינויים בשורט: אחוז שורט, Borrow Fee, דיבור על Short Squeeze.",

            "base_impact": 3,

            "keywords": [

                "short interest spikes",

                "short interest surges",

                "high short interest",

                "borrow fee jumps",

                "short squeeze",

                "short covering",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [3, 5],

                    "note": "Short squeeze פעיל – שורטים מכסים תוך כדי עליות.",

                },

                "MILD_POSITIVE": {

                    "score_range": [1, 2],

                    "note": "ירידה בשורט / סימני כיסוי אחרי ירידה חזקה.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "שינוי קטן באחוז השורט.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-1, -3],

                    "note": "עלייה בשורט ללא חדשות חיוביות, שוק מהמר נגד החברה.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-3, -5],

                    "note": "קפיצה גדולה באחוז השורט + עלייה ב-Borrow Fee.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 0.8,

                "intraday_15_60m": 0.8,

                "intraday_1_3h": 0.75,

                "intraday_3h_plus": 0.7,

                "daily_context": 0.85,

            },

            "source_weights": {

                "TIER1_NEWS": {"weight": 0.95, "description": "סיכומי נתוני שורט מאתרים מוכרים."},

                "OFFICIAL_FILINGS": {"weight": 1.0, "description": "נתוני בורסה/רשויות."},

                "COMPANY_PR": {"weight": 0.7, "description": "החברה כמעט לא מדווחת על זה באופן ישיר."},

                "HIGH_CRED_SOCIAL": {"weight": 0.9, "description": "חשבונות מוכרים שעוקבים אחרי Short Interest."},

                "LOW_CRED_SOCIAL": {"weight": 0.5, "description": "שורט סקוויז 'לפי המם של היום'."},

            },

            "micro_logic_notes": (

                "אחוז שורט גבוה יכול להיות גם דלק לשורט סקוויז וגם סימן לחברה חלשה. "

                "הכיוון הסופי (Bullish/Bearish) צריך להגיע משילוב עם Price Action, Volume ו-News נוספים."

            ),

        },

    },

}

