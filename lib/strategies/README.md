# Strategy Utilities - מדריך שימוש

## 📋 סקירה כללית

נוצרו 3 קבצי utilities המספקים פונקציות עזר לזיהוי תבניות ואסטרטגיות:

1. **`candle-patterns.ts`** - זיהוי נרות היפוך
2. **`support-resistance.ts`** - זיהוי רמות תמיכה/התנגדות
3. **`stop-levels.ts`** - חישוב סטופים מתקדם

---

## 🕯️ Candle Patterns (`candle-patterns.ts`)

### זיהוי נרות היפוך

```typescript
import { detectReversalCandles, findNearestReversalCandle } from "./candle-patterns";

// זיהוי נרות היפוך בנר ספציפי
const reversals = detectReversalCandles(candles, candleIndex);
// מחזיר: Array<ReversalCandleInfo>

// מציאת נר היפוך הקרוב ביותר
const nearestReversal = findNearestReversalCandle(
  candles,
  currentIndex,
  20, // lookback
  "LONG" // או "SHORT"
);

// שימוש לסטופ
if (nearestReversal) {
  const stopPrice = getStopFromReversalCandle(
    nearestReversal,
    "LONG",
    0.05 // buffer
  );
}
```

### סוגי נרות היפוך נתמכים:
- **HAMMER** - נר היפוך לירידה (bullish)
- **SHOOTING_STAR** - נר היפוך לעלייה (bearish)
- **ENGULFING_BULLISH** / **ENGULFING_BEARISH** - בליעת נר
- **DOJI** - חוסר החלטיות
- **PIN_BAR_BULLISH** / **PIN_BAR_BEARISH** - נר עם צל ארוך
- **INSIDE_BAR** / **OUTSIDE_BAR** - נרות קמורים/מתקפלים
- **DARK_CLOUD_COVER** / **PIERCING_PATTERN** - תבניות היפוך קלאסיות

---

## 📊 Support & Resistance (`support-resistance.ts`)

### זיהוי רמות תמיכה/התנגדות

```typescript
import {
  findHorizontalSupportResistance,
  findNearestSupportResistance,
  findDynamicSupportResistance,
  getPivotLevelsFromCandle,
} from "./support-resistance";

// רמות אופקיות
const horizontalLevels = findHorizontalSupportResistance(candles, {
  minTouches: 2, // מינימום נגיעות
  priceTolerance: 0.002, // 0.2% סובלנות
  lookback: 100, // 100 נרות אחורה
});

// רמה דינמית (MA)
const maLevel = findDynamicSupportResistance(candles, {
  type: "EMA",
  period: 20,
});

// רמות Pivot
const pivotLevels = getPivotLevelsFromCandle(candles, currentIndex);

// מציאת רמה קרובה
const nearestLevel = findNearestSupportResistance(
  levels,
  currentPrice,
  "LONG" // או "SHORT"
);
```

---

## 🎯 Stop Levels (`stop-levels.ts`)

### חישוב סטופים מתקדם

```typescript
import {
  calculateStopLevel,
  calculateStopWithFallback,
  StopLevelConfig,
} from "./stop-levels";

// דוגמה 1: סטופ על בסיס נר היפוך
const stopConfig: StopLevelConfig = {
  method: "REVERSAL_CANDLE",
  lookback: 20,
  buffer: 0.05, // buffer של 5 סנט
  bufferType: "POINTS",
  minReversalStrength: 0.6,
};

const stop1 = calculateStopLevel(
  candles,
  entryPrice,
  entryIndex,
  "LONG",
  stopConfig
);

// דוגמה 2: סטופ על בסיס רמת תמיכה
const stopConfig2: StopLevelConfig = {
  method: "SUPPORT_RESISTANCE",
  lookback: 100,
  buffer: 0.1, // buffer של 10 סנט
  bufferType: "POINTS",
  minS/RStrength: 0.5,
};

const stop2 = calculateStopLevel(
  candles,
  entryPrice,
  entryIndex,
  "LONG",
  stopConfig2
);

// דוגמה 3: סטופ עם fallback (מנסה שיטות שונות)
const stop3 = calculateStopWithFallback(
  candles,
  entryPrice,
  entryIndex,
  "LONG",
  [
    { method: "REVERSAL_CANDLE", lookback: 20, minReversalStrength: 0.7 },
    { method: "SUPPORT_RESISTANCE", minS/RStrength: 0.6 },
    { method: "ATR_BASED", atrMultiplier: 2 },
  ]
);
```

### שיטות סטופ נתמכות:

