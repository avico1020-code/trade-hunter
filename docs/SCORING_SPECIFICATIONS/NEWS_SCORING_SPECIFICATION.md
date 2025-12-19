# NEWS SCORING — Full Scoring Specification

# מבוסס על מבנה הקבצים + השלמות מקצועיות לפי סטנדרטים של מערכות חדשות מסחריות

# =====================================================
# 🏁 מטרת המחלקה
# =====================================================

News Scoring מודד את השפעת החדשות על המניה, על הסקטור, ועל השוק כולו.

הוא מתרגם תוכן חדשותי לניקוד מספרי בין ‎-10‎ ל‎+10‎, לפי ארבע קטגוריות-על:

1. MARKET_MACRO       — חדשות שמשפיעות על כל השוק

2. SECTOR_MACRO       — חדשות שמשפיעות על סקטור שלם

3. MICRO_GLOBAL       — חדשות ברמת תעשייה/גלובלית

4. MICRO_COMPANY      — חדשות ברמת החברה הספציפית

כל חדשה מקבלת:

- סוג (type)

- עוצמה (impact level)

- הטיה (direction: bullish/bearish)

- ניקוד בסיס

- משקל לפי קטגוריה

המחלקה מוזנת למאסטר סקור עם משקל **0.22**.

# =====================================================
# 📍 חלק 1 — מבנה כללי של המערכת
# =====================================================

NEWS = {

    MARKET_MACRO:  [...],

    SECTOR_MACRO:  [...],

    MICRO_GLOBAL:  [...],

    MICRO_COMPANY: [...]

}

news_score = weighted_sum(all_news) normalized to [-10, +10]

final_contribution = news_score * 0.22

# =====================================================
# 📍 חלק 2 — משקלי קטגוריות-על (Category Base Weights)
# =====================================================

# הערה: בקבצים שלך אין משקלים קשיחים לקבוצות — הם מחושבים לפי סוג החדשה.

# כאן נקבעים "תקרות" מקצועיות שמכוונות את הבינה באופן עקבי.

CATEGORY_BASE_WEIGHTS = {

    MARKET_MACRO:   1.2,   # חדשות שמשפיעות על שוק מלא = הכי משפיע

    SECTOR_MACRO:   1.0,   # חדשות שמשפיעות על סקטור

    MICRO_GLOBAL:   0.8,   # חדשות גלובליות/תעשייתיות

    MICRO_COMPANY:  1.1    # חדשות ברמת החברה – גבוהות מאוד

}

# משקל זה מוכפל ב-impact level (Low/Medium/High)

# =====================================================
# 📍 חלק 3 — טבלת סוגי חדשות מלאות + ניקוד בסיס
# =====================================================

# -----------------------------------------
# ⭐ MARKET_MACRO NEWS
# -----------------------------------------
MARKET_MACRO_TYPES = {

    FED_RATE_HIKE: {
        direction: bearish,
        base_score: -9,
        description: "FOMC raises interest rates more than expected."
    },

    FED_RATE_CUT: {
        direction: bullish,
        base_score: +7,
        description: "FOMC cuts rates or signals dovish path."
    },

    INFLATION_REPORT_HOT: {
        direction: bearish,
        base_score: -8,
        description: "CPI/PPI hotter than expected."
    },

    INFLATION_REPORT_COOLING: {
        direction: bullish,
        base_score: +6,
        description: "CPI/PPI cooling, disinflation trend."
    },

    JOBS_REPORT_STRONG: {
        direction: bullish,
        base_score: +4,
        description: "NFP beat with stable wages."
    },

    JOBS_REPORT_WEAK: {
        direction: bearish,
        base_score: -5,
        description: "Weak NFP or rising unemployment."
    },

    GDP_MISS: {
        direction: bearish,
        base_score: -6
    },

    GDP_BEAT: {
        direction: bullish,
        base_score: +5
    },

    GEOPOLITICAL_TENSION: {
        direction: bearish,
        base_score: -7
    },

    GEOPOLITICAL_DEESCALATION: {
        direction: bullish,
        base_score: +4
    }

}

