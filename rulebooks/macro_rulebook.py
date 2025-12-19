# rulebooks/macro_rulebook.py

"""

MARKET MACRO RULEBOOK



קובץ זה מגדיר *רק* את חוקי הניקוד לחדשות מאקרו ברמת השוק כולו.

אין כאן חישובים בפועל, אין חיבור ל־API, ואין לוגיקה של מסחר –

רק "ספר חוקים" שממנו שאר המערכת תפרש חדשות ותתרגם אותן לציונים.



הקובץ מיועד לשימוש על ידי:

- מודול ניתוח חדשות (News Scoring Engine)

- מאסטר סקורינג סיסטם (Master Scoring System)



טווח ציונים אחיד: NEWS_SCORE ∈ [-10, +10]

כיוון:

- חיובי → בדרך כלל תומך ב־Risk-ON / לונג על השוק

- שלילי → בדרך כלל תומך ב־Risk-OFF / שורט / הגנה

"""



from __future__ import annotations

from typing import Dict, List, Literal, TypedDict, Optional





ScoreRange = List[int]  # [min_score, max_score]





class SurpriseConfig(TypedDict):

    multiplier: float

    description: str





class TimeBucketWeight(TypedDict):

    """משקל לפי מימד הזמן של הידיעה (תוך יומי / יומי)."""

    intraday_0_15m: float      # בזמן האירוע / כמה דקות מסביב

    intraday_15_60m: float     # 15–60 דקות אחרי

    intraday_1_3h: float       # שעה–3 שעות

    intraday_3h_plus: float    # מאוחר יותר באותו היום

    daily_context: float       # שימוש לחקר שוק בתחילת היום / למחרת





class SurpriseScoring(TypedDict):

    score_range: ScoreRange

    note: str





class MacroNewsType(TypedDict, total=False):

    scope: Literal["MARKET_MACRO"]

    description: str

    base_impact: int

    typical_effect: Literal["RISK_ON", "RISK_OFF", "MIXED"]

    # מילות מפתח לאיתור ראשוני (לפני LLM / NLP)

    keywords: List[str]

    # ניקוד לפי סוג ההפתעה (HUGE_POSITIVE, MILD_NEGATIVE וכו')

    scoring: Dict[str, SurpriseScoring]

    # משקלי זמן – איך עוצמת ההשפעה דועכת לאורך היום

    time_weights: TimeBucketWeight

    # הערות לעבודה יומית / תוך יומית

    intraday_notes: str

    daily_notes: str





class MacroRulebook(TypedDict):

    meta: Dict[str, object]

    news_types: Dict[str, MacroNewsType]





