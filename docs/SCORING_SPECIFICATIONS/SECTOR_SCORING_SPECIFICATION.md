# SECTOR SCORING — Full Scoring Specification

# מבוסס על הנתונים מהקבצים + השלמות מקצועיות מדויקות במקום שחסר

## 🏁 מטרת המחלקה

להפיק "Sector_Score" עבור מניה באמצעות ניתוח:

- ביצועי ה-ETF הסקטוריאלי

- מומנטום סקטור

- מגמת סקטור

- תנודתיות סקטור

- חוזק יחסי מול SPY/QQQ

- סיבובי הון (Rotation)

המחלקה מתפקדת כ"מסנן הקשר" —  

האם הסקטור בו מניה נמצאת תומך בטרייד או מתנגד לו.

## 🧱 מבנה המחלקה

Sector = {

    SECTOR_TREND,

    RELATIVE_STRENGTH,

    SECTOR_MOMENTUM,

    SECTOR_VOLATILITY,

    SECTOR_ROTATION

}

כל Dimension מקבל:

- score בטווח [-10, +10]

- weight (base_weight)

- אחוז תרומה למחלקה

משקל המחלקה בתוך Master Scoring: **0.14**

## 🎯 נוסחה סופית של Sector

sector_score =

(

    sector_trend_score        * 1.3 +

    relative_strength_score   * 1.2 +

    momentum_score            * 1.1 +

    volatility_score          * 0.9 +

    rotation_score            * 1.0

) / (1.3 + 1.2 + 1.1 + 0.9 + 1.0)

final_contribution = sector_score * 0.14

# =====================================================

# 📍 חלק 1 — משקלי בסיס לכל Dimension

# =====================================================

SECTOR_WEIGHTS = {

    SECTOR_TREND:        1.3,   # מוגדר בקבצים

    RELATIVE_STRENGTH:   1.2,   # מוגדר בקבצים

    SECTOR_MOMENTUM:     1.1,   # מוגדר בקבצים

    SECTOR_VOLATILITY:   0.9,   # מוגדר בקבצים

    SECTOR_ROTATION:     1.0    # מוגדר בקבצים

}

TOTAL_SECTOR_WEIGHT = 1.3 + 1.2 + 1.1 + 0.9 + 1.0 = 5.5

SECTOR_PERCENTAGE = {

    SECTOR_TREND:        1.3 / 5.5 = 23.6%,

    RELATIVE_STRENGTH:   1.2 / 5.5 = 21.8%,

    SECTOR_MOMENTUM:     1.1 / 5.5 = 20.0%,

    SECTOR_VOLATILITY:   0.9 / 5.5 = 16.4%,

    SECTOR_ROTATION:     1.0 / 5.5 = 18.2%

}

# =====================================================

# 📍 חלק 2 — תיאור מפורט של כל Dimension + לוגיקת ניקוד

# =====================================================

# -----------------------------------------------------

# ⭐ 1. SECTOR TREND (weight 1.3)

# -----------------------------------------------------

SECTOR_TREND = {

    description:

      "Analyzes the direction and health of the sector ETF (e.g., XLK, XLF, XLE, XLY).

       Measures structural trend, moving averages, and trend momentum.",

    inputs:

      - SMA20/50/150 alignment

      - price location vs 52-week structure

      - HH/HL or LH/LL structure

      - trend acceleration/deceleration

    score_logic:

      - strong uptrend → +7 to +10

      - strong downtrend → -7 to -10

      - sideways → -2 to +2

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 2. RELATIVE STRENGTH vs SPY/QQQ (weight 1.2)

# -----------------------------------------------------

RELATIVE_STRENGTH = {

    description:

      "Measures relative performance of the sector vs major indices.

       A sector outperforming SPY/QQQ is a strong positive signal.",

    inputs:

      - sector/SPY ratio

      - sector/QQQ ratio

      - rolling outperformance trend

    score_logic:

      - strong relative outperformance → +6 to +10

      - strong underperformance → -6 to -10

      - neutral → -2 to +2

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 3. SECTOR MOMENTUM (weight 1.1)

# -----------------------------------------------------

SECTOR_MOMENTUM = {

    description:

      "Momentum within the sector ETF. Measures velocity, acceleration,

       and buying/selling pressure unique to the sector.",

    inputs:

      - RSI (sector)

      - MACD histogram (sector)

      - sector momentum bursts

      - volume-adjusted momentum

    score_logic:

      - high momentum with trend alignment → bullish (+5 to +10)

      - negative momentum → bearish (-5 to -10)

      - weak momentum → -1 to +1

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 4. SECTOR VOLATILITY (weight 0.9)

# -----------------------------------------------------

SECTOR_VOLATILITY = {

    description:

      "Measures sector volatility regime using ATR, historical volatility,

       and volatility breakouts.",

    inputs:

      - ATR trend (sector)

      - volatility compression/expansion

    score_logic:

      - high volatility in downtrend → bearish

      - decreasing volatility in uptrend → bullish

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 5. SECTOR ROTATION (weight 1.0)

# -----------------------------------------------------

SECTOR_ROTATION = {

    description:

      "Tracks capital rotation into/out of the sector.

       If institutions rotate into the sector — the sector becomes favored.",

    inputs:

      - flows into sector ETFs

      - rotation heatmaps

      - cross-sector correlation shifts

    score_logic:

      - strong inflow → +5 to +10

      - strong outflow → -5 to -10

      - neutral flow → 0

    score_range: [-10, +10]

}

# =====================================================

# 📍 חלק 3 — Impact (Final Contribution of Each Dimension)

# =====================================================

FINAL_IMPACT = {

    SECTOR_TREND:        23.6%,

    RELATIVE_STRENGTH:   21.8%,

    SECTOR_MOMENTUM:     20.0%,

    SECTOR_VOLATILITY:   16.4%,

    SECTOR_ROTATION:     18.2%

}

# הערה:

# ערכים אלו הם התרומה של כל Dimension בתוך המחלקה,

# לפני הכפלת משקל המאסטר.

# =====================================================

# 📍 חלק 4 — נוסחה אחרי משקל המאסטר

# =====================================================

master_level_contribution = sector_score * 0.14

