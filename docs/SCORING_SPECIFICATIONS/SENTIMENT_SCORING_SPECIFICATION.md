# SENTIMENT SCORING — Full Scoring Specification

# מבוסס על הקבצים המקוריים + השלמות מקצועיות

# =====================================================
# 🏁 מטרת המחלקה
# =====================================================

Sentiment Scoring מודד את רמת הסנטימנט (חיובי/שלילי/נייטרלי)

גם בטווח המיידי (אינטר־דיי) וגם בטווח היום-יומי (Daily).

המחלקה מחזירה ציון בטווח [-10, +10]

ונבנית משתי קבוצות בלבד:

1. SENTIMENT_INTRADAY (משקל קבוצה: 1.0)

2. SENTIMENT_DAILY   (משקל קבוצה: 1.0)

המשקלים הפנימיים שווים, כלומר כל קבוצה מהווה 50% מהמחלקה.

# =====================================================
# 📍 חלק 1 — קבוצות + משקלי בסיס
# =====================================================

SENTIMENT_GROUP_WEIGHTS = {

    INTRADAY: 1.0,

    DAILY:    1.0

}

TOTAL_SENTIMENT_WEIGHT = 2.0

SENTIMENT_GROUP_PERCENT = {

    INTRADAY: 1.0 / 2.0 = 50%,

    DAILY:    1.0 / 2.0 = 50%

}

# =====================================================
# 📍 חלק 2 — אינדיקטורים לכל קבוצה (עם המשקלים)
# =====================================================

# המחלקה המקורית לא כללה פירוט — השלמות מחקריות בלבד.

# כל אינדיקטור מבוסס על מודלים סטנדרטיים בוול סטריט.

# -----------------------------------------------------
# ⭐ קבוצה 1 — SENTIMENT_INTRADAY
# -----------------------------------------------------
SENTIMENT_INTRADAY = {

    TICK_INDEX: {

        weight: 1.0,

        description: "NYSE Tick Summary – intraday buying/selling pressure",

        score_range:

            STRONG_POSITIVE: [4, 8],

            NEUTRAL:          [-1, +1],

            STRONG_NEGATIVE: [-8, -4]

    },

    VOLUME_IMBALANCE: {

        weight: 1.0,

        description: "Buy volume vs Sell volume imbalance",

        score_range:

            POSITIVE: [3, 6],

            NEGATIVE: [-6, -3],

            NEUTRAL:  [-1, +1]

    },

    OPTION_FLOW_INTRADAY: {

        weight: 0.8,

        description: "Short-term UOA heatmap direction",

        score_range:

            BULLISH: [2, 5],

            BEARISH: [-5, -2],

            NEUTRAL: [0]

    }

}

INTRADAY_WEIGHT_SUM = 1.0 + 1.0 + 0.8 = 2.8

INTRADAY_PERCENT = {

    TICK_INDEX:        1.0 / 2.8 = 35.7%,

    VOLUME_IMBALANCE:  1.0 / 2.8 = 35.7%,

    OPTION_FLOW_INTRADAY: 0.8 / 2.8 = 28.6%

}

# -----------------------------------------------------
# ⭐ קבוצה 2 — SENTIMENT_DAILY
# -----------------------------------------------------
SENTIMENT_DAILY = {

    VIX_SLOPE: {

        weight: 1.0,

        description: "Daily VIX trend slope (falling VIX = bullish bias)",

        score_range:

            BULLISH: [4, 8],

            BEARISH: [-8, -4],

            FLAT:    [-1, +1]

    },

    NEWS_SENTIMENT: {

        weight: 1.0,

        description: "Aggregated NLP score on company news",

        score_range:

            POSITIVE: [4, 8],

            NEGATIVE: [-8, -4],

            MIXED:    [-2, +2]

    }

}

DAILY_WEIGHT_SUM = 1.0 + 1.0 = 2.0

DAILY_PERCENT = {

    VIX_SLOPE:       1.0 / 2.0 = 50%,

    NEWS_SENTIMENT:  1.0 / 2.0 = 50%

}

# =====================================================
# 📍 חלק 3 — חישוב ציון תת-קבוצה
# =====================================================

# אינדיקטור בודד:

indicator_score =

    raw_score * indicator_weight

# קבוצה:

group_score =

    sum(indicator_scores) / sum(indicator_weights)

# משקל קבוצה בקומבינציה:

group_weighted_score = group_score * group_base_weight

# =====================================================
# 📍 חלק 4 — חישוב ציון Sentiment סופי
# =====================================================

sentiment_score =

(

    intraday_group_score   * 1.0 +

    daily_group_score      * 1.0

) / 2.0

sentiment_score ∈ [-10, +10]

# =====================================================
# 📍 חלק 5 — Impact Breakdown (תרומת אינדיקטורים למחלקה)
# =====================================================

SENTIMENT_FINAL_IMPACT = {

    # INTRADAY (50% מהמחלקה)

    TICK_INDEX:            50% * 35.7% = 17.85%,

    VOLUME_IMBALANCE:      50% * 35.7% = 17.85%,

    OPTION_FLOW_INTRADAY:  50% * 28.6% = 14.3%,

    # DAILY (50% מהמחלקה)

    VIX_SLOPE:             50% * 50% = 25%,

    NEWS_SENTIMENT:        50% * 50% = 25%

}

# =====================================================
# 📍 חלק 6 — הוראות Cursor ליישום
# =====================================================

- לשמור מודול זה כ-reference קבוע.

- ליישם indicator_weight, group_weight בדיוק לפי המסמך.

- אינדיקטורים בקבוצה אחת חייבים להיות normalized לפי משקלם.

- התוצאה הסופית sentiment_score חייבת להיות בטווח [-10, +10].

- אין לשנות/להוסיף אינדיקטורים ללא הוראה מפורשת.

- המחלקה משתלבת במאסטר כחלק מה-Layer הפנימי (לא משוקלל ישירות במאסטר).

