# FUNDAMENTALS SCORING — Full Scoring Specification

# מבוסס על הקבצים המקוריים + השלמות מקצועיות מבוססות שוק

# =====================================================
# 🏁 מטרת המחלקה
# =====================================================

Fundamentals Scoring בודק את איכות החברה ברמת עומק:

ערך, צמיחה, רווחיות, איתנות פיננסית, תזרים ופעילות דיבידנד.

המחלקה מפיקה ציון בטווח [-10, +10]  

תבסס על 6 קבוצות (Groups), שכל אחת מהן כוללת מספר אינדיקטורים.

המחלקה משמשת בסיס איכות לחברה —  

לא מושפעת מרעש יומי, אלא מייצגת ערך אמיתי.

# =====================================================
# 📍 חלק 1 — קבוצות יסוד + משקלי בסיס
# =====================================================

# משקלי הקבוצות כפי שמופיעים בקובץ:

FUNDAMENTALS_GROUP_WEIGHTS = {

    VALUATION:      1.1,

    GROWTH:         1.0,

    PROFITABILITY:  1.1,

    LEVERAGE:       0.9,

    CASH_FLOW:      1.0,

    DIVIDENDS:      0.6

}

TOTAL_GROUP_WEIGHT = 1.1 + 1.0 + 1.1 + 0.9 + 1.0 + 0.6 = 5.7

# משקל כל קבוצה במחלקה:

FUNDAMENTALS_GROUP_PERCENT = {

    VALUATION:      1.1 / 5.7 = 19.3%,

    GROWTH:         1.0 / 5.7 = 17.5%,

    PROFITABILITY:  1.1 / 5.7 = 19.3%,

    LEVERAGE:       0.9 / 5.7 = 15.8%,

    CASH_FLOW:      1.0 / 5.7 = 17.5%,

    DIVIDENDS:      0.6 / 5.7 = 10.5%

}

# =====================================================
# 📍 חלק 2 — אינדיקטורים בכל קבוצה (עם משקלים מדויקים)
# =====================================================

להלן המבנה הקנוני הכולל של כל קבוצת Fundamentals.

# -----------------------------------------------------
# ⭐ קבוצת 1 — VALUATION (משקל קבוצה 1.1)
# -----------------------------------------------------
VALUATION = {

    PE_PB_VALUATION: {

        weight: 1.0,

        description: "Composite valuation based on PE and PB deviations from peers.",

        score_range:

          CHEAP:        [6, 9],

          FAIR:         [1, 4],

          OVERVALUED:   [-6, -3],

    },

    PS_VALUATION: {

        weight: 0.8,

        description: "Price/Sales valuation normalized across industry.",

        score_range:

          CHEAP:        [3, 6],

          FAIR:         [1, 3],

          EXPENSIVE:    [-6, -2],

    }

}

VALUATION_WEIGHT_SUM = 1.0 + 0.8 = 1.8

# משקל אינדיקטורים בתוך הקבוצה:

VALUATION_PERCENT = {

    PE_PB_VALUATION: 1.0 / 1.8 = 55.6%,

    PS_VALUATION:    0.8 / 1.8 = 44.4%

}

# -----------------------------------------------------
# ⭐ קבוצת 2 — GROWTH (משקל קבוצה 1.0)
# -----------------------------------------------------
GROWTH = {

    EPS_GROWTH: {

        weight: 1.0,

        score_range:

          STRONG:   [6, 10],

          MEDIUM:   [3, 6],

          WEAK:     [-3, 0],

          NEGATIVE: [-6, -3]

    },

    REVENUE_GROWTH: {

        weight: 1.0,

        score_range:

          STRONG:   [6, 10],

          MEDIUM:   [3, 6],

          WEAK:     [-3, 0],

          NEGATIVE: [-6, -3]

    }

}

GROWTH_WEIGHT_SUM = 2.0

# -----------------------------------------------------
# ⭐ קבוצת 3 — PROFITABILITY (משקל קבוצה 1.1)
# -----------------------------------------------------
PROFITABILITY = {

    PROFIT_MARGIN: {

        weight: 1.0,

        score_range:

          STRONG: [6, 10],

          FAIR:   [2, 6],

          WEAK:   [-4, 0]

    },

    ROE: {

        weight: 1.1,

        score_range:

          STRONG: [6, 10],

          FAIR:   [3, 6],

          WEAK:   [-4, 0]

    }

}

PROFITABILITY_WEIGHT_SUM = 2.1

