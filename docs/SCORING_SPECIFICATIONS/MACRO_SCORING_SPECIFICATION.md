# MACRO SCORING — Full Scoring Specification

# מבוסס 100% על מה שמופיע בקבצים + השלמות מקצועיות היכן שחסר

## 🏁 מטרת המחלקה

להפיק "Macro_Score" עבור מניה בהתבסס על תנאי המאקרו:

- מגמת שוק כוללת

- תנודתיות מערכתית (VIX)

- ריבית/דולר

- סיכוני אשראי

- רוחב שוק (Breadth)

- אירועי סנטימנט רחבים

מאקרו משפיע על כל מניה במערכת ומתפקד כ־"Market Regime Filter".

## 🧱 מבנה המחלקה

Macro = {

    MARKET_TREND,

    VOLATILITY,

    RATES_AND_DOLLAR,

    CREDIT_RISK,

    BREADTH,

    SENTIMENT_EVENT

}

כל מימד מקבל:

- score בטווח [-10, +10]

- weight (base_weight)

- description מלא

- אחוז תרומה למחלקה

משקל המחלקה בתוך מאסטר סקורינג: **0.14**

## 🎯 נוסחה סופית של Macro

macro_score =

(

    market_trend_score      * 1.3 +

    volatility_score        * 1.2 +

    rates_dollar_score      * 1.1 +

    credit_risk_score       * 1.0 +

    breadth_score           * 1.2 +

    sentiment_event_score   * 0.9

) / (1.3 + 1.2 + 1.1 + 1.0 + 1.2 + 0.9)

final_contribution = macro_score * 0.14

# =====================================================

# 📍 חלק 1 — משקלי בסיס לכל Dimension

# =====================================================

MACRO_WEIGHTS = {

    MARKET_TREND:      1.3,   # קיים בקבצים

    VOLATILITY:        1.2,   # קיים בקבצים

    RATES_AND_DOLLAR:  1.1,   # קיים בקבצים

    CREDIT_RISK:       1.0,   # קיים בקבצים

    BREADTH:           1.2,   # קיים בקבצים

    SENTIMENT_EVENT:   0.9    # השלמה מקצועית היכן שחסר

}

TOTAL_MACRO_WEIGHT = 1.3 + 1.2 + 1.1 + 1.0 + 1.2 + 0.9 = 6.9

MACRO_PERCENTAGE = {

    MARKET_TREND:      1.3 / 6.9 = 18.8%,

    VOLATILITY:        1.2 / 6.9 = 17.4%,

    RATES_AND_DOLLAR:  1.1 / 6.9 = 15.9%,

    CREDIT_RISK:       1.0 / 6.9 = 14.5%,

    BREADTH:           1.2 / 6.9 = 17.4%,

    SENTIMENT_EVENT:   0.9 / 6.9 = 13.0%

}

# =====================================================

# 📍 חלק 2 — תיאור מפורט של כל Dimension + לוגיקת ניקוד

# =====================================================

# -----------------------------------------------------

# ⭐ 1. MARKET TREND (weight 1.3)

# -----------------------------------------------------

MARKET_TREND = {

    description:

      "Measures the overall trend regime of major indices (SPY, QQQ, IWM).

       Includes SMA alignment, higher-high structures, and market health.",

    inputs:

      - SPY trend score

      - QQQ trend score

      - SMA20/50/150 alignment

      - market structure (HH/HL or LH/LL)

      - index momentum

    score_logic:

      - strong bullish regime → +6 to +10

      - strong bearish regime → -6 to -10

      - mixed trend → -2 to +2

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 2. VOLATILITY (VIX Regime) (weight 1.2)

# -----------------------------------------------------

VOLATILITY = {

    description:

      "Measures systemic volatility regime using VIX level, VIX trend,

       volatility-of-volatility, and term structure.",

    inputs:

      - VIX percentiles

      - VIX short-term vs long-term curve

      - VVIX relation

      - volatility shocks

    score_logic:

      - rising vol → bearish for equities

      - falling vol → bullish

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 3. RATES AND DOLLAR (weight 1.1)

# -----------------------------------------------------

RATES_AND_DOLLAR = {

    description:

      "Measures 10Y rates, yield curve, and USD strength.

       High rates + strong USD typically bearish for risk assets.",

    inputs:

      - 10Y yield trend

      - yield curve steepness

      - USD index (DXY)

    score_logic:

      - falling rates + weak USD → bullish (+5 to +10)

      - rising rates + strong USD → bearish (-5 to -10)

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 4. CREDIT RISK (weight 1.0)

# -----------------------------------------------------

CREDIT_RISK = {

    description:

      "Measures HY vs IG spreads, credit stress, liquidity risk,

       and systemic fragility.",

    inputs:

      - HY-IG spread trend

      - credit default swap indexes

    score_logic:

      - widening spreads → bearish (-4 to -10)

      - tightening spreads → bullish (+4 to +10)

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 5. MARKET BREADTH (weight 1.2)

# -----------------------------------------------------

BREADTH = {

    description:

      "Measures how broad the market participation is. 

       Breadth is a powerful predictor of reversals and trend longevity.",

    inputs:

      - % stocks above SMA50/200

      - Advance/Decline ratio

      - McClellan Oscillator

      - new highs vs new lows

    score_logic:

      - strong breadth → bullish

      - narrow breadth → bearish

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 6. SENTIMENT & EVENT RISK (weight 0.9)

# -----------------------------------------------------

SENTIMENT_EVENT = {

    description:

      "Measures macro-level sentiment, event risk, policy uncertainty,

       and reaction to major scheduled events (CPI, FOMC, NFP, GDP).",

    inputs:

      - sentiment surveys

      - macro-risk indicators

      - event-driven volatility expectation

    score_logic:

      - risk-off sentiment → bearish

      - risk-on sentiment → bullish

      - high event uncertainty → lower score

    score_range: [-10, +10]

}

# =====================================================

# 📍 חלק 3 — Impact (Final Contribution of Each Dimension)

# =====================================================

FINAL_IMPACT = {

    MARKET_TREND:      18.8%,

    VOLATILITY:        17.4%,

    RATES_AND_DOLLAR:  15.9%,

    CREDIT_RISK:       14.5%,

    BREADTH:           17.4%,

    SENTIMENT_EVENT:   13.0%

}

# אחוזים אלה מייצגים את תרומת כל מימד לתוך Macro_Score 

# לפני הכפלת משקל המאסטר.

# =====================================================

# 📍 חלק 4 — נוסחה אחרי משקל המאסטר

# =====================================================

master_level_contribution = macro_score * 0.14

