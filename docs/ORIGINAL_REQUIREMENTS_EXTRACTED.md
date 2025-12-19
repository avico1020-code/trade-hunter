# חילוץ הדרישות המקוריות מהקובץ combined_conversation.md

**קובץ מקור:** `combined_conversation.md` (40,569 שורות)  
**תאריך:** 2024

---

## 📋 סטטוס הקריאה

✅ **קראתי חלקים ממוקדים מהקובץ המקורי - ממשיך לקרוא**

הקובץ גדול מאוד (40,569 שורות) ולכן אני קורא אותו בחלקים לפי נושאים.

---

## 🏗️ ארכיטקטורה כללית (3 שכבות)

### Layer 1: Python Master Scoring System
- ניתוח וניקוד מניות
- **11 rulebooks + 6 scoring engines + Master engine**
- **Module weights:**
  - `PRICE_ACTION_WEIGHT = 1.2`
  - `OPTIONS_FLOW_WEIGHT = 1.05`
  - `SENTIMENT_WEIGHT = 0.80`
  - `FUNDAMENTALS_WEIGHT = 0.75`
  - `POSITION_RISK_WEIGHT = 0.70`

### Layer 2: TypeScript Trade Pattern Scanner
- זיהוי תבניות על מניות מדורגות
- Config: `TradePatternScannerConfig`

### Layer 3: TypeScript Execution Engine
- ביצוע עסקאות
- Config: `ExecutionEngineConfig`

---

## 📚 כל ה-Rulebooks שזיהיתי מהקובץ המקורי

### 1. NEWS_SCORING_SYSTEM
- `NEWS_RULEBOOK` - כלל החדשות
- `MACRO_RULEBOOK` - חדשות מקרו
- `SECTOR_MACRO_RULEBOOK` - חדשות סקטור
- `NEWS_MICRO_GLOBAL_RULEBOOK` - חדשות מיקרו גלובליות
- `NEWS_MICRO_RULEBOOK` - חדשות מיקרו חברה

### 2. TECHNICAL_INDICATOR_RULEBOOK
- RSI (18 states)
- MACD
- Moving Averages (SMA9, SMA20, SMA50, SMA150, SMA200)
- VWAP
- Volume
- ATR
- Bollinger Bands
- Price Action Patterns

### 3. MACRO_SCORING_RULEBOOK
- MARKET_TREND
- VOLATILITY (VIX)
- RATES_AND_DOLLAR
- CREDIT_RISK
- BREADTH
- SENTIMENT_EVENT

### 4. SECTOR_SCORING_RULEBOOK
- SECTOR_TREND
- SECTOR_RELATIVE_STRENGTH
- SECTOR_BREADTH
- SECTOR_INTRADAY_FLOW

### 5. PRICE_ACTION_RULEBOOK
- STRUCTURE (HH/HL, LH/LL)
- REVERSAL (Double Top, Double Bottom, H&S)
- CONTINUATION (Flags, Triangles)
- LEVEL_REACTION (Support/Resistance)
- GAPS (Gap Up/Down)
- CANDLES (Engulfing, Hammer, Doji)

### 6. OPTIONS_FLOW_RULEBOOK
- PUT_CALL_IMBALANCE
- UOA (Unusual Options Activity)
- OPEN_INTEREST
- IV (Implied Volatility)
- SKEW
- GAMMA_EXPOSURE

### 7. SENTIMENT_RULEBOOK
- INTRADAY_SENTIMENT
- DAILY_SENTIMENT
- News Sentiment
- Social Sentiment (Twitter, Reddit)
- Market Sentiment
- Stock Sentiment

### 8. FUNDAMENTALS_RULEBOOK
- VALUATION (PE, PS, PB)
- GROWTH (EPS Growth, Revenue Growth)
- PROFITABILITY (Profit Margin, ROE)
- LEVERAGE (Debt to Equity)
- CASHFLOW (Free Cashflow Margin)

### 9. POSITION_RISK_RULEBOOK
- ACCOUNT_RISK
- POSITION_RISK
- EXPOSURE_LIMITS
- BEHAVIORAL_RISK

### 10. RISK_MANAGEMENT_RULEBOOK (נוסף)
- POSITION_RISK
- PORTFOLIO_RISK
- CORRELATION_RISK
- LIQUIDITY_RISK
- VOLATILITY_RISK
- ACCOUNT_HEALTH
- TIME_CONTEXT

### 11. TRADE_QUALITY_RULEBOOK (נוסף)
- ENTRY_LOCATION
- STOP_QUALITY
- RR_STRUCTURE
- SIGNAL_ALIGNMENT
- PATTERN_QUALITY
- CONTEXT_FIT
- VOLATILITY_FIT

### 12. STRATEGY_FIT_RULEBOOK (נוסף)
- MARKET_ENVIRONMENT
- VOLATILITY_REQUIREMENTS
- TREND_REQUIREMENTS
- VOLUME_REQUIREMENTS
- STRUCTURE_REQUIREMENTS
- TIME_OF_DAY_REQUIREMENTS
- LIQUIDITY_REQUIREMENTS
- SECTOR_ALIGNMENT

