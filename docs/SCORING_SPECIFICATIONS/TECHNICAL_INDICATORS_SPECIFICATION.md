# TECHNICAL INDICATORS — Full Scoring Specification

# המחלקה מוגדרת על פי rulebooks + השלמות מקצועיות היכן שחסר בקובץ

## 🏁 מטרת המחלקה

לחשב ציון "Technical_Score" עבור מניה, על בסיס אינדיקטורים טכניים 

ב־5 קבוצות (Momentum, Trend, Volume, Volatility, Price Action),  

כאשר כל אינדיקטור מקבל:

1. ניקוד (score) בתחום מוגדר (בד"כ -10 עד +10)

2. משקל (indicator_weight)

3. הקבוצה עצמה מקבלת משקל בסיס (group_base_weight)

4. הציון הסופי של המחלקה הוא ממוצע משוקלל של כל הקבוצות.

## 🧱 מבנה כללי

Technical = {

    MOMENTUM: {RSI, MACD},

    TREND: {MOVING_AVERAGE_ALIGNMENT},

    VOLUME: {VOLUME_SURGE, VWAP_DISTANCE},

    VOLATILITY: {ATR, BOLLINGER_POSITION},

    PRICE_ACTION: {

        STRUCTURE, REVERSAL, CONTINUATION, 

        LEVEL_REACTION, GAPS, CANDLES

    }

}

## 🎯 נוסחה סופית למחלקת Technical

technical_score =

(

  momentum_score   * 1.0 +

  trend_score      * 1.0 +

  volume_score     * 1.1 +

  volatility_score * 0.8 +

  price_action_score * 1.2

) / (1.0 + 1.0 + 1.1 + 0.8 + 1.2)

# ציון זה יוזן למאסטר סקורינג עם משקל 0.26

final_contribution = technical_score * 0.26

# =====================================================

# 📍 חלק 1 — קבוצות + משקלי בסיס (Group Base Weights)

# =====================================================

GROUP_WEIGHTS = {

    MOMENTUM:     1.0,

    TREND:        1.0,

    VOLUME:       1.1,

    VOLATILITY:   0.8,

    PRICE_ACTION: 1.2

}

TOTAL_GROUP_WEIGHT = 1.0 + 1.0 + 1.1 + 0.8 + 1.2 = 5.1

# אחוז תרומה כל קבוצה בתוך המחלקה (לפני אינדיקטורים)

GROUP_PERCENTAGE = {

    MOMENTUM:     1.0 / 5.1 = 19.6%,

    TREND:        1.0 / 5.1 = 19.6%,

    VOLUME:       1.1 / 5.1 = 21.6%,

    VOLATILITY:   0.8 / 5.1 = 15.7%,

    PRICE_ACTION: 1.2 / 5.1 = 23.5%

}

# =====================================================

# 📍 חלק 2 — אינדיקטורים בכל קבוצה + משקל אינדיקטור

# =====================================================

# -----------------------------------------------------

# ⭐ MOMENTUM GROUP

# -----------------------------------------------------

MOMENTUM_INDICATORS = {

    RSI: {

        weight: 1.0,

        description: "Overbought/Oversold, Divergences, Intraday behavior",

        score_range: [-10, +10]

    },

    MACD: {

        weight: 1.2,

        description: "MACD crossovers, histogram expansion, trend confirmation",

        score_range: [-10, +10]

    }

}

MOMENTUM_WEIGHT_SUM = 1.0 + 1.2 = 2.2

MOMENTUM_PERCENTAGE = {

    RSI:  1.0 / 2.2 = 45.5%,

    MACD: 1.2 / 2.2 = 54.5%

}

# תרומה למחלקה:

RSI total impact     = 45.5% * 19.6% = 8.91%

MACD total impact    = 54.5% * 19.6% = 10.67%

# -----------------------------------------------------

# ⭐ TREND GROUP

# -----------------------------------------------------

TREND_INDICATORS = {

    MOVING_AVERAGE_ALIGNMENT: {

        weight: 1.0,

        description: "Alignment of SMA9, SMA20, SMA50, SMA150; Golden/Death Cross",

        score_range: [-10, +10]

    }

}

TREND_PERCENTAGE = 100%

MOVING_AVERAGE_ALIGNMENT total impact = 19.6%

# -----------------------------------------------------

# ⭐ VOLUME GROUP

# -----------------------------------------------------

VOLUME_INDICATORS = {

    VOLUME_SURGE: {

        weight: 1.0,

        description: "Unusual volume vs average, acceleration pattern",

        score_range: [-10, +10]

    },

    VWAP_DISTANCE: {

        weight: 1.1,

        description: "Position relative to VWAP; VWAP reclaim/reject",

        score_range: [-10, +10]

    }

}

VOLUME_WEIGHT_SUM = 1.0 + 1.1 = 2.1

VOLUME_PERCENTAGE = {

    VOLUME_SURGE: 1.0 / 2.1 = 47.6%,

    VWAP_DISTANCE: 1.1 / 2.1 = 52.4%

}

# תרומה למחלקה:

VOLUME_SURGE impact   = 47.6% * 21.6% = 10.29%

VWAP_DISTANCE impact  = 52.4% * 21.6% = 11.31%

# -----------------------------------------------------

# ⭐ VOLATILITY GROUP

# -----------------------------------------------------

VOLATILITY_INDICATORS = {

    ATR: {

        weight: 0.8,

        description: "Average True Range trend, expansion, compression",

        score_range: [-10, +10]

    },

    BOLLINGER_POSITION: {

        weight: 1.0,

        description: "Distance from Bollinger bands, squeeze breakout",

        score_range: [-10, +10]

    }

}

VOLATILITY_WEIGHT_SUM = 0.8 + 1.0 = 1.8

VOLATILITY_PERCENTAGE = {

    ATR: 0.8 / 1.8 = 44.4%,

    BOLLINGER_POSITION: 1.0 / 1.8 = 55.6%

}

# תרומה למחלקה:

ATR impact          = 44.4% * 15.7% = 6.96%

BOLLINGER impact    = 55.6% * 15.7% = 8.73%

# -----------------------------------------------------

# ⭐ PRICE ACTION GROUP

# -----------------------------------------------------

PRICE_ACTION_INDICATORS = {

    STRUCTURE: {

        weight: 1.0,

        description: "HH/HL, LH/LL, structural phases",

        score_range: [-10, +10]

    },

    REVERSAL: {

        weight: 1.2,

        description: "Double Top/Bottom, H&S, Pivot reversals",

        score_range: [-10, +10]

    },

    CONTINUATION: {

        weight: 0.9,

        description: "Flags, pennants, triangles",

        score_range: [-10, +10]

    },

    LEVEL_REACTION: {

        weight: 1.1,

        description: "Reaction to supply/demand zones, support/resistance",

        score_range: [-10, +10]

    },

    GAPS: {

        weight: 1.0,

        description: "Gap up/down, gap-fill, continuation gaps",

        score_range: [-10, +10]

    },

    CANDLES: {

        weight: 0.8,

        description: "Individual candle patterns (engulfing, hammer, doji)",

        score_range: [-10, +10]

    }

}

PA_WEIGHT_SUM = 1.0 + 1.2 + 0.9 + 1.1 + 1.0 + 0.8 = 6.0

PRICE_ACTION_PERCENTAGE = {

    STRUCTURE:      1.0/6.0 = 16.7%,

    REVERSAL:       1.2/6.0 = 20.0%,

    CONTINUATION:   0.9/6.0 = 15.0%,

    LEVEL_REACTION: 1.1/6.0 = 18.3%,

    GAPS:           1.0/6.0 = 16.7%,

    CANDLES:        0.8/6.0 = 13.3%

}

# תרומה מלאה למחלקה (price action group = 23.5%):

STRUCTURE impact      = 16.7% * 23.5% = 3.92%

REVERSAL impact       = 20.0% * 23.5% = 4.70%

CONTINUATION impact   = 15.0% * 23.5% = 3.52%

LEVEL_REACTION impact = 18.3% * 23.5% = 4.30%

GAPS impact           = 16.7% * 23.5% = 3.92%

CANDLES impact        = 13.3% * 23.5% = 3.13%

# =====================================================

# 📍 PART 3 — Summary Table (Final Contribution per Indicator)

# =====================================================

# MOMENTUM

RSI               = 8.91%

MACD              = 10.67%

# TREND

MOVING_AVERAGE_ALIGNMENT = 19.6%

# VOLUME

VOLUME_SURGE      = 10.29%

VWAP_DISTANCE     = 11.31%

# VOLATILITY

ATR               = 6.96%

BOLLINGER_POSITION = 8.73%

# PRICE ACTION

STRUCTURE         = 3.92%

REVERSAL          = 4.70%

CONTINUATION      = 3.52%

LEVEL_REACTION    = 4.30%

GAPS              = 3.92%

CANDLES           = 3.13%

