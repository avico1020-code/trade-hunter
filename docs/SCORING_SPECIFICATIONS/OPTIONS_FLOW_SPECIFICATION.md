# OPTIONS FLOW — Full Scoring Specification

# מבוסס על הנתונים מתוך הקבצים + השלמות מקצועיות היכן שחסר בקובץ

## 🏁 מטרת המחלקה

להפיק ציון "Options_Flow_Score" עבור מניה בהתבסס על כל האותות שמגיעים

משוק האופציות — כולל פעילות חריגה, שינויים במבנה OI, IV, skew וגאמה.

מחלקה זו מודדת:

1. האם יש "Smart Money Flow"

2. האם יש פעילות חריגה ביחס לנורמה

3. האם דילרים דוחפים/מושכים מחיר

4. האם האינדיקטורים תומכים בלונג/שורט

## 🧱 מבנה כללי

OptionsFlow = {

    PUT_CALL_IMBALANCE,

    UOA,

    OPEN_INTEREST_BUILDUP,

    IV_CHANGE,

    SKEW,

    GAMMA_EXPOSURE

}

כל אינדיקטור מקבל:

- score בטווח [-10, +10]

- indicator_weight

- formula base

- כל המחלקה מקבלת משקל במאסטר סקורינג = 0.12

## 🎯 נוסחה סופית למחלקה

options_flow_score =

(

    put_call_score        * 1.0 +

    uoa_score             * 1.2 +

    open_interest_score    * 0.9 +

    iv_change_score       * 1.0 +

    skew_score            * 0.9 +

    gamma_score           * 1.1

) / (1.0 + 1.2 + 0.9 + 1.0 + 0.9 + 1.1)

final_contribution = options_flow_score * 0.12

# =====================================================

# 📍 חלק 1 — משקלי בסיס לכל אינדיקטור (indicator weights)

# =====================================================

OPTIONS_FLOW_WEIGHTS = {

    PUT_CALL_IMBALANCE:     1.0,   # קיים בקבצים כמקור מרכזי

    UOA:                    1.2,   # פעילות חריגה היא הסיגנל החשוב ביותר

    OPEN_INTEREST_BUILDUP:  0.9,   # שינוי מבנה פוזיציות

    IV_CHANGE:              1.0,   # תנודתיות מרומזת

    SKEW:                   0.9,   # חלוקת סיכונים בין calls/puts

    GAMMA_EXPOSURE:         1.1    # מכתיב דחיפה/בלימה של מחיר

}

TOTAL_OPTIONS_WEIGHT = 1.0 + 1.2 + 0.9 + 1.0 + 0.9 + 1.1 = 6.1

# אחוז לכל אינדיקטור בתוך המחלקה (לפני משקל מאסטר)

OPTIONS_PERCENTAGE = {

    PUT_CALL_IMBALANCE:   1.0 / 6.1 = 16.4%,

    UOA:                  1.2 / 6.1 = 19.7%,

    OPEN_INTEREST_BUILDUP:0.9 / 6.1 = 14.8%,

    IV_CHANGE:            1.0 / 6.1 = 16.4%,

    SKEW:                 0.9 / 6.1 = 14.8%,

    GAMMA_EXPOSURE:       1.1 / 6.1 = 18.0%

}

# =====================================================

# 📍 חלק 2 — תיאור מפורט של כל אינדיקטור + score logic

# =====================================================

# -----------------------------------------------------

# ⭐ 1. PUT / CALL IMBALANCE (weight 1.0)

# -----------------------------------------------------

PUT_CALL_IMBALANCE = {

    description: 

      "Measures imbalance between Put volume/OI and Call volume/OI. 

       Reflects hedging pressure, downside protection demand or upside speculation.",

    inputs:

      - put_volume

      - call_volume

      - put_OI

      - call_OI

      - normalized_ratios

    score_logic:

      - put_call_ratio > 1.5 → strongly bearish (score -7 to -10)

      - put_call_ratio < 0.7 → strongly bullish (score +7 to +10)

      - moderate imbalance → ±1 to ±5

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 2. UOA — Unusual Options Activity (weight 1.2)

# -----------------------------------------------------

UOA = {

    description:

      "Detects large sweeps, large blocks, multi-sweep clusters, 

       and aggressive OTM buying beyond statistical norms.",

    inputs:

      - sweep_notional

      - sweep_count

      - relative_volume_vs_30d

      - OTM_distance

      - time_cluster_heat

    score_logic:

      - large bullish sweeps → +6 to +10

      - large bearish sweeps → -6 to -10

      - no unusual activity → 0

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 3. OPEN INTEREST BUILDUP (weight 0.9)

# -----------------------------------------------------

OPEN_INTEREST_BUILDUP = {

    description:

      "Identifies whether traders build long-term positioning at important strikes.",

    inputs:

      - OI_change_per_strike

      - call_OI_build

      - put_OI_build

      - delta clustering

    score_logic:

      - heavy call-side buildup → +3 to +8

      - heavy put-side buildup → -3 to -8

      - mixed OI → 0

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 4. IV CHANGE (weight 1.0)

# -----------------------------------------------------

IV_CHANGE = {

    description:

      "Measures IV expansion, crush, volatility shocks, and unexpected repricing.",

    inputs:

      - IV_1d_change

      - IV_percentile

      - IV_hv_spread

    score_logic:

      - IV expansion → bullish or bearish depending on skew direction

      - IV crush → typically post-earnings bearish for option buyers

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 5. SKEW (weight 0.9)

# -----------------------------------------------------

SKEW = {

    description:

      "Measures relative pricing between puts and calls; detects protection demand.",

    inputs:

      - put_iv

      - call_iv

      - skew_slope

    score_logic:

      - heavy downside skew → bearish pressure (-4 to -8)

      - call-side skew → bullish (+4 to +8)

    score_range: [-10, +10]

}

# -----------------------------------------------------

# ⭐ 6. GAMMA EXPOSURE (weight 1.1)

# -----------------------------------------------------

GAMMA_EXPOSURE = {

    description:

      "Dealer gamma regime: positive gamma stabilizes price; 

       negative gamma amplifies volatility and directionality.",

    inputs:

      - dealer_gamma

      - gamma_notional

      - gamma_flip_level

    score_logic:

      - positive gamma: low volatility → neutral to small bullish

      - negative gamma: high vol → can heavily amplify direction (-8 to +8)

    score_range: [-10, +10]

}

# =====================================================

# 📍 חלק 3 — Impact (Final Contribution per Indicator)

# =====================================================

FINAL_IMPACT = {

    PUT_CALL_IMBALANCE:     16.4%,

    UOA:                    19.7%,

    OPEN_INTEREST_BUILDUP:  14.8%,

    IV_CHANGE:              16.4%,

    SKEW:                   14.8%,

    GAMMA_EXPOSURE:         18.0%

}

# הערה:

# אחוזים אלו מייצגים את תרומת כל אינדיקטור אל ציון המחלקה.

# לאחר מכן כל המחלקה מוכפלת ב־0.12 במסגרת המאסטר סקורינג.

# =====================================================

# 📍 חלק 4 — נוסחה סופית אחרי משקל מאסטר

# =====================================================

master_level_contribution = options_flow_score * 0.12