### 13. LIQUIDITY_MICROSTRUCTURE_RULEBOOK (נוסף)
- SPREAD
- DEPTH
- VOLUME_QUALITY
- EXECUTION_RISK
- MICROSTRUCTURE_BEHAVIOR

---

## 🔍 מה שזיהיתי עד כה מהקובץ המקורי

### 1. News Scoring System

**פרמטרים:**
- `marketMacroWeight`
- `sectorMacroWeight`
- `microGlobalWeight`
- `microCompanyWeight`
- `sectorSensitivityMultiplier`
- `macroNewsLifetimeMinutes`
- `sectorNewsLifetimeMinutes`
- `companyNewsLifetimeMinutes`
- `minNewsScoreToAffect`
- `includeSocialNews`
- `includeEarnings`
- `includeDilution`
- `includeRegulatory`
- `includeEmergencyNews`
- `enabledNewsSources`
- `maxNewsItemsPerSymbol`

### 2. Technical Indicators System

**פרמטרים:**
- `enableRSI`, `enableMACD`, `enableSMA`, `enableVWAP`, `enableVolume`, `enableATR`, `enableBollinger`
- `rsiOverboughtLevel`, `rsiOversoldLevel`, `rsiExtremeHigh`, `rsiExtremeLow`
- `macdFastLength`, `macdSlowLength`, `macdSignalLength`
- `atrStopMultiplier`, `atrVolatilityThreshold`
- `smaPeriods` (comma-separated string)
- `maxVwapDistanceATR`
- `minorTimeframe`, `majorTimeframe`

### 3. Price Action Patterns

**פרמטרים:**
- `enableDoubleTop`, `enableDoubleBottom`, `enableBreakout`, `enableBreakdown`, `enableGaps`, `enableCandles`, `enableTrendStructure`
- `minPercentageDropBetweenTops`
- `minCandleDistanceBetweenTops`
- `maxDifferenceBetweenTopsPercent`
- `volumeRequirementOnReversal`
- `necklineBreakConfirmation`
- `minPatternStrength`
- `minConfidenceLevel`

### 4. Options Flow

**פרמטרים:**
- `enableUOA`, `enablePutCallImbalance`, `enableIVChanges`, `enableGammaExposure`, `enableOpenInterestChanges`, `enableSkew`
- `putCallRatioLow`, `putCallRatioHigh`
- `unusualVolumeMultiplier`
- `ivSpikePercent`, `ivCrushPercent`
- `gammaFlipThreshold`
- `optionsFlowWeight`

### 5. Sentiment

**פרמטרים:**
- `includeTwitter`, `includeReddit`, `includeNewsSentiment`, `includeStockSentiment`, `includeMarketSentiment`
- `minMentionsVolume`
- `trendingMultiplier`
- `sentimentSmoothingPeriod`
- `sentimentWeight`

### 6. Fundamentals

**פרמטרים:**
- `maxPE`, `maxPS`, `maxPB`
- `minEPSGrowth5Y`, `minRevenueGrowthYoY`
- `minProfitMargin`, `minROE`
- `maxDebtToEquity`
- `minFreeCashflowMargin`
- `valuationWeight`, `growthWeight`, `profitabilityWeight`, `leverageWeight`, `cashflowWeight`

### 7. Position Risk

**פרמטרים:**
- `maxCapitalUsagePercent`
- `maxRiskPerTradePercent`
- `maxDailyDrawdownPercent`
- `maxSymbolExposurePercent`
- `maxSectorExposurePercent`
- `maxOpenPositions`
- `minRiskRewardRatio`
- `positionRiskWeight`

### 8. Master Scoring System

**פרמטרים:**
- `useMacro`, `useSector`, `useNews`, `useTechnical`, `useOptions`, `usePattern`, `useSentiment`, `useFundamentals`, `usePositionRisk`
- `minMasterScoreForTrading`
- `longThreshold`
- `shortThreshold`
- `maxSymbolsToRank`
- **moduleWeights** (משקלים לכל מודול)
- **normalization** (נרמול ציונים)
- **bias adjustments** (התאמות הטיה)
- **scoring aggregation rules** (חוקי איגום ניקוד)

### 9. Scanner Config (TradePatternScannerConfig)

**פרמטרים:**
- `minMasterScore`
- `maxSymbolsToScan`
- `requireClosedCandle`
- `debounceMs`
- `enableDirectionFilter`
- `activeStrategies`
- `backtest.enabled`
- `backtest.includePremarket`
- `backtest.includeAfterHours`
- `backtest.days`
- `backtest.ignoreMasterScore`
- `minPatternConfidence`
- `minPatternStrength`

### 10. Execution Config (ExecutionEngineConfig)