# -----------------------------------------------------
# ⭐ קבוצת 4 — LEVERAGE (משקל קבוצה 0.9)
# -----------------------------------------------------
LEVERAGE = {

    DEBT_TO_EQUITY: {

        weight: 1.0,

        score_range:

          LOW:        [4, 8],

          MEDIUM:     [1, 4],

          HIGH:       [-6, -3]

    },

    INTEREST_COVERAGE: {

        weight: 1.0,

        score_range:

          STRONG:  [4, 8],

          FAIR:    [1, 4],

          WEAK:    [-6, -3]

    }

}

LEVERAGE_WEIGHT_SUM = 2.0

# -----------------------------------------------------
# ⭐ קבוצת 5 — CASH FLOW (משקל קבוצה 1.0)
# -----------------------------------------------------
CASH_FLOW = {

    FREE_CASH_FLOW_YIELD: {

        weight: 1.0,

        score_range:

          STRONG: [6, 10],

          FAIR:   [2, 6],

          WEAK:   [-4, 0]

    }

}

CASH_FLOW_WEIGHT_SUM = 1.0

# -----------------------------------------------------
# ⭐ קבוצת 6 — DIVIDENDS (משקל קבוצה 0.6)
# -----------------------------------------------------
DIVIDENDS = {

    DIVIDEND_YIELD: {

        weight: 0.8,

        score_range:

          HIGH:     [4, 8],

          MEDIUM:   [1, 4],

          LOW:      [-4, 0]

    }

}

DIVIDENDS_WEIGHT_SUM = 0.8

# =====================================================
# 📍 חלק 3 — חישוב ציון תת-קבוצה
# =====================================================

# לכל אינדיקטור:

indicator_score =

    raw_score (from range)

    * indicator_weight

# ציון קבוצתי:

group_score =

    sum(indicators_weighted_scores) / sum(indicator_weights)

# ציון קבוצתי משוכלל:

group_weighted_score = group_score * group_base_weight

# =====================================================
# 📍 חלק 4 — חישוב ציון Fundamentals סופי
# =====================================================

fundamentals_score =

(

    valuation_group_score     * 1.1 +

    growth_group_score        * 1.0 +

    profitability_group_score * 1.1 +

    leverage_group_score      * 0.9 +

    cashflow_group_score      * 1.0 +

    dividends_group_score     * 0.6

) / 5.7

fundamentals_score ∈ [-10, +10]

# =====================================================
# 📍 חלק 5 — Final Impact (תרומת כל אינדיקטור למחלקה)
# =====================================================

# דוגמה מלאה (מחושבת בדיוק):

FINAL_IMPACT = {

  # VALUATION (19.3% מהמחלקה)

  PE_PB_VALUATION: 19.3% * 55.6% = 10.7%,

  PS_VALUATION:    19.3% * 44.4% = 8.6%,

  # GROWTH (17.5%)

  EPS_GROWTH:      17.5% * 50% = 8.8%,

  REVENUE_GROWTH:  17.5% * 50% = 8.8%,

  # PROFITABILITY (19.3%)

  PROFIT_MARGIN:   19.3% * 47.6% = 9.2%,

  ROE:             19.3% * 52.4% = 10.1%,

  # LEVERAGE (15.8%)

  DEBT_TO_EQUITY:       15.8% * 50% = 7.9%,

  INTEREST_COVERAGE:    15.8% * 50% = 7.9%,

  # CASH FLOW (17.5%)

  FREE_CASH_FLOW_YIELD: 17.5% * 100% = 17.5%,

  # DIVIDENDS (10.5%)

  DIVIDEND_YIELD:       10.5%

}

# =====================================================
# 📍 חלק 6 — הוראות Cursor ליישום
# =====================================================

- יש לאכוף את משקלי כל קבוצה ואינדיקטור בדיוק כפי שמופיעים כאן.

- group_weight ו-indicator_weight חייבים להיות 1:1 עם המסמך.

- לכל אינדיקטור יש לקבוע את score_range כפי שמוגדר.

- הנוסחאות הן מחייבות — אין להוסיף פילטרים או שינויים.

- התוצאה הסופית fundamentals_score חייבת להישאר בטווח [-10, +10].

- המחלקה משתלבת במאסטר במקטע:

    Master_Fundamentals_Contribution = fundamentals_score * internal_quality_weight

  (המשקל הפנימי ייקבע בהמשך בפרומפט Master בסוף).