MARKET_MACRO_RULEBOOK: MacroRulebook = {

    "meta": {

        # טווח הציונים הכללי לכל חדשות מאקרו

        "score_scale": {

            "min": -10,

            "max": 10,

        },

        # רמות "הפתעה" יחסית לציפיות השוק (קונצנזוס)

        # אלו לאニュース עצמם, אלא "טאג" שמנוע ה־NLP ייתן לכל אירוע.

        "surprise_levels": {

            "HUGE_POSITIVE": {

                "multiplier": 1.0,

                "description": "הפתעה חיובית חזקה מול ציפיות השוק.",

            },

            "MILD_POSITIVE": {

                "multiplier": 0.5,

                "description": "הפתעה חיובית קלה/בינונית.",

            },

            "INLINE": {

                "multiplier": 0.0,

                "description": "בגדול לפי הציפיות – לא משנה דרמטית את התמונה.",

            },

            "MILD_NEGATIVE": {

                "multiplier": -0.5,

                "description": "הפתעה שלילית קלה/בינונית.",

            },

            "HUGE_NEGATIVE": {

                "multiplier": -1.0,

                "description": "הפתעה שלילית חזקה מול ציפיות השוק.",

            },

        },

        # משקלי זמן ברירת מחדל – אפשר לעדכן לפי טייפ חדשות ספציפי

        "default_time_weights": {

            "intraday_0_15m": 1.0,

            "intraday_15_60m": 0.8,

            "intraday_1_3h": 0.6,

            "intraday_3h_plus": 0.4,

            "daily_context": 0.7,

        },

    },



    "news_types": {

        # =========================

        # FED RATE DECISION / FOMC

        # =========================

        "FED_RATE_DECISION": {

            "scope": "MARKET_MACRO",

            "description": (

                "החלטות ריבית של הפד, הודעת FOMC, דוט פלוט, וטון ההודעה "

                "(הוקיש/דוביש). אחת ההודעות החשובות ביותר לשוק כולו."

            ),

            "base_impact": 7,

            "typical_effect": "MIXED",  # תלוי האם הפתעה לטובה/לרעה

            "keywords": [

                "Fed raises rates",

                "Fed cuts rates",

                "rate hike",

                "rate cut",

                "FOMC statement",

                "Powell",

                "hawkish",

                "dovish",

                "higher for longer",

                "policy shift",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [7, 8],

                    "note": "קיצוץ ריבית מפתיע / טון דוביש מאוד בשוק שהיה לחוץ.",

                },

                "MILD_POSITIVE": {

                    "score_range": [3, 4],

                    "note": "ריבית כמצופה אבל טון מעט יותר דוביש / פחות אגרסיבי.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "אין שינוי מפתיע; השוק כבר תימחר את המהלך.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-3, -4],

                    "note": "מעל הצפי, או טון הוקיש יותר – לחץ על מניות צמיחה.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-7, -8],

                    "note": "החמרה משמעותית: העלאת ריבית מפתיעה / 'higher for longer' אגרסיבי.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 1.0,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.8,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.8,

            },

            "intraday_notes": (

                "בשניות/דקות הראשונות המהלך יכול להיות הפוך לגמרי מהכיוון הסופי. "

                "מומלץ לתת עדיפות לפעולה אחרי שהשוק 'מתיישב' (15–30 דקות), "

                "ולצליב עם כיוון SPY ותנועת תשואות אג\"ח."

            ),

            "daily_notes": (

                "משפיע על הבייסיס של הסיכון בשוק לימים ושבועות קדימה; "

                "משמש ליצירת bias יומי וסקטוריאלי (טק, פיננסים, נדל\"ן וכו')."

            ),

        },



        # =========================

        # INFLATION REPORTS (CPI/PCE/PPI)

        # =========================

        "INFLATION_REPORT": {

            "scope": "MARKET_MACRO",

            "description": (

                "דוחות אינפלציה חודשיים (CPI, Core CPI, PCE, PPI). "

                "נתונים קריטיים לשוק, בעיקר לתמחור ציפיות הריבית."

            ),

            "base_impact": 8,

            "typical_effect": "MIXED",

            "keywords": [

                "CPI",

                "Core CPI",

                "PCE",

                "PPI",

                "inflation hotter than expected",

                "inflation cools",

                "prices surge",

                "price pressures",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [8, 9],

                    "note": "אינפלציה נמוכה מהצפי בצורה חדה – מקל על הפד.",

                },

                "MILD_POSITIVE": {

                    "score_range": [4, 5],

                    "note": "ירידה מתונה אבל ברורה בלחצי אינפלציה.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "בסך הכל בהתאם לצפי – אין שינוי מסיבי בציפיות.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-4, -5],

                    "note": "אינפלציה גבוהה קלות מהצפי – לחץ אך לא פאניקה.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-8, -9],

                    "note": "הפתעה אינפלציונית חדה – מכה חזקה לשוק המניות.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 1.0,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.7,

                "intraday_3h_plus": 0.5,

                "daily_context": 0.9,

            },

            "intraday_notes": (

                "כמו ב-FED – תגובה ראשונית יכולה להיות אלימה ושגויה. "

                "מומלץ לצליב עם כיוון האג\"ח (TNX) ותנועת סקטורים רגישים לריבית."

            ),

            "daily_notes": (

                "משמש לקביעת הסנטימנט הכללי לשבועות; משפיע מאוד על XLK, XLRE, XLF."

            ),

        },



        # =========================

        # EMPLOYMENT (NFP / JOBS / WAGES)

        # =========================

        "EMPLOYMENT_REPORT": {

            "scope": "MARKET_MACRO",

            "description": (

                "דו\"חות תעסוקה (Nonfarm Payrolls, שיעור אבטלה, גידול בשכר). "

                "משפיעים גם על כלכלה ריאלית וגם על ציפיות ריבית."

            ),

            "base_impact": 6,

            "typical_effect": "MIXED",

            "keywords": [

                "Nonfarm Payrolls",

                "NFP",

                "unemployment rate",

                "wage growth",

                "labor market tight",

                "labor market cools",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [6, 7],

                    "note": "שילוב של NFP טוב + אינפלציית שכר לא קיצונית.",

                },

                "MILD_POSITIVE": {

                    "score_range": [3, 3],

                    "note": "נתון מעט טוב מהצפי בלי לחץ גדול על השכר.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "תעסוקה בערך לפי הצפי – לא משנה דרמטית את התמונה.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-3, -3],

                    "note": "החמצה קלה / השכר קופץ מעט מעל הצפי.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-6, -7],

                    "note": "שילוב של נתוני תעסוקה חלשים / שכר בורח – חשש מסטגפלציה או האטה.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 0.9,

                "intraday_15_60m": 0.8,

                "intraday_1_3h": 0.7,

                "intraday_3h_plus": 0.5,

                "daily_context": 0.7,

            },

            "intraday_notes": (

                "בדרך כלל מפרסמים לפני פתיחת השוק; השפעה חזקה במיוחד על "

                "סקטורי מחזור (XLI, XLY) ועל הבנקים (XLF)."

            ),

            "daily_notes": (

                "מסייע לקבוע האם הכלכלה מתחממת מדי (לחץ אינפלציוני) או נחלשת."

            ),

        },



        # =========================

        # GDP / PMI / ISM

        # =========================

        "GROWTH_ACTIVITY": {

            "scope": "MARKET_MACRO",

            "description": (

                "נתוני צמיחה ופעילות ריאלית: GDP, PMI, ISM, נתוני פעילות תעשייתית ושירותים."

            ),

            "base_impact": 5,

            "typical_effect": "RISK_ON",

            "keywords": [

                "GDP growth",

                "GDP contraction",

                "PMI",

                "ISM manufacturing",

                "ISM services",

                "factory output",

                "business activity",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [5, 6],

                    "note": "צמיחה חזקה מהצפי בלי אינפלציה מוגזמת.",

                },

                "MILD_POSITIVE": {

                    "score_range": [2, 3],

                    "note": "נתון טוב/סביר שמעיד על כלכלה בריאה.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "לא באמת משנה את התמונה הקיימת.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-2, -3],

                    "note": "האטה קלה שחוזרת על עצמה – מתחיל גידול בסיכון.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-5, -6],

                    "note": "התכווצות מפתיעה או קריסה של PMI/ISM.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 0.8,

                "intraday_15_60m": 0.7,

                "intraday_1_3h": 0.6,

                "intraday_3h_plus": 0.5,

                "daily_context": 0.7,

            },

            "intraday_notes": (

                "פחות 'ברוטאלי' מ־CPI/FED, אך יכול להזיז סקטורים מחזוריים בצורה חדה."

            ),

            "daily_notes": (

                "משמש להבנת הפאזה של המחזור הכלכלי (התרחבות / האטה / מיתון פוטנציאלי)."

            ),

        },



        # =========================

        # CONSUMER ACTIVITY

        # =========================

        "CONSUMER_ACTIVITY": {

            "scope": "MARKET_MACRO",

            "description": (

                "מדדי צריכה – Retail Sales, Consumer Confidence, נתוני ביקוש וקניות."

            ),

            "base_impact": 5,

            "typical_effect": "RISK_ON",

            "keywords": [

                "Retail Sales beat",

                "Retail Sales miss",

                "consumer spending",

                "consumer confidence",

                "holiday sales",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [5, 6],

                    "note": "צריכה חזקה משמעותית מהצפי – טוב לשוק, במיוחד XLY.",

                },

                "MILD_POSITIVE": {

                    "score_range": [2, 3],

                    "note": "צריכה יציבה/חיובית מתונה.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "נתון לא מפתיע – השוק כבר תימחר.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-2, -3],

                    "note": "חולשה קלה – חשש לירידה בביקושים.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-5, -6],

                    "note": "צריכה נופלת / נתון גרוע בסדרת נתונים – חשש להאטה משמעותית.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 0.8,

                "intraday_15_60m": 0.7,

                "intraday_1_3h": 0.6,

                "intraday_3h_plus": 0.5,

                "daily_context": 0.7,

            },

            "intraday_notes": (

                "משפיע במיוחד על סקטור XLY ועל מניות ריטייל ספציפיות."

            ),

            "daily_notes": (

                "עוזר לקבוע האם הכלכלה מסתמכת על צריכה חזקה או נכנסת להאטה בדימנד."

            ),

        },



        # =========================

        # GOVERNMENT POLICY

        # =========================

        "GOVERNMENT_POLICY": {

            "scope": "MARKET_MACRO",

            "description": (

                "מדיניות פיסקלית, סנקציות, מלחמות סחר, סגירת ממשל, חבילות תמרוץ."

            ),

            "base_impact": 7,

            "typical_effect": "MIXED",

            "keywords": [

                "stimulus package",

                "government shutdown",

                "tariffs",

                "trade deal",

                "sanctions",

                "infrastructure bill",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [7, 8],

                    "note": "תמריץ גדול/סיום מלחמת סחר/הסרת סנקציות.",

                },

                "MILD_POSITIVE": {

                    "score_range": [3, 4],

                    "note": "חבילת תמרוץ בינונית / הסכם חיובי.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "רעש פוליטי בלי שינוי כלכלי אמיתי.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-3, -4],

                    "note": "אי ודאות מוגברת – איום בסגירת ממשל / העלאת מכסים.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-7, -8],

                    "note": "מלחמת סחר חריפה / סנקציות רחבות / סיכון גירעון חריג.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 0.9,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.8,

                "intraday_3h_plus": 0.7,

                "daily_context": 0.9,

            },

            "intraday_notes": (

                "טוויט אחד של נשיא / שר אוצר יכול לייצר ספייקים מהירים – "

                "חשוב לצליב עם עוצמת המקור ומספר מקורות אחרים שמאשרים."

            ),

            "daily_notes": (

                "חלק מהידיעות כאן הן רב-יומיות; משתמשים בהן להטיית bias לשבועות."

            ),

        },



        # =========================

        # GEOPOLITICAL RISK

        # =========================

        "GEOPOLITICAL_RISK": {

            "scope": "MARKET_MACRO",

            "description": (

                "מלחמות, התקפות טרור, אסלסציות, הפוגות, הסכמי שלום."

            ),

            "base_impact": 7,

            "typical_effect": "RISK_OFF",

            "keywords": [

                "escalation",

                "airstrike",

                "missile attack",

                "tensions rise",

                "ceasefire",

                "conflict",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [5, 7],

                    "note": "הפסקת אש אמינה / הסכם שלום מפתיע.",

                },

                "MILD_POSITIVE": {

                    "score_range": [2, 4],

                    "note": "שיפור מתון במתיחות / סיכוי להפוגה.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "רעש חדשותי בלי שינוי אמיתי בשטח.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-3, -5],

                    "note": "הסלמה הדרגתית / איומים חדשים.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-7, -9],

                    "note": "הסלמה חריפה, מתקפה גדולה, סיכון אזורי/גלובלי.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 1.0,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.8,

                "intraday_3h_plus": 0.7,

                "daily_context": 0.9,

            },

            "intraday_notes": (

                "לעיתים קרובות הידיעות הראשונות לא מדויקות; חשוב לחכות לאימות "

                "ממספר מקורות / סוכנויות רשמיות לפני תגובה אגרסיבית."

            ),

            "daily_notes": (

                "משפיע על פרמיית הסיכון הכוללת, במיוחד על אנרגיה (XLE), מטבעות, ושוק האג\"ח."

            ),

        },



        # =========================

        # VIX INDEX (FEAR GAUGE)

        # =========================

        "VIX_INDEX_MOVEMENT": {

            "scope": "MARKET_MACRO",

            "description": (

                "שינויים חדים במדד ה-VIX (מדד הפחד). משקף ציפיות לתנודתיות עתידית."

            ),

            "base_impact": 6,

            "typical_effect": "RISK_OFF",

            "keywords": [

                "VIX spikes",

                "VIX surges",

                "VIX above",

                "volatility jumps",

                "volatility crush",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [5, 6],

                    "note": "VIX קורס בצורה חדה (למשל -20%) או יורד מרמות פחד גבוהות.",

                },

                "MILD_POSITIVE": {

                    "score_range": [2, 3],

                    "note": "ירידה מתונה ב-VIX – עלייה בביטחון.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "תנודות קטנות – ללא שינוי איכותי.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-2, -4],

                    "note": "עליה מתונה ב-VIX (10–15%).",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-6, -9],

                    "note": "קפיצה חדה ב-VIX (>25%) או מעבר מעל רמות מפתח (25/30/40).",

                },

            },

            "time_weights": {

                "intraday_0_15m": 1.0,

                "intraday_15_60m": 0.9,

                "intraday_1_3h": 0.8,

                "intraday_3h_plus": 0.7,

                "daily_context": 0.8,

            },

            "intraday_notes": (

                "שינויים חדים מאוד ב-VIX כמעט תמיד קשורים לאירוע חדשותי נוסף – "

                "כדאי לחפש את מקור החדשות ולא להסתמך רק על המספר."

            ),

            "daily_notes": (

                "רמות VIX גבוהות לאורך זמן מעידות על שוק רגיש – סף נמוך לפאניקה "

                "וגם פוטנציאל גבוה יותר לריבאונדים חדים."

            ),

        },



        # =========================

        # FEAR & GREED INDEX

        # =========================

        "FEAR_AND_GREED_INDEX": {

            "scope": "MARKET_MACRO",

            "description": (

                "מדד סנטימנט משוקלל (Fear & Greed) שמודד פחד/תאוות בצע."

            ),

            "base_impact": 5,

            "typical_effect": "MIXED",

            "keywords": [

                "Fear & Greed Index",

                "extreme fear",

                "extreme greed",

                "market sentiment index",

            ],

            "scoring": {

                "HUGE_POSITIVE": {

                    "score_range": [4, 6],

                    "note": "יציאה מ-Extreme Fear לכיוון ניטרלי/חיובי – סיגנל קונטרריאני חזק ללונג.",

                },

                "MILD_POSITIVE": {

                    "score_range": [2, 3],

                    "note": "שיפור מתון בסנטימנט אחרי תקופה חלשה.",

                },

                "INLINE": {

                    "score_range": [-1, 1],

                    "note": "סנטימנט יציב – לא מוסיף הרבה מידע.",

                },

                "MILD_NEGATIVE": {

                    "score_range": [-2, -3],

                    "note": "החלקה קלה לכיוון פחד, אך עדיין לא פאניקה.",

                },

                "HUGE_NEGATIVE": {

                    "score_range": [-5, -6],

                    "note": "Extreme Fear (<20) – שוק בפאניקה; בטווח קצר מסוכן, בטווח קונטרריאני יכול להיות חיובי.",

                },

            },

            "time_weights": {

                "intraday_0_15m": 0.6,

                "intraday_15_60m": 0.6,

                "intraday_1_3h": 0.6,

                "intraday_3h_plus": 0.6,

                "daily_context": 0.9,

            },

            "intraday_notes": (

                "משמש בעיקר כרקע ולא כסיגנל תוך-יומי; מתאים יותר לסינון שוק/ימים קיצוניים."

            ),

            "daily_notes": (

                "אחד הכלים החזקים להבנת מצב סנטימנט קיצוני (קצה עליון/תחתון של סייקל)."

            ),

        },

    },

}