**פרמטרים:**
- `totalAccountValue`
- `maxExposurePct`
- `maxConcurrentTrades`
- `riskPerTradePct`
- `mode` ("LIVE" | "DEMO" | "BACKTEST")
- `latestEntryTime`
- `forceExitTime`
- `relocationThresholdR`
- `takeProfitBehavior.enabled`
- `takeProfitBehavior.targetMovePct`
- `takeProfitBehavior.targetR`
- `ibkr.host`
- `ibkr.port`
- `ibkr.accountId`
- `ibkr.live`
- `dailyLossLimit`
- `maxDrawdownPct`
- `maxPositionSizePerSymbol`
- `circuitBreakerEnabled`
- `circuitBreakerFailureThreshold`
- `circuitBreakerCooldownMs`

---

## ⚠️ בעיות התאמה שזיהיתי מהקובץ המקורי

### 1. **Global Config חסר** ❌
- `tradingEnabled`
- `moduleWeights` (משקלים לכל מודול)
- `normalization`
- `bias adjustments`
- `scoring aggregation rules`

### 2. **Strategy Context חסר** ❌
- `strategies: { DOUBLE_TOP: { enabled, direction, priority }, ... }`

### 3. **שדות שלא קיימים ב-Rulebook** ❌
- `includeEmergencyNews`
- `includeSocialNews`
- `atrVolatilityThreshold`
- `sentimentSmoothingPeriod`

### 4. **שדות חסרים ב-UI** ❌
- Price Action: רוב התבניות (רק Double Top מוצג)
- Options Flow: base_weight, group weights, OI multipliers
- Sentiment: states per timeframe, score ranges
- Fundamentals: ROA, ROIC, FCF Yield, Cash flow growth
- Position Risk: rr_multiple_live, stress position metric, correlated exposure

### 5. **חוסר עקביות בין Rulebook ל-UI**
- UI מכיל פרמטרים שלא קיימים ב-Python Rulebooks
- Rulebooks מכילים פרמטרים שלא מופיעים ב-UI

---

## 📝 הערות חשובות

1. **Python Rulebooks הם מקור האמת** - כל מה שב-UI חייב להתבסס עליהם
2. **UI אמור להיות נגזרת ישירה של Rulebooks** - לא פרמטרים עצמאיים
3. **צריך ליצור TradingUserConfig.ts** - קובץ קונפיגורציה מאוחד
4. **צריך טבלת התאמה מלאה** - Rulebook → UI Mapping

---

## 🔍 Global Config - דרישות מהקובץ המקורי

מהקובץ המקורי (עמודים 804-806, 40041-40060) נמצא שה-UI **חסר Global Config לחלוטין**.

**צריך להיות:**

```typescript
interface GlobalConfig {
  tradingEnabled: boolean; // default: true
  // Master scoring module toggles
  useMacro: boolean; // default: true
  useSectorMacro: boolean; // default: true
  useNews: boolean; // default: true
  useTechnical: boolean; // default: true
  usePriceAction: boolean; // default: true
  useOptionsFlow: boolean; // default: true
  useSentiment: boolean; // default: true
  useFundamentals: boolean; // default: false
  usePositionRisk: boolean; // default: true
  useStrategyContext: boolean; // default: true
  // Master scoring module weights
  moduleWeights: {
    macro: number; // default: 0.9
    sectorMacro: number; // default: 0.9
    news: number; // default: 1.0
    technical: number; // default: 1.2
    priceAction: number; // default: 1.2
    optionsFlow: number; // default: 1.05
    sentiment: number; // default: 0.8
    fundamentals: number; // default: 0.75
    positionRisk: number; // default: 0.7
    strategyContext: number; // default: 1.0
  };
  // Master scoring → direction determination
  directionThreshold: number; // default: 2.0
  minAbsScoreForScanner: number; // default: 6.0
  rescoreIntervalSeconds: number; // default: 1
}
```

**מה שיש ב-UI כרגע:** ❌ כלום - אין Global Config

---

## 🔍 Strategy Context - דרישות מהקובץ המקורי

מהקובץ המקורי (עמודים 992-1040, 39100-40077) נמצא שה-UI **חסר Strategy Context לחלוטין**.

**צריך להיות:**

```typescript
interface StrategyContextConfig {
  strategies: {
    DOUBLE_TOP: { enabled: boolean; direction: "LONG" | "SHORT" | "BOTH"; priority: number }
    GAP_UP_REVERSAL: { ... }
    BREAKOUT: { ... }
    // ... כל האסטרטגיות
  }
}
```

**מה שיש ב-UI כרגע:** ❌ כלום - אין Strategy Context

---

## 📋 סיכום קריאת הקובץ המקורי

✅ **קראתי:**
- כל ה-Rulebooks (13 Rulebooks)
- כל פרמטרי הקונפיגורציה
- טבלת התאמה מלאה (עמודים 837-844)
- בעיות התאמה שזוהו (עמודים 828-833)
- דרישות ל-Global Config (עמודים 804-806, 40041-40060)
- דרישות ל-Strategy Context (עמודים 992-1040, 39100-40077)
- Trade Pattern Scanner (עמודים 750-800)
- Execution Engine (עמודים 600-650)

✅ **יש לי מספיק מידע** כדי לעדכן את הקוד

---

*דוח זה עודכן לאחר קריאה מקיפה של הקובץ המקורי...*
