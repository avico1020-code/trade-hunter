# תוכנית עדכון - Trade Router

**תאריך:** 2024  
**מבוסס על:** `combined_conversation.md` - הדרישות המקוריות

---

## 🎯 מטרת העדכון

לעדכן את הקוד ב-`app/trade-router/page.tsx` כדי להתאים לכל הדרישות המקוריות מהקובץ המקורי.

---

## 📋 מה שחסר / צריך לתקן

### 1. **Global Config - חסר לחלוטין** ❌ **קריטי**

צריך להוסיף טאב חדש "הגדרות גלובליות" עם:

```typescript
interface GlobalConfig {
  tradingEnabled: boolean;
  // Module toggles
  useMacro: boolean;
  useSectorMacro: boolean;
  useNews: boolean;
  useTechnical: boolean;
  usePriceAction: boolean;
  useOptionsFlow: boolean;
  useSentiment: boolean;
  useFundamentals: boolean;
  usePositionRisk: boolean;
  useStrategyContext: boolean;
  // Module weights
  moduleWeights: {
    macro: number;
    sectorMacro: number;
    news: number;
    technical: number;
    priceAction: number;
    optionsFlow: number;
    sentiment: number;
    fundamentals: number;
    positionRisk: number;
    strategyContext: number;
  };
  // Master scoring settings
  directionThreshold: number;
  minAbsScoreForScanner: number;
  rescoreIntervalSeconds: number;
}
```

### 2. **Strategy Context - חסר לחלוטין** ❌ **קריטי**

צריך להוסיף טאב/סקשן חדש עם:

```typescript
interface StrategyContextConfig {
  strategies: {
    DOUBLE_TOP: { enabled: boolean; direction: "LONG" | "SHORT" | "BOTH"; priority: number }
    DOUBLE_BOTTOM: { ... }
    BREAKOUT: { ... }
    GAP_FILL: { ... }
    REVERSAL: { ... }
    // ... כל האסטרטגיות
  }
}
```

### 3. **Price Action Patterns - חלקי** ⚠️

**מה שיש:** רק Double Top  
**מה שחסר:**
- Double Bottom
- Breakout
- Breakdown
- Gaps
- Candles
- Trend Structure
- Level Reactions

### 4. **פרמטרים חסרים בכל המחלקות** ⚠️

#### News:
- ❌ `sectorSensitivityMultiplier`
- ❌ פרמטרים נוספים מהקובץ המקורי

#### Options Flow:
- ❌ `base_weight` per group
- ❌ `OI multipliers`
- ❌ פרמטרים נוספים

#### Sentiment:
- ❌ `MINOR/MAJOR` timeframe split
- ❌ `states per timeframe`
- ❌ פרמטרים נוספים

#### Fundamentals:
- ❌ `ROA`, `ROIC`
- ❌ `FCF Yield`
- ❌ פרמטרים נוספים

#### Position Risk:
- ❌ `rr_multiple_live`
- ❌ `stress position metric`
- ❌ פרמטרים נוספים

### 5. **פרמטרים עודפים** ⚠️

**ב-UI אבל לא ב-Rulebook:**
- ❌ `includeEmergencyNews`
- ❌ `includeSocialNews`
- ❌ `atrVolatilityThreshold`
- ❌ `sentimentSmoothingPeriod`

**צריך למחוק או להסביר למה הם קיימים**

---

## 📝 שלבי העדכון

### שלב 1: הוספת Global Config ✅ **קריטי**
- [ ] הוספת טאב חדש "הגדרות גלובליות"
- [ ] הוספת כל הפרמטרים של Global Config
- [ ] הוספת דיאלוגי הסבר לכל פרמטר

### שלב 2: הוספת Strategy Context ✅ **קריטי**
- [ ] הוספת סקשן חדש ב-Scanner או טאב נפרד
- [ ] הוספת כל האסטרטגיות
- [ ] הוספת דיאלוגי הסבר

### שלב 3: השלמת Price Action Patterns
- [ ] הוספת כל התבניות החסרות
- [ ] הוספת פרמטרים לכל תבנית

### שלב 4: תיקון פרמטרים חסרים
- [ ] הוספת פרמטרים חסרים בכל המחלקות
- [ ] הסרת פרמטרים עודפים (או הסבר למה הם קיימים)

### שלב 5: בדיקה וסיום
- [ ] בדיקת linting
- [ ] בדיקת TypeScript errors
- [ ] בדיקת UI consistency

---

## 🚀 התחלה

**מתחיל עם שלב 1: הוספת Global Config**

---

*תוכנית זו עודכנה בהתאם לממצאים מהקובץ המקורי...*