1. **`REVERSAL_CANDLE`** - על בסיס נר היפוך
   - "סטופ במחיר הנמוך של נר היפוך bearish"

2. **`SUPPORT_RESISTANCE`** - על בסיס רמת תמיכה/התנגדות
   - "סטופ מדלג למחיר הנמוך של רמת ההתנגדות"

3. **`PIVOT_LEVEL`** - על בסיס Pivot Points

4. **`DYNAMIC_MA`** - על בסיס Moving Average

5. **`ATR_BASED`** - על בסיס ATR (נפוץ מאוד)

6. **`FIXED_PERCENTAGE`** - אחוז קבוע

---

## 💡 דוגמאות שימוש באסטרטגיות

### דוגמה 1: שימוש ב-DoubleTop

```typescript
// lib/strategies/double-top.ts

import { calculateStopFromReversalCandle } from "./stop-levels";

stopsForEntry1(data: Candle[], st: PatternState): StopLevels | null {
  if (st.secondPeakIdx == null) return null;

  // נסה למצוא סטופ על בסיס נר היפוך
  const reversalStop = calculateStopFromReversalCandle(
    data,
    st.secondPeakIdx,
    "SHORT", // DoubleTop הוא short strategy
    {
      method: "REVERSAL_CANDLE",
      lookback: 15,
      buffer: 0.05,
      minReversalStrength: 0.6,
    }
  );

  if (reversalStop) {
    return {
      initial: reversalStop.price,
      trailing: undefined,
    };
  }

  // Fallback לשיטה הקיימת
  const initial = data[st.secondPeakIdx].high;
  const trailing = this.cfg.stop1_trailing_byResistances
    ? this.lastBrokenLowerHighStop(data, st.secondPeakIdx)
    : undefined;

  return { initial, trailing };
}
```

### דוגמה 2: שימוש ב-LiquiditySweepBreakout

```typescript
// lib/strategies/liquidity-sweep-breakout.ts

import { calculateStopWithFallback } from "./stop-levels";

stops(
  candles: Candle[],
  state: LiquiditySweepPatternState
): StopLevels | null {
  if (!state.patternFound || state.breakoutIndex == null) {
    return null;
  }

  const entryPrice = state.breakoutLevel!;
  const direction = state.direction!;

  // נסה מספר שיטות לפי סדר עדיפות
  const calculatedStop = calculateStopWithFallback(
    candles,
    entryPrice,
    state.breakoutIndex,
    direction,
    [
      // 1. נסה נר היפוך
      {
        method: "REVERSAL_CANDLE",
        lookback: 20,
        buffer: state.atrAtBreakout! * 0.1, // buffer של 10% ATR
        bufferType: "POINTS",
        minReversalStrength: 0.7,
      },
      // 2. נסה רמת תמיכה/התנגדות
      {
        method: "SUPPORT_RESISTANCE",
        lookback: 50,
        buffer: state.atrAtBreakout! * 0.1,
        bufferType: "POINTS",
        minS/RStrength: 0.5,
      },
      // 3. נסה ATR (fallback)
      {
        method: "ATR_BASED",
        atrMultiplier: 2,
      },
    ]
  );

  if (calculatedStop) {
    return {
      initial: calculatedStop.price,
      trailing: undefined, // ניתן להוסיף trailing stop כאן
    };
  }

  // Fallback לשיטה הקיימת
  const atr = state.atrAtBreakout || 0;
  const initialStopPrice =
    direction === "LONG"
      ? Math.min(state.sweepLevel!, state.pivotLevel!) -
        atr * this.bufferAtrMultiplier
      : Math.max(state.sweepLevel!, state.pivotLevel!) +
        atr * this.bufferAtrMultiplier;

  return {
    initial: initialStopPrice,
    trailing: undefined,
  };
}
```

---

## ✅ יתרונות

1. **קוד מודולרי** - כל פונקציה עושה דבר אחד היטב
2. **ניתן לשימוש חוזר** - כל אסטרטגיה יכולה להשתמש באותן פונקציות
3. **גמישות** - תצורת stop level יכולה להיות מורכבת
4. **Fallback** - ניתן לנסות מספר שיטות לפי סדר עדיפות
5. **Type-safe** - כל הפונקציות עם TypeScript strict

---

## 🔄 שלבים הבאים

1. ✅ יצירת utilities
2. ⏳ עדכון אסטרטגיות קיימות (DoubleTop, LiquiditySweepBreakout)
3. ⏳ יצירת אסטרטגיות חדשות עם utilities
4. ⏳ בדיקות (unit tests)

