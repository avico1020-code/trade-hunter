# POSITION RISK SCORING — Full Scoring Specification

# מבוסס על הקבצים המקוריים + השלמות מקצועיות ברמת Hedge Fund Risk Engine

# =====================================================
# 🏁 מטרת המחלקה
# =====================================================

Position Risk מודדת את סיכון הפוזיציה של המשתמש:

- סיכון חשבון (Account-Level)

- סיכון עסקה (Position-Level)

- סיכון חשיפה מצטברת (Exposure-Level)

מחלקה זו **לא שייכת למאסטר סקורינג**,  

אלא משמשת את מנוע הביצועים (Execution Engine) לקביעת:

- גודל פוזיציה

- Max risk per trade

- מניעת Overexposure

- מניעת קורלציה גבוה מדי בתיק

המחלקה מחזירה ציון normalized בטווח [-10, +10]  

שמתורגם ל־Risk Modifiers כגון:

- Position size multiplier

- Allowed entry flag

- Dynamic Stop-Level Adjustment

# =====================================================
# 📍 חלק 1 — קבוצות + משקלי בסיס
# =====================================================

POSITION_RISK_GROUP_WEIGHTS = {

    ACCOUNT_RISK:   1.2,

    POSITION_RISK:  1.1,

    EXPOSURE_RISK:  1.0

}

TOTAL_POSITION_RISK_WEIGHT = 1.2 + 1.1 + 1.0 = 3.3

POSITION_RISK_GROUP_PERCENT = {

    ACCOUNT_RISK:  1.2 / 3.3 = 36.4%,

    POSITION_RISK: 1.1 / 3.3 = 33.3%,

    EXPOSURE_RISK: 1.0 / 3.3 = 30.3%

}

# =====================================================
# 📍 חלק 2 — אינדיקטורים בכל קבוצה (עם משקלים)
# =====================================================

# -----------------------------------------------------
# ⭐ קבוצה 1 — ACCOUNT_RISK (משקל 1.2)
# -----------------------------------------------------
ACCOUNT_RISK = {

    DAILY_DRAWDOWN: {

        weight: 1.0,

        description: "Real-time % drawdown relative to start-of-day equity.",

        score_range:

          SAFE:        [3, 7],

          ELEVATED:    [-2, +2],

          CRITICAL:    [-8, -4]

    },

    CAPITAL_USAGE: {

        weight: 1.0,

        description: "% of portfolio capital currently deployed.",

        score_range:

          LOW_USAGE:    [3, 7],

          MEDIUM_USAGE: [0, 3],

          HIGH_USAGE:   [-6, -3]

    }

}

ACCOUNT_RISK_WEIGHT_SUM = 2.0

# משקל אינדיקטורים בקבוצה:

ACCOUNT_RISK_PERCENT = {

    DAILY_DRAWDOWN:  50%,

    CAPITAL_USAGE:   50%

}

# -----------------------------------------------------
# ⭐ קבוצה 2 — POSITION_RISK (משקל 1.1)
# -----------------------------------------------------
POSITION_RISK = {

    RISK_PER_TRADE: {

        weight: 1.1,

        description: "Actual risk amount per trade relative to allowed R% limit.",

        score_range:

          WITHIN_LIMIT: [3, 7],

          HIGH_RISK:    [-6, -3]

    },

    POSITION_PERFORMANCE_STRESS: {

        weight: 0.9,

        description: "Open unrealized P/L deviation vs backtested expected value.",

        score_range:

          POSITIVE: [2, 5],

          NEGATIVE: [-6, -3],

          STRESS:   [-8, -4]

    }

}

POSITION_RISK_WEIGHT_SUM = 1.1 + 0.9 = 2.0

POSITION_RISK_PERCENT = {

    RISK_PER_TRADE:              1.1 / 2.0 = 55%,

    POSITION_PERFORMANCE_STRESS: 0.9 / 2.0 = 45%

}

