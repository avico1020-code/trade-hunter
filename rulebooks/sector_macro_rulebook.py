# rulebooks/sector_macro_rulebook.py

"""

SECTOR MACRO RULEBOOK



קובץ זה מגדיר את חוקי הניקוד לחדשות מאקרו ברמת *הסקטור*:

- XLK (טכנולוגיה)

- XLE (אנרגיה)

- XLF (פיננסים)

- XLV (בריאות)

- XLRE (נדל"ן)

- XLI (תעשייה)

- XLB (חומרי גלם)

- XLY (צריכה מחזורית)

- XLP (צריכה בסיסית)

- XLU (אנרגיה סולארית/שירותים)



אין כאן חישובים בפועל — רק "ספר חוקים" מנורמל לחלוטין.



כל סקטור מכיל:

- base_impact

- sensitivity_multiplier

- סיווג רמות (HUGE_POSITIVE…)

- מילות מפתח לזיהוי

- ניקוד לפי הפתעה

- משקלי זמן

"""



from __future__ import annotations

from typing import Dict, List, Literal, TypedDict, Optional



ScoreRange = List[int]





class SurpriseScoring(TypedDict):

    score_range: ScoreRange

    note: str





class TimeBucketWeight(TypedDict):

    intraday_0_15m: float

    intraday_15_60m: float

    intraday_1_3h: float

    intraday_3h_plus: float

    daily_context: float





class SectorNewsType(TypedDict, total=False):

    scope: Literal["SECTOR_MACRO"]

    description: str

    base_impact: int

    sensitivity_multiplier: float

    keywords: List[str]

    scoring: Dict[str, SurpriseScoring]

    time_weights: TimeBucketWeight

    sector_logic_notes: str





class SectorMacroRulebook(TypedDict):

    meta: Dict[str, object]

    sectors: Dict[str, SectorNewsType]