# -----------------------------------------
# ⭐ SECTOR_MACRO NEWS
# -----------------------------------------
SECTOR_MACRO_TYPES = {

    SECTOR_UPGRADE: {
        direction: bullish,
        base_score: +4,
        description: "Analyst upgrade on a whole sector (XLK, XLE, XLF, etc.)"
    },

    SECTOR_DOWNGRADE: {
        direction: bearish,
        base_score: -4
    },

    INDUSTRY_REPORT_POSITIVE: {
        direction: bullish,
        base_score: +3
    },

    INDUSTRY_REPORT_NEGATIVE: {
        direction: bearish,
        base_score: -3
    },

    REGULATION_POSITIVE: {
        direction: bullish,
        base_score: +3
    },

    REGULATION_NEGATIVE: {
        direction: bearish,
        base_score: -5
    }

}

# -----------------------------------------
# ⭐ MICRO_GLOBAL NEWS
# -----------------------------------------
MICRO_GLOBAL_TYPES = {

    M_AND_A_POSITIVE: {
        direction: bullish,
        base_score: +5,
        description: "Industry-level M&A that lifts the entire sector."
    },

    M_AND_A_NEGATIVE: {
        direction: bearish,
        base_score: -5
    },

    SUPPLY_CHAIN_POSITIVE: {
        direction: bullish,
        base_score: +3
    },

    SUPPLY_CHAIN_NEGATIVE: {
        direction: bearish,
        base_score: -4
    },

    INDUSTRY_PRICE_INCREASE: {
        direction: bullish,
        base_score: +4
    },

    INDUSTRY_PRICE_COLLAPSE: {
        direction: bearish,
        base_score: -5
    }

}

# -----------------------------------------
# ⭐ MICRO_COMPANY NEWS
# -----------------------------------------
MICRO_COMPANY_TYPES = {

    EARNINGS_BEAT: {
        direction: bullish,
        base_score: +8
    },

    EARNINGS_MISS: {
        direction: bearish,
        base_score: -8
    },

    GUIDANCE_UP: {
        direction: bullish,
        base_score: +6
    },

    GUIDANCE_DOWN: {
        direction: bearish,
        base_score: -7
    },

    BUYBACK_ANNOUNCEMENT: {
        direction: bullish,
        base_score: +5
    },

    DILUTION_EVENT: {
        direction: bearish,
        base_score: -7
    },

    MANAGEMENT_CHANGE_POSITIVE: {
        direction: bullish,
        base_score: +5
    },

    MANAGEMENT_CHANGE_NEGATIVE: {
        direction: bearish,
        base_score: -5
    },

    PRODUCT_LAUNCH_SUCCESSFUL: {
        direction: bullish,
        base_score: +4
    },

    PRODUCT_LAUNCH_FAILED: {
        direction: bearish,
        base_score: -5
    },

    LEGAL_RISK_HIGH: {
        direction: bearish,
        base_score: -8
    },

    LEGAL_RISK_MEDIUM: {
        direction: bearish,
        base_score: -4
    },

    ANALYST_UPGRADE: {
        direction: bullish,
        base_score: +4
    },

    ANALYST_DOWNGRADE: {
        direction: bearish,
        base_score: -4
    }

}

# =====================================================
# 📍 חלק 4 — מנגנון ניקוד משולב
# =====================================================

# לכל חדשה יש:

# - base_score

# - direction (bullish/bearish)

# - impact_level (Low=0.5, Medium=1.0, High=1.5)

# - category_base_weight

# ניקוד חדשה:

news_item_score =
    base_score
    * direction_multiplier   # +1 ללונג, -1 לשורט
    * impact_level
    * category_base_weight

# לדוגמה:

# Earnings Miss (base -8), High impact, company-level:

# news_item_score = -8 * 1.5 * 1.1 = -13.2 (נחתך ל־ -10)

# לאחר מכן:

news_score = clamp( sum(all_news_scores), -10, +10 )

# =====================================================
# 📍 חלק 5 — השפעה על המאסטר
# =====================================================

master_contribution = news_score * 0.22