# -----------------------------------------------------
# ⭐ קבוצה 3 — EXPOSURE_RISK (משקל 1.0)
# -----------------------------------------------------
EXPOSURE_RISK = {

    SYMBOL_EXPOSURE: {

        weight: 1.0,

        description: "% of capital allocated to a single symbol.",

        score_range:

          LOW:  [2, 6],

          HIGH: [-6, -3]

    },

    SECTOR_EXPOSURE: {

        weight: 1.0,

        description: "% exposure to a specific sector relative to portfolio.",

        score_range:

          BALANCED: [2, 6],

          OVEREXPOSED: [-6, -3]

    },

    CORRELATED_EXPOSURE: {

        weight: 1.1,

        description: "Correlation matrix exposure (2+ correlated names).",

        score_range:

          SAFE: [3, 7],

          RISKY: [-7, -4]

    },

    OPEN_POSITIONS_COUNT: {

        weight: 0.8,

        description: "Number of open positions compared to allowed max.",

        score_range:

          FEW_POSITIONS: [1, 4],

          TOO_MANY:      [-5, -2]

    }

}

EXPOSURE_RISK_WEIGHT_SUM = 1.0 + 1.0 + 1.1 + 0.8 = 3.9

EXPOSURE_RISK_PERCENT = {

    SYMBOL_EXPOSURE:       1.0 / 3.9 = 25.6%,

    SECTOR_EXPOSURE:       1.0 / 3.9 = 25.6%,

    CORRELATED_EXPOSURE:   1.1 / 3.9 = 28.2%,

    OPEN_POSITIONS_COUNT:  0.8 / 3.9 = 20.5%

}

# =====================================================
# 📍 חלק 3 — נוסחת חישוב ציון קבוצתי
# =====================================================

# אינדיקטור בודד:

indicator_score = raw_score * indicator_weight

# קבוצה:

group_score =

    sum(indicator_score) / sum(indicator_weights)

# קבוצה משוקללת:

group_weighted_score =

    group_score * group_base_weight

# =====================================================
# 📍 חלק 4 — ציון Position Risk סופי
# =====================================================

position_risk_score =

(

    account_risk_score    * 1.2 +

    position_risk_score   * 1.1 +

    exposure_risk_score   * 1.0

) / 3.3

position_risk_score ∈ [-10, +10]

# =====================================================
# 📍 חלק 5 — Impact Breakdown (תרומת כל אינדיקטור למחלקה)
# =====================================================

POSITION_RISK_FINAL_IMPACT = {

    # ACCOUNT (36.4%)

    DAILY_DRAWDOWN:   36.4% * 50% = 18.2%,

    CAPITAL_USAGE:    36.4% * 50% = 18.2%,

    # POSITION (33.3%)

    RISK_PER_TRADE:              33.3% * 55% = 18.3%,

    POSITION_PERFORMANCE_STRESS: 33.3% * 45% = 15.0%,

    # EXPOSURE (30.3%)

    SYMBOL_EXPOSURE:       30.3% * 25.6% = 7.76%,

    SECTOR_EXPOSURE:       30.3% * 25.6% = 7.76%,

    CORRELATED_EXPOSURE:   30.3% * 28.2% = 8.55%,

    OPEN_POSITIONS_COUNT:  30.3% * 20.5% = 6.22%

}

# =====================================================
# 📍 חלק 6 — הוראות Cursor לביצוע
# =====================================================

- לשמור מחלקה זו כ-reference engine קבוע.

- יש להשתמש במשקלים והנוסחאות כפי שהוגדרו ללא שינוי.

- Position Risk משפיע על Execution Engine בלבד:

    * position_size_multiplier

    * stop_distance_modifier

    * allow_entry flag

- אסור לשלב מחלקה זו בתוך Master Scoring.

- אסור להוסיף אינדיקטורים ללא הנחיה מפורשת.

