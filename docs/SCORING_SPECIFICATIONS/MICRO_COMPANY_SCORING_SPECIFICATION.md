# MICRO COMPANY SCORING — Full Scoring Specification

# מבוסס על הקבצים המקוריים של המערכת + השלמות מקצועיות היכן שחסר

# =====================================================
# 🏁 מטרת המחלקה
# =====================================================

Micro Company Scoring בודק את איכות ביצועי החברה והסיכונים הישירים שלה.

מדובר במחלקה "חדה" מאוד: הניקוד מחושב על בסיס אירועי חברה אמיתיים

כמו דוחות, דילול, שינוי הנהלה, Buybacks, רגולציה, משפטים ועוד.

ציון המחלקה נע בטווח [-10, +10].

לאחר מכן מוכפל במשקל המחלקה במאסטר — 0.12.

## מבנה המחלקה:

MicroCompany = {

    earnings_surprise,

    guidance_delta,

    dilution,

    buyback,

    management_event,

    legal_risk

}

כל פרמטר מקבל:

- משקל (weight)

- טווח נקודות בסיס (positive/negative)

- לוגיקת חישוב מדויקת

- השפעה סופית על ציון החברה

# =====================================================
# 📍 חלק 1 — טבלת הפרמטרים, המשקלים והניקודים
# =====================================================

# המידע הבא מופיע בקבצים שלך בצורה ישירה:

MICRO_WEIGHTS = {

    EARNINGS_SURPRISE: {

        positive: +5.0,

        negative: -6.0

    },

    GUIDANCE_DELTA: {

        positive: +3.0,

        negative: -4.0

    },

    DILUTION: {

        weight: -7.0

    },

    BUYBACK: {

        weight: +4.0

    },

    MANAGEMENT_EVENT: {

        positive: +5.0,

        negative: -5.0

    },

    LEGAL_RISK: {

        high:   -8.0,

        medium: -4.0

    }

}

# זהו סט המשקלים הקנוני של המחלקה.

# =====================================================
# 📍 חלק 2 — לוגיקת ניקוד מלאה לכל פרמטר
# =====================================================

# -----------------------------------------------------
# ⭐ 1. Earnings Surprise (positive / negative)
# -----------------------------------------------------
EARNINGS_SURPRISE = {

    inputs:

      - EPS_actual

      - EPS_expected

      - revenue surprise

      - margin surprise

    score_logic:

      - EPS beat + Revenue beat → +5

      - EPS miss + Revenue miss → -6

      - mixed → -2 to +3 depending on weighting

    score_range: [-6, +5]

}

# -----------------------------------------------------
# ⭐ 2. Guidance Delta (positive / negative)
# -----------------------------------------------------
GUIDANCE_DELTA = {

    inputs:

      - forward EPS guidance

      - revenue forecast

    score_logic:

      - guidance raised → +3

      - guidance cut → -4

      - inline → 0

    score_range: [-4, +3]

}

# -----------------------------------------------------
# ⭐ 3. Dilution (always negative)
# -----------------------------------------------------
DILUTION = {

    description:

      "Any equity raise, ATM offering, convertible notes, or share issuance.",

    inputs:

      - share_count_change

      - offering type

    score_logic:

      - any dilution event triggers score = -7

    score_range: [-7, -7]

}

# -----------------------------------------------------
# ⭐ 4. Buyback Program (always positive)
# -----------------------------------------------------
BUYBACK = {

    description:

      "Authorized share repurchase programs or expansions of existing buybacks.",

    inputs:

      - buyback size vs float

    score_logic:

      - new or expanded buyback → +4

    score_range: [+4, +4]

}

# -----------------------------------------------------
# ⭐ 5. Management Event (positive / negative)
# -----------------------------------------------------
MANAGEMENT_EVENT = {

    inputs:

      - CEO/CFO change

      - COO/CTO resignations

      - board restructuring

    score_logic:

      - strong hire / proven executive → +5

      - resignation under pressure → -5

    score_range: [-5, +5]

}

# -----------------------------------------------------
# ⭐ 6. Legal Risk (high / medium)
# -----------------------------------------------------
LEGAL_RISK = {

    inputs:

      - class actions

      - regulatory investigations

      - compliance issues

    score_logic:

      - high-risk events (SEC, DOJ, class action) → -8

      - medium-risk (ongoing litigation) → -4

    score_range: [-8, -4]

}

# =====================================================
# 📍 חלק 3 — נוסחת חישוב מלאה
# =====================================================

micro_raw_score =

(

    earnings_score +

    guidance_score +

    dilution_score +

    buyback_score +

    management_score +

    legal_score

)

# מנרמלים לטווח [-10, +10]:

micro_score = clamp(micro_raw_score, -10, +10)

# =====================================================
# 📍 חלק 4 — השפעה על מאסטר סקורינג
# =====================================================

master_contribution = micro_score * 0.12

# =====================================================
# 📍 חלק 5 — סיכום משקלים (Final Contribution Reference)
# =====================================================

FINAL_IMPACT = {

    EARNINGS_SURPRISE: max +-5/6 (strongest recurring event),

    GUIDANCE_DELTA:   max +-3/4,

    DILUTION:          -7 fixed,

    BUYBACK:           +4 fixed,

    MANAGEMENT_EVENT:  +-5,

    LEGAL_RISK:        -8 / -4

}

# הערה:

# זהו אחד המודולים היחידים שבו אין "group weights",

# אלא סכימת אירועים שמנורמלת ל־[-10, +10].

# =====================================================
# 📍 הוראות Cursor
# =====================================================

- יש לשמור מודול זה כ-reference קבוע.

- כאשר אתה בונה את קוד scoring:

    micro_score חייב להיות מחושב בדיוק לפי המשקלים והנוסחה המופיעים כאן.

- אין להוסיף או להוריד אירועים ללא הנחיה מפורשת.

- כל אירוע במיקרו מתייחס לחברה בלבד — ללא קשר לשוק/סקטור.