SECTOR_MACRO_RULEBOOK: SectorMacroRulebook = {

    "meta": {

        "score_scale": {"min": -10, "max": 10},

        "surprise_levels": {

            "HUGE_POSITIVE": {"multiplier": 1.0, "description": "הפתעה חיובית חזקה לסקטור."},

            "MILD_POSITIVE": {"multiplier": 0.5, "description": "חיובית מתונה."},

            "INLINE": {"multiplier": 0.0, "description": "ללא שינוי לעומת צפי."},

            "MILD_NEGATIVE": {"multiplier": -0.5, "description": "שלילית מתונה."},

            "HUGE_NEGATIVE": {"multiplier": -1.0, "description": "שלילית חזקה."},

        },

        "default_time_weights": {

            "intraday_0_15m": 0.9,

            "intraday_15_60m": 0.8,

            "intraday_1_3h": 0.6,

            "intraday_3h_plus": 0.5,

            "daily_context": 0.8,

        },

    },



    "sectors": {

        # =========================

        # XLK – Technology

        # =========================

        "XLK": {

            "scope": "SECTOR_MACRO",

            "description": "סקטור הטכנולוגיה: שבבים, AI, ענן, תוכנה. רגיש במיוחד לריבית.",

            "base_impact": 6,

            "sensitivity_multiplier": 1.2,

            "keywords": [

                "chip demand",

                "semiconductor",

                "AI demand",

                "cloud spending",

                "export controls",

                "antitrust",

            ],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [6, 8], "note": "קיצוץ ריבית, פריחה ב-AI."},

                "MILD_POSITIVE": {"score_range": [2, 4], "note": "ביקושים טובים לשבבים/ענן."},

                "INLINE": {"score_range": [-1, 1], "note": "השפעה נייטרלית."},

                "MILD_NEGATIVE": {"score_range": [-2, -4], "note": "חולשה קלה/ריבית עולה."},

                "HUGE_NEGATIVE": {"score_range": [-6, -8], "note": "הגבלות יצוא, שוק שבבים קורס."},

            },

            "time_weights": {

                "intraday_0_15m": 1.0,

                "intraday_15_60m": 0.85,

                "intraday_1_3h": 0.75,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.85,

            },

            "sector_logic_notes": "הסקטור הכי רגיש לריבית אחרי XLRE.",

        },



        # =========================

        # XLE – Energy

        # =========================

        "XLE": {

            "scope": "SECTOR_MACRO",

            "description": "נפט, גז, זיקוק, OPEC, מלאים.",

            "base_impact": 7,

            "sensitivity_multiplier": 1.3,

            "keywords": [

                "oil prices",

                "WTI",

                "OPEC",

                "pipeline outage",

                "inventory build",

            ],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [7, 9], "note": "קיצוצי OPEC / עליית ביקוש חריפה."},

                "MILD_POSITIVE": {"score_range": [3, 5], "note": "ביקוש לאנרגיה."},

                "INLINE": {"score_range": [-1, 1], "note": "יציבות בנפט."},

                "MILD_NEGATIVE": {"score_range": [-3, -5], "note": "בניית מלאים / ירידת ביקוש."},

                "HUGE_NEGATIVE": {"score_range": [-7, -9], "note": "נפילה בנפט, האטה גלובלית."},

            },

            "time_weights": {

                "intraday_0_15m": 1.0,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.8,

                "intraday_3h_plus": 0.7,

                "daily_context": 0.85,

            },

            "sector_logic_notes": "רגיש במיוחד לאירועים גיאו־פוליטיים.",

        },



        # =========================

        # XLF – Financials

        # =========================

        "XLF": {

            "scope": "SECTOR_MACRO",

            "description": "בנקים, חברות ביטוח, הלוואות, מרווחי ריבית.",

            "base_impact": 6,

            "sensitivity_multiplier": 1.2,

            "keywords": ["yield curve", "credit losses", "deposit outflows", "capital requirements"],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [6, 8], "note": "עקומת תשואות מתלולה."},

                "MILD_POSITIVE": {"score_range": [2, 4], "note": "ביקוש אשראי גבוה."},

                "INLINE": {"score_range": [-1, 1], "note": "ללא שינוי מהותי."},

                "MILD_NEGATIVE": {"score_range": [-2, -4], "note": "ירידה בביקוש / פיקדונות בורחים."},

                "HUGE_NEGATIVE": {"score_range": [-6, -8], "note": "סיכון משבר בנקאי."},

            },

            "time_weights": {

                "intraday_0_15m": 0.95,

                "intraday_15_60m": 0.85,

                "intraday_1_3h": 0.7,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.8,

            },

            "sector_logic_notes": "הכי רגיש לעקום תשואות.",

        },



        # =========================

        # XLV – Healthcare

        # =========================

        "XLV": {

            "scope": "SECTOR_MACRO",

            "description": "פרמצבטיקה, ביוטק, רגולציה, FDA.",

            "base_impact": 7,

            "sensitivity_multiplier": 1.3,

            "keywords": ["FDA", "phase 3", "drug approval", "safety concerns"],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [7, 9], "note": "אישור FDA גדול."},

                "MILD_POSITIVE": {"score_range": [3, 4], "note": "תוצאות טובות בבדיקות."},

                "INLINE": {"score_range": [-1, 1], "note": "ללא דרמה."},

                "MILD_NEGATIVE": {"score_range": [-3, -4], "note": "עיכובים / רגולציה."},

                "HUGE_NEGATIVE": {"score_range": [-7, -9], "note": "כישלון ניסוי / בטיחות."},

            },

            "time_weights": {

                "intraday_0_15m": 1.0,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.8,

                "intraday_3h_plus": 0.7,

                "daily_context": 0.9,

            },

            "sector_logic_notes": "ביוטק תנודתי אך חדשות FDA הן העיקר.",

        },



        # =========================

        # XLRE – Real Estate

        # =========================

        "XLRE": {

            "scope": "SECTOR_MACRO",

            "description": "נדל\"ן מניב, רגיש מאוד לריבית.",

            "base_impact": 7,

            "sensitivity_multiplier": 1.3,

            "keywords": ["refinancing risk", "vacancy rate", "rent growth", "CRE crisis"],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [7, 9], "note": "קיצוץ ריבית משמעותי."},

                "MILD_POSITIVE": {"score_range": [2, 4], "note": "ביקושים סבירים."},

                "INLINE": {"score_range": [-1, 1], "note": "שקט יחסי בשוק."},

                "MILD_NEGATIVE": {"score_range": [-3, -4], "note": "חולשה בביקושים / ריבית גבוהה."},

                "HUGE_NEGATIVE": {"score_range": [-7, -9], "note": "משבר נדל\"ן מסחרי."},

            },

            "time_weights": {

                "intraday_0_15m": 0.9,

                "intraday_15_60m": 0.8,

                "intraday_1_3h": 0.7,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.85,

            },

            "sector_logic_notes": "הסקטור הרגיש ביותר לריבית.",

        },



        # =========================

        # XLI – Industrials

        # =========================

        "XLI": {

            "scope": "SECTOR_MACRO",

            "description": "תעשייה, תחבורה, תעופה, ביטחון.",

            "base_impact": 6,

            "sensitivity_multiplier": 1.2,

            "keywords": ["factory orders", "supply chain", "large contract", "PMI"],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [6, 8], "note": "הזמנות גדולות / חוזים ממשלתיים."},

                "MILD_POSITIVE": {"score_range": [2, 4], "note": "ביקושים טובים."},

                "INLINE": {"score_range": [-1, 1], "note": "שוק רדום."},

                "MILD_NEGATIVE": {"score_range": [-2, -4], "note": "ירידה בייצור."},

                "HUGE_NEGATIVE": {"score_range": [-6, -8], "note": "קריסת שרשרת אספקה / מיתון."},

            },

            "time_weights": {

                "intraday_0_15m": 0.85,

                "intraday_15_60m": 0.8,

                "intraday_1_3h": 0.7,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.8,

            },

            "sector_logic_notes": "רגיש במיוחד ל-PMI ולחוזים ממשלתיים.",

        },



        # =========================

        # XLB – Materials

        # =========================

        "XLB": {

            "scope": "SECTOR_MACRO",

            "description": "כריה, מתכות, כימיקלים.",

            "base_impact": 6,

            "sensitivity_multiplier": 1.2,

            "keywords": ["metal prices", "commodity surge", "mine shutdown", "China demand"],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [6, 8], "note": "מחירי מתכות מזנקים / ביקוש חזק מסין."},

                "MILD_POSITIVE": {"score_range": [2, 3], "note": "ביקושים מתונים."},

                "INLINE": {"score_range": [-1, 1], "note": "אין שינוי מהותי."},

                "MILD_NEGATIVE": {"score_range": [-2, -4], "note": "ירידה במחירים / ביקוש חלש."},

                "HUGE_NEGATIVE": {"score_range": [-6, -8], "note": "קריסה בסחורות / סין נחלשת."},

            },

            "time_weights": {

                "intraday_0_15m": 0.9,

                "intraday_15_60m": 0.85,

                "intraday_1_3h": 0.75,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.8,

            },

            "sector_logic_notes": "רגיש מאוד לביקוש גלובלי וסין.",

        },



        # =========================

        # XLY – Consumer Discretionary

        # =========================

        "XLY": {

            "scope": "SECTOR_MACRO",

            "description": "צריכה מחזורית: רכב, ריטייל, מוצרי יוקרה.",

            "base_impact": 6,

            "sensitivity_multiplier": 1.3,

            "keywords": ["holiday sales", "weak demand", "inventory buildup", "consumer confidence"],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [6, 8], "note": "מכירות חזקות / ביקושים גבוהים."},

                "MILD_POSITIVE": {"score_range": [2, 4], "note": "צריכה סבירה."},

                "INLINE": {"score_range": [-1, 1], "note": "ללא שינוי."},

                "MILD_NEGATIVE": {"score_range": [-2, -4], "note": "חלשות בביקושים."},

                "HUGE_NEGATIVE": {"score_range": [-6, -8], "note": "נפילה בצריכה / מלאים מנופחים."},

            },

            "time_weights": {

                "intraday_0_15m": 0.9,

                "intraday_15_60m": 0.8,

                "intraday_1_3h": 0.7,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.85,

            },

            "sector_logic_notes": "תנועות מושהות — מגיב לחדשות צריכה.",

        },



        # =========================

        # XLP – Staples

        # =========================

        "XLP": {

            "scope": "SECTOR_MACRO",

            "description": "מוצרים בסיסיים: מזון, פארם, סופרמרקטים.",

            "base_impact": 5,

            "sensitivity_multiplier": 1.1,

            "keywords": ["food price", "recall", "grocery demand", "staples"],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [4, 5], "note": "גידול בביקוש למוצרים בסיסיים."},

                "MILD_POSITIVE": {"score_range": [1, 2], "note": "ביקוש יציב."},

                "INLINE": {"score_range": [-1, 1], "note": "רמת תנודתיות נמוכה."},

                "MILD_NEGATIVE": {"score_range": [-1, -2], "note": "חולשה קלה."},

                "HUGE_NEGATIVE": {"score_range": [-3, -5], "note": "משבר אמון/ריקולים גדולים."},

            },

            "time_weights": {

                "intraday_0_15m": 0.7,

                "intraday_15_60m": 0.65,

                "intraday_1_3h": 0.6,

                "intraday_3h_plus": 0.55,

                "daily_context": 0.85,

            },

            "sector_logic_notes": "סקטור הגנתי — עולה כשיש פחד.",

        },



        # =========================

        # XLU – Utilities

        # =========================

        "XLU": {

            "scope": "SECTOR_MACRO",

            "description": "חברות חשמל/מים/תשתיות — סקטור הגנתי מאוד.",

            "base_impact": 5,

            "sensitivity_multiplier": 1.1,

            "keywords": ["grid stability", "rate increase approved", "storm damage"],

            "scoring": {

                "HUGE_POSITIVE": {"score_range": [4, 5], "note": "יציבות וביקושים גבוהים."},

                "MILD_POSITIVE": {"score_range": [1, 2], "note": "תנועה למקלט מפני תנודתיות."},

                "INLINE": {"score_range": [-1, 1], "note": "יציבות — כמעט ללא השפעה."},

                "MILD_NEGATIVE": {"score_range": [-1, -2], "note": "חולשה קלה."},

                "HUGE_NEGATIVE": {"score_range": [-3, -5], "note": "פגיעה בתשתיות / רגולציה."},

            },

            "time_weights": {

                "intraday_0_15m": 0.7,

                "intraday_15_60m": 0.65,

                "intraday_1_3h": 0.6,

                "intraday_3h_plus": 0.55,

                "daily_context": 0.85,

            },

            "sector_logic_notes": "נסחר כחלופה לאג\"ח — רגיש לריבית.",

        },

    },

}

