# דוח מפורט - נתב מסחר (Trade Router)
## מסמך תיעוד מלא של כל המחלקות, תנאים, משקלים והגדרות

---

## 📋 תוכן עניינים

1. [מבנה כללי](#מבנה-כללי)
2. [מערכת הסריקה (Scanning System)](#מערכת-הסריקה)
3. [מערכת הביצועים (Execution System)](#מערכת-הביצועים)
4. [מערכת הניקוד (Scoring System)](#מערכת-הניקוד)
5. [Master Scoring System](#master-scoring-system)
6. [תבניות Price Action](#תבניות-price-action)
7. [סיכום משקלים](#סיכום-משקלים)

---

## 🏗️ מבנה כללי

### קובץ ראשי
**מיקום:** `app/trade-router/page.tsx`  
**גודל:** 4,283 שורות  
**סוג:** Next.js 15 Client Component

### רכיבים ראשיים

#### 1. **ScanningAccordionContent** (מערכת הסריקה)
- פונקציית רכיב React
- כולל state management לכל הפרמטרים
- Accordion UI עם קטגוריות קיפול

#### 2. **ExecutionAccordionContent** (מערכת הביצועים)
- פונקציית רכיב React
- כולל state management לכל הפרמטרים
- Accordion UI עם קטגוריות קיפול

#### 3. **ScoringAccordionContent** (מערכת הניקוד)
- פונקציית רכיב React
- כולל state management לכל הפרמטרים
- Accordion UI עם קטגוריות קיפול

#### 4. **TradeRouterPage** (דף ראשי)
- Export default component
- כולל Tabs navigation (4 טאבים)
- כולל Master Scoring System

---

## 🔍 מערכת הסריקה (Scanning System)

### קטגוריות

#### 1. הגדרות סורק התבניות (Scanner Config)

##### פרמטרים:
- **minMasterScore** (ברירת מחדל: "6.0")
  - סוג: string
  - תיאור: סף מינימלי לציון Master Score
  - שימוש: מסנן מניות עם ציון נמוך מדי

- **maxSymbolsToScan** (ברירת מחדל: "20")
  - סוג: string
  - תיאור: מספר מקסימלי של מניות לסריקה
  - שימוש: הגבלת עומס המערכת

- **requireClosedCandle** (ברירת מחדל: true)
  - סוג: boolean
  - תיאור: האם לחייב נר סגור לזיהוי תבנית
  - שימוש: מונע זיהוי מוקדם מדי של תבניות

- **debounceMs** (ברירת מחדל: "2000")
  - סוג: string
  - תיאור: זמן Debounce במילישניות
  - שימוש: מונע שליחת אותות מרובים

- **enableDirectionFilter** (ברירת מחדל: true)
  - סוג: boolean
  - תיאור: האם להפעיל מסנן כיוון
  - שימוש: מסנן תבניות לפי כיוון המסחר

#### 2. אסטרטגיות זיהוי תבניות

##### פרמטרים:
- **activeStrategies** (ברירת מחדל: [])
  - סוג: string[]
  - תיאור: רשימת אסטרטגיות פעילות
  - אפשרויות: ["DOUBLE_TOP", "BREAKOUT", "GAP_FILL"]
  - UI: כפתורי כן/לא לכל אסטרטגיה

#### 3. Backtest

##### פרמטרים:
- **backtestEnabled** (ברירת מחדל: false)
  - סוג: boolean
  - תיאור: האם להפעיל מצב Backtest

- **backtestIncludePremarket** (ברירת מחדל: false)
  - סוג: boolean
  - תיאור: האם לכלול שעות לפני מסחר

- **backtestIncludeAfterHours** (ברירת מחדל: false)
  - סוג: boolean
  - תיאור: האם לכלול שעות אחרי מסחר

- **backtestDays** (ברירת מחדל: "30")
  - סוג: string
  - תיאור: מספר ימים לבדיקה היסטורית

- **backtestIgnoreMasterScore** (ברירת מחדל: false)
  - סוג: boolean
  - תיאור: האם להתעלם מסף Master Score ב-Backtest

---

## ⚙️ מערכת הביצועים (Execution System)

### קטגוריות

#### 1. הגדרות ביצוע כללי (General Execution Config)

##### פרמטרים:
- **totalAccountValue** (ברירת מחדל: "10000")
  - סוג: string
  - תיאור: שווי חשבון כולל
  - שימוש: חישוב גודל פוזיציות

- **maxExposurePct** (ברירת מחדל: "95")
  - סוג: string
  - תיאור: אחוז חשיפה מקסימלי
  - שימוש: הגבלת שימוש בהון

- **maxConcurrentTrades** (ברירת מחדל: "3")
  - סוג: string
  - תיאור: מספר מקסימלי של עסקאות במקביל
  - שימוש: פיזור סיכונים

- **riskPerTradePct** (ברירת מחדל: "1")
  - סוג: string
  - תיאור: אחוז סיכון לעסקה
  - שימוש: חישוב גודל פוזיציה

- **mode** (ברירת מחדל: "DEMO")
  - סוג: "LIVE" | "DEMO" | "BACKTEST"
  - תיאור: מצב ביצוע
  - שימוש: קביעת מסלול ביצוע

- **latestEntryTime** (ברירת מחדל: "15:30")
  - סוג: string
  - תיאור: שעה אחרונה לכניסה לעסקה
  - שימוש: הגבלת כניסות מאוחרות

- **forceExitTime** (ברירת מחדל: "15:45")
  - סוג: string
  - תיאור: שעה לסגירה כפויה של כל הפוזיציות
  - שימוש: ניהול סיכונים סופי יום

- **relocationThresholdR** (ברירת מחדל: "2.0")
  - סוג: string
  - תיאור: סף R להחלפת פוזיציה רווחית
  - שימוש: אופטימיזציה של פוזיציות

#### 2. ניהול סיכונים (Risk Management)

##### פרמטרים:
- **dailyLossLimit** (ברירת מחדל: "")
  - סוג: string
  - תיאור: מגבלת הפסד יומי

- **maxDrawdownPct** (ברירת מחדל: "")
  - סוג: string
  - תיאור: אחוז Drawdown מקסימלי

- **maxPositionSizePerSymbol** (ברירת מחדל: "")
  - סוג: string
  - תיאור: גודל פוזיציה מקסימלי למניה

#### 3. ניהול פוזיציות (Position Management)

##### Take Profit Behavior:
- **takeProfitEnabled** (ברירת מחדל: false)
  - סוג: boolean
  - תיאור: האם להפעיל התנהגות Take Profit

- **targetMovePct** (ברירת מחדל: "")
  - סוג: string
  - תיאור: אחוז תנועת מחיר יעד

- **targetR** (ברירת מחדל: "")
  - סוג: string
  - תיאור: יעד R (סיכון/תגמול)

#### 4. מפסק אוטומטי (Circuit Breaker)

##### פרמטרים:
- **circuitBreakerEnabled** (ברירת מחדל: false)
  - סוג: boolean
  - תיאור: האם להפעיל מפסק אוטומטי

- **circuitBreakerFailureThreshold** (ברירת מחדל: "5")
  - סוג: string
  - תיאור: מספר כשלונות לפני הפעלה

- **circuitBreakerCooldownMs** (ברירת מחדל: "60000")
  - סוג: string
  - תיאור: זמן קירור במילישניות

#### 5. חיבור IBKR (IBKR Connection)

##### פרמטרים:
- **ibkrHost** (ברירת מחדל: "127.0.0.1")
  - סוג: string
  - תיאור: כתובת IP של IBKR Gateway/TWS

- **ibkrPort** (ברירת מחדל: "7497")
  - סוג: string
  - תיאור: פורט IBKR (7497 = Paper, 7496 = Live)

- **ibkrAccountId** (ברירת מחדל: "")
  - סוג: string
  - תיאור: מספר חשבון IBKR

- **ibkrLive** (ברירת מחדל: false)
  - סוג: boolean
  - תיאור: האם זה חשבון LIVE (true) או PAPER (false)

---

## 📊 מערכת הניקוד (Scoring System)

### 1. NEWS_SCORING_SYSTEM (מערכת ניקוד חדשות)

#### קטגוריה: משקלים (Weights)
- **marketMacroWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל חדשות מאקרו ברמת השוק
  - דוגמאות: החלטות FED, דוחות אינפלציה, דוחות תעסוקה

- **sectorMacroWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל חדשות מאקרו ברמת הסקטור

- **microGlobalWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל חדשות ברמת החברה (לא תלויות סקטור)
  - דוגמאות: שינוי דירוג אנליסט, הוספה/הסרה מאינדקס

- **microCompanyWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל חדשות ספציפיות לחברה
  - דוגמאות: דוחות רווח, הנחיות, דילול

- **sectorSensitivityMultiplier** (ברירת מחדל: "1.0")
  - תיאור: מכפיל רגישות סקטור

#### קטגוריה: חלונות זמן (Time Windows)
- **macroNewsLifetimeMinutes** (ברירת מחדל: "1440")
  - תיאור: זמן חיים של חדשות מאקרו בדקות (24 שעות)

- **sectorNewsLifetimeMinutes** (ברירת מחדל: "720")
  - תיאור: זמן חיים של חדשות סקטור בדקות (12 שעות)

- **companyNewsLifetimeMinutes** (ברירת מחדל: "360")
  - תיאור: זמן חיים של חדשות חברה בדקות (6 שעות)

#### קטגוריה: מסננים (Filters)
- **minNewsScoreToAffect** (ברירת מחדל: "0.5")
  - תיאור: ציון מינימלי לחדשה כדי להשפיע

- **includeSocialNews** (ברירת מחדל: true)
  - תיאור: האם לכלול חדשות חברתיות

- **includeEarnings** (ברירת מחדל: true)
  - תיאור: האם לכלול דוחות רווח

- **includeDilution** (ברירת מחדל: true)
  - תיאור: האם לכלול דילול

- **includeRegulatory** (ברירת מחדל: true)
  - תיאור: האם לכלול רגולציה

- **includeEmergencyNews** (ברירת מחדל: true)
  - תיאור: האם לכלול חדשות חירום

#### קטגוריה: מקורות חדשות (News Sources)
- **enabledNewsSources** (ברירת מחדל: ["IBKR", "Yahoo"])
  - סוג: string[]
  - תיאור: רשימת מקורות חדשות פעילים
  - אפשרויות: ["IBKR", "Yahoo", "AlphaVantage", "Twitter"]

- **maxNewsItemsPerSymbol** (ברירת מחדל: "50")
  - תיאור: מספר מקסימלי של פריטי חדשות למניה

---

### 2. TECHNICAL_INDICATORS (אינדיקטורים טכניים)

#### קטגוריה: אינדיקטורים פעילים (Active Indicators)
- **enableRSI** (ברירת מחדל: true)
- **enableMACD** (ברירת מחדל: true)
- **enableSMA** (ברירת מחדל: true)
- **enableVWAP** (ברירת מחדל: true)
- **enableVolume** (ברירת מחדל: true)
- **enableATR** (ברירת מחדל: true)
- **enableBollinger** (ברירת מחדל: true)

#### קטגוריה: הגדרות RSI
- **rsiOverboughtLevel** (ברירת מחדל: "70")
  - תיאור: רמת Overbought

- **rsiOversoldLevel** (ברירת מחדל: "30")
  - תיאור: רמת Oversold

- **rsiExtremeHigh** (ברירת מחדל: "80")
  - תיאור: רמת Extreme High

- **rsiExtremeLow** (ברירת מחדל: "20")
  - תיאור: רמת Extreme Low

#### קטגוריה: הגדרות MACD
- **macdFastLength** (ברירת מחדל: "12")
  - תיאור: אורך מהיר

- **macdSlowLength** (ברירת מחדל: "26")
  - תיאור: אורך איטי

- **macdSignalLength** (ברירת מחדל: "9")
  - תיאור: אורך אות

#### קטגוריה: הגדרות ATR
- **atrStopMultiplier** (ברירת מחדל: "2.0")
  - תיאור: מכפיל Stop Loss

- **atrVolatilityThreshold** (ברירת מחדל: "0.02")
  - תיאור: סף תנודתיות

#### קטגוריה: הגדרות MA
- **smaPeriods** (ברירת מחדל: "9,20,50,150,200")
  - תיאור: תקופות ממוצע נע
  - סוג: string (רשימה מופרדת בפסיקים)

#### קטגוריה: הגדרות VWAP
- **maxVwapDistanceATR** (ברירת מחדל: "2.0")
  - תיאור: מרחק מקסימלי מ-VWAP ב-ATR

#### קטגוריה: Timeframes
- **minorTimeframe** (ברירת מחדל: "5m")
  - תיאור: Timeframe משני

- **majorTimeframe** (ברירת מחדל: "daily")
  - תיאור: Timeframe ראשי

---

### 3. PRICE_ACTION_PATTERNS (תבניות Price Action)

#### קטגוריה: תבניות פעילות (Enabled Patterns)
- **enableDoubleTop** (ברירת מחדל: true)
- **enableDoubleBottom** (ברירת מחדל: true)
- **enableBreakout** (ברירת מחדל: true)
- **enableBreakdown** (ברירת מחדל: true)
- **enableGaps** (ברירת מחדל: true)
- **enableCandles** (ברירת מחדל: true)
- **enableTrendStructure** (ברירת מחדל: true)

#### קטגוריה: פרמטרי תבנית (Pattern Parameters) - Double Top
- **minPercentageDropBetweenTops** (ברירת מחדל: "3")
  - תיאור: אחוז ירידה מינימלי בין שיאים

- **minCandleDistanceBetweenTops** (ברירת מחדל: "10")
  - תיאור: מרחק מינימלי בנרות בין שיאים

- **maxDifferenceBetweenTopsPercent** (ברירת מחדל: "2")
  - תיאור: הפרש מקסימלי בין שיאים באחוזים

- **volumeRequirementOnReversal** (ברירת מחדל: "1.5")
  - תיאור: דרישת נפח בהיפוך (מכפיל)

- **necklineBreakConfirmation** (ברירת מחדל: true)
  - תיאור: האם לדרוש אישור שבירה של קו הצוואר

- **minPatternStrength** (ברירת מחדל: "5")
  - תיאור: חוזק תבנית מינימלי

- **minConfidenceLevel** (ברירת מחדל: "0.6")
  - תיאור: רמת ביטחון מינימלית (0-1)

---

### 4. OPTIONS_FLOW (זרימת אופציות)

#### קטגוריה: אותות פעילים (Active Signals)
- **enableUOA** (ברירת מחדל: true)
  - תיאור: Unusual Options Activity

- **enablePutCallImbalance** (ברירת מחדל: true)
  - תיאור: חוסר איזון Put/Call

- **enableIVChanges** (ברירת מחדל: true)
  - תיאור: שינויים ב-Implied Volatility

- **enableGammaExposure** (ברירת מחדל: true)
  - תיאור: Gamma Exposure

- **enableOpenInterestChanges** (ברירת מחדל: true)
  - תיאור: שינויים ב-Open Interest

- **enableSkew** (ברירת מחדל: true)
  - תיאור: Skew בין Put ל-Call

#### קטגוריה: ספים (Thresholds)
- **putCallRatioLow** (ברירת מחדל: "0.7")
  - תיאור: Put/Call Ratio נמוך

- **putCallRatioHigh** (ברירת מחדל: "1.3")
  - תיאור: Put/Call Ratio גבוה

- **unusualVolumeMultiplier** (ברירת מחדל: "2.0")
  - תיאור: מכפיל נפח חריג

- **ivSpikePercent** (ברירת מחדל: "10")
  - תיאור: אחוז עלייה ב-IV

- **ivCrushPercent** (ברירת מחדל: "-5")
  - תיאור: אחוז ירידה ב-IV

- **gammaFlipThreshold** (ברירת מחדל: "0")
  - תיאור: סף הפיכת Gamma

- **optionsFlowWeight** (ברירת מחדל: "1.05")
  - תיאור: משקל זרימת אופציות במאסטר סקורינג

---

### 5. SENTIMENT (רגש שוק)

#### קטגוריה: מקורות (Sources)
- **includeTwitter** (ברירת מחדל: true)
- **includeReddit** (ברירת מחדל: true)
- **includeNewsSentiment** (ברירת מחדל: true)
- **includeStockSentiment** (ברירת מחדל: true)
- **includeMarketSentiment** (ברירת מחדל: true)

#### קטגוריה: ספים (Thresholds)
- **minMentionsVolume** (ברירת מחדל: "10")
  - תיאור: נפח אזכורים מינימלי

- **trendingMultiplier** (ברירת מחדל: "2.0")
  - תיאור: מכפיל טרנד

- **sentimentSmoothingPeriod** (ברירת מחדל: "24")
  - תיאור: תקופת החלקה בשעות

- **sentimentWeight** (ברירת מחדל: "0.80")
  - תיאור: משקל Sentiment במאסטר סקורינג

---

### 6. FUNDAMENTALS (ניקוד יסודות)

#### קטגוריה: הערכת שווי (Valuation)
- **maxPE** (ברירת מחדל: "30")
  - תיאור: יחס PE מקסימלי

- **maxPS** (ברירת מחדל: "10")
  - תיאור: יחס PS מקסימלי

- **maxPB** (ברירת מחדל: "5")
  - תיאור: יחס PB מקסימלי

#### קטגוריה: צמיחה (Growth)
- **minEPSGrowth5Y** (ברירת מחדל: "5")
  - תיאור: צמיחת EPS מינימלית על פני 5 שנים (%)

- **minRevenueGrowthYoY** (ברירת מחדל: "10")
  - תיאור: צמיחת הכנסות מינימלית YoY (%)

#### קטגוריה: רווחיות (Profitability)
- **minProfitMargin** (ברירת מחדל: "10")
  - תיאור: שולי רווח מינימליים (%)

- **minROE** (ברירת מחדל: "15")
  - תיאור: תשואת הון עצמי מינימלית (%)

#### קטגוריה: מינוף (Leverage)
- **maxDebtToEquity** (ברירת מחדל: "100")
  - תיאור: יחס חוב-הון מקסימלי (%)

#### קטגוריה: תזרים מזומנים (Cashflow)
- **minFreeCashflowMargin** (ברירת מחדל: "5")
  - תיאור: שולי תזרים מזומנים חופשי מינימליים (%)

#### קטגוריה: משקלים (Weights)
- **valuationWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל הערכת שווי

- **growthWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל צמיחה

- **profitabilityWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל רווחיות

- **leverageWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל מינוף

- **cashflowWeight** (ברירת מחדל: "1.0")
  - תיאור: משקל תזרים מזומנים

---

### 7. POSITION_RISK (ניקוד סיכון פוזיציה)

#### קטגוריה: סיכון חשבון (Account Risk)
- **maxCapitalUsagePercent** (ברירת מחדל: "95")
  - תיאור: אחוז שימוש בהון מקסימלי

- **maxRiskPerTradePercent** (ברירת מחדל: "1")
  - תיאור: אחוז סיכון לעסקה מקסימלי

- **maxDailyDrawdownPercent** (ברירת מחדל: "5")
  - תיאור: אחוז Drawdown יומי מקסימלי

#### קטגוריה: מגבלות חשיפה (Exposure Limits)
- **maxSymbolExposurePercent** (ברירת מחדל: "20")
  - תיאור: אחוז חשיפה למניה מקסימלי

- **maxSectorExposurePercent** (ברירת מחדל: "30")
  - תיאור: אחוז חשיפה לסקטור מקסימלי

- **maxOpenPositions** (ברירת מחדל: "5")
  - תיאור: מספר פוזיציות פתוחות מקסימלי

- **minRiskRewardRatio** (ברירת מחדל: "2.0")
  - תיאור: יחס סיכון/תגמול מינימלי

- **positionRiskWeight** (ברירת מחדל: "0.70")
  - תיאור: משקל Position Risk במאסטר סקורינג

---

## 🎯 Master Scoring System

### מיקום
נמצא בתוך `TradeRouterPage` עצמו (לא ב-Accordion)

### פרמטרים

#### קטגוריה: הגדרות כלליות

- **longThreshold** (ברירת מחדל: "2.0")
  - תיאור: סף לקביעת כיוון LONG
  - שימוש: אם הציון הסופי ≥ ערך זה → כיוון: LONG

- **shortThreshold** (ברירת מחדל: "-2.0")
  - תיאור: סף לקביעת כיוון SHORT
  - שימוש: אם הציון הסופי ≤ ערך זה (שלילי) → כיוון: SHORT

- **minMasterScoreForTrading** (ברירת מחדל: "6.0")
  - תיאור: ציון Master מינימלי למסחר
  - שימוש: מניות עם ציון נמוך יותר לא ייכללו ברשימת ההזדמנויות

- **maxSymbolsToRank** (ברירת מחדל: "100")
  - תיאור: מספר מקסימלי של מניות לדירוג
  - שימוש: הגבלת עומס המערכת

#### קטגוריה: הפעלה/כיבוי מחלקות

- **moduleStates** (ברירת מחדל: כולן true)
  - סוג: Record<string, boolean | null>
  - מחלקות:
    - macro: true
    - sector: true
    - news: true
    - technical: true
    - options: true
    - pattern: true
    - strategyContext: true
    - positionRisk: true

---

## 📐 סיכום משקלים

### משקלי מחלקות במאסטר סקורינג:

1. **Technical Indicators**: 1.0 (ברירת מחדל)
2. **Options Flow**: 1.05
3. **News Scoring**: משקלים פנימיים (Market Macro, Sector Macro, Micro Global, Micro Company)
4. **Sentiment**: 0.80
5. **Fundamentals**: 0.75
6. **Position Risk**: 0.70

### משקלי תתי-קטגוריות ב-Fundamentals:
- Valuation Weight: 1.0
- Growth Weight: 1.0
- Profitability Weight: 1.0
- Leverage Weight: 1.0
- Cashflow Weight: 1.0

---

## 🔧 ממשקי UI

### רכיבי ShadCN/Radix UI בשימוש:
1. **Tabs** - ניווט בין 4 טאבים:
   - backtest
   - מערכת הביצועים
   - מערכת הסריקה
   - מערכת הניקוד

2. **Accordion** - קטגוריות קיפול בכל טאב

3. **Dialog** - חלונות הסבר (Info icons)

4. **Input** - שדות קלט מספריים וטקסט

5. **Button** - כפתורי כן/לא, פעיל/לא פעיל

6. **Label** - תוויות שדות

### תכונות UI:
- **RTL Support** - תמיכה מלאה בעברית ו-RTL
- **Loading Skeletons** - מסכי טעינה בעת mount
- **Info Dialogs** - הסברים מפורטים לכל שדה
- **Responsive Design** - עיצוב רספונסיבי

---

## 📊 סטטיסטיקות

### מספר פרמטרים:
- **מערכת הסריקה**: ~12 פרמטרים
- **מערכת הביצועים**: ~15 פרמטרים
- **מערכת הניקוד**: ~80+ פרמטרים
- **Master Scoring**: 12 פרמטרים

### סה"כ: ~120 פרמטרים בקובץ אחד

---

## 🔗 תלויות

### Imports:
- React hooks: `useState`, `useEffect`
- ShadCN UI: Tabs, Accordion, Dialog, Input, Button, Label, Card
- Icons: `Info` from lucide-react
- Components: `AIChatPanel`, `StrategyKitHeader`

---

## 📝 הערות חשובות

1. **State Management**: כל הפרמטרים מנוהלים באמצעות `useState` hooks
2. **Client-Side Rendering**: כל הרכיבים הם Client Components (`"use client"`)
3. **Hydration**: יש טיפול ב-hydration mismatch עם loading skeletons
4. **Type Safety**: שימוש ב-TypeScript עם טיפוסים מפורשים
5. **Default Values**: כל השדות כוללים ערכי ברירת מחדל

---

## 🚀 שימוש עתידי

הקובץ מוכן לשילוב עם:
- Backend API לשמירת הגדרות
- Database (Convex) לאחסון קונפיגורציות
- Real-time updates בין UI לביצועים
- Export/Import של הגדרות

---

---

## 📋 טבלאות פרמטרים מפורטות

### טבלה 1: פרמטרי מערכת הסריקה

| שם פרמטר | טיפוס | ברירת מחדל | טווח מוצע | תיאור |
|---------|-------|-----------|----------|--------|
| minMasterScore | string | "6.0" | 0-10 | סף מינימלי לציון Master Score |
| maxSymbolsToScan | string | "20" | 5-100 | מספר מקסימלי של מניות לסריקה |
| requireClosedCandle | boolean | true | true/false | האם לחייב נר סגור |
| debounceMs | string | "2000" | 500-10000 | זמן Debounce במילישניות |
| enableDirectionFilter | boolean | true | true/false | הפעלת מסנן כיוון |
| backtestEnabled | boolean | false | true/false | מצב Backtest |
| backtestDays | string | "30" | 1-365 | מספר ימים לבדיקה |

### טבלה 2: פרמטרי מערכת הביצועים

| שם פרמטר | טיפוס | ברירת מחדל | טווח מוצע | תיאור |
|---------|-------|-----------|----------|--------|
| totalAccountValue | string | "10000" | >0 | שווי חשבון כולל ($) |
| maxExposurePct | string | "95" | 50-100 | אחוז חשיפה מקסימלי |
| maxConcurrentTrades | string | "3" | 1-10 | מספר עסקאות במקביל |
| riskPerTradePct | string | "1" | 0.5-5 | אחוז סיכון לעסקה |
| mode | enum | "DEMO" | LIVE/DEMO/BACKTEST | מצב ביצוע |
| latestEntryTime | string | "15:30" | HH:MM | שעה אחרונה לכניסה |
| forceExitTime | string | "15:45" | HH:MM | שעה לסגירה כפויה |
| relocationThresholdR | string | "2.0" | 1.0-5.0 | סף R להחלפה |

### טבלה 3: משקלי מערכת הניקוד

| מחלקה | משקל | טווח מוצע | תיאור |
|--------|------|----------|--------|
| Technical Indicators | 1.0 | 0.5-2.0 | משקל אינדיקטורים טכניים |
| Options Flow | 1.05 | 0.5-2.0 | משקל זרימת אופציות |
| Sentiment | 0.80 | 0.5-2.0 | משקל רגש שוק |
| Fundamentals | 0.75 | 0.5-2.0 | משקל ניתוח יסודות |
| Position Risk | 0.70 | 0.5-2.0 | משקל ניהול סיכונים |

### טבלה 4: תבניות Price Action

| תבנית | מצב ברירת מחדל | כיוון מסחר | תיאור |
|-------|---------------|----------|--------|
| Double Top | פעיל | SHORT | שני שיאים דומים |
| Double Bottom | פעיל | LONG | שני תחתיות דומות |
| Breakout | פעיל | LONG | שבירת התנגדות |
| Breakdown | פעיל | SHORT | שבירת תמיכה |
| Gaps | פעיל | BOTH | פערי מחיר |
| Candles | פעיל | BOTH | תבניות נרות |
| Trend Structure | פעיל | BOTH | מבנה מגמה |

### טבלה 5: אינדיקטורים טכניים

| אינדיקטור | מצב | פרמטרים | תיאור |
|-----------|-----|---------|--------|
| RSI | פעיל | Overbought: 70, Oversold: 30 | מדד חוזק יחסי |
| MACD | פעיל | Fast: 12, Slow: 26, Signal: 9 | ממוצעים נעים |
| SMA | פעיל | Periods: 9,20,50,150,200 | ממוצעים נעים פשוטים |
| VWAP | פעיל | Max Distance ATR: 2.0 | ממוצע נפח-משקל |
| Volume | פעיל | - | ניתוח נפח |
| ATR | פעיל | Stop Multiplier: 2.0 | טווח ממוצע אמיתי |
| Bollinger | פעיל | - | פסי בולינגר |

### טבלה 6: מקורות חדשות

| מקור | ברירת מחדל | תיאור |
|------|-----------|--------|
| IBKR | פעיל | Interactive Brokers News |
| Yahoo | פעיל | Yahoo Finance News |
| AlphaVantage | לא פעיל | Alpha Vantage API |
| Twitter | לא פעיל | Twitter Sentiment |

### טבלה 7: ספי Master Scoring

| פרמטר | ערך | תנאי | תוצאה |
|-------|-----|------|--------|
| Long Threshold | 2.0 | ציון ≥ 2.0 | LONG |
| Short Threshold | -2.0 | ציון ≤ -2.0 | SHORT |
| Neutral Zone | -2.0 עד 2.0 | ציון בין הספים | NEUTRAL |
| Min Master Score | 6.0 | ציון < 6.0 | לא למסחר |

---

## 🔄 זרימת נתונים

### 1. מערכת הניקוד → Master Score
```
Technical Indicators (1.0)
  + Options Flow (1.05)
  + News Scoring (משקלים פנימיים)
  + Sentiment (0.80)
  + Fundamentals (0.75)
  + Position Risk (0.70)
  = Master Score
```

### 2. Master Score → מערכת הסריקה
```
Master Score ≥ minMasterScore (6.0)
  → מניה מועמדת לסריקה
  → זיהוי תבניות Price Action
  → שליחת אות למערכת הביצועים
```

### 3. מערכת הסריקה → מערכת הביצועים
```
תבנית זוהתה
  → בדיקת תנאי כניסה
  → חישוב גודל פוזיציה
  → ביצוע עסקה (אם תנאים מתקיימים)
```

---

## ⚠️ תנאי כניסה ליציאה

### תנאי כניסה לעסקה:
1. ✅ Master Score ≥ minMasterScoreForTrading (6.0)
2. ✅ תבנית זוהתה במערכת הסריקה
3. ✅ יש מספיק הון זמין (maxExposurePct)
4. ✅ לא עבר maxConcurrentTrades
5. ✅ שעה ≤ latestEntryTime
6. ✅ תנאי סיכון מתקיימים (Position Risk)

### תנאי יציאה:
1. ✅ שעה ≥ forceExitTime (סגירה כפויה)
2. ✅ Stop Loss הושג
3. ✅ Take Profit הושג
4. ✅ Relocation (פוזיציה רווחית הוחלפה)
5. ✅ Circuit Breaker הופעל

---

## 🎨 מבנה UI

### טאבים:
1. **Backtest** - בדיקת ביצועים היסטוריים
2. **מערכת הביצועים** - הגדרות ביצוע עסקאות
3. **מערכת הסריקה** - הגדרות זיהוי תבניות
4. **מערכת הניקוד** - הגדרות ניתוח וניקוד

### Accordion קטגוריות במערכת הניקוד:
1. אינדיקטורים
2. ניקוד זרימת אופציות
3. חדשות
4. ניקוד יסודות
5. ניקוד סיכון פוזיציה
6. תבניות Price Action

---

**נוצר בתאריך:** 2024  
**גרסת מסמך:** 1.1  
**קובץ מקור:** `app/trade-router/page.tsx`  
**מספר שורות קוד:** 4,283  
**מספר פרמטרים:** ~120

