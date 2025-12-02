# 📖 דוגמה מעשית: איך אסטרטגיות משתמשות ב-Utilities

## 🎯 הרעיון הכללי

**Utilities = ספרייה של תבניות + כלים בסיסיים**

אסטרטגיות יכולות:
- ✅ להשתמש בתבניות מהספרייה (פשוט ומהיר)
- ✅ לבנות מהכלים הבסיסיים (גמיש ומותאם)
- ✅ לשלב בין השניים

---

## 📋 דוגמה 1: DoubleTop - גישה פשוטה

### הגישה הנוכחית (ללא utilities):

```typescript
// lib/strategies/double-top.ts
export class DoubleTopStrategy {
  detectPattern(candles: Candle[]) {
    // כל הלוגיקה כתובה כאן
    const peaks = this.findPeaks(candles);  // פונקציה פנימית
    // ... הרבה קוד ...
  }
  
  private findPeaks(data: Candle[]) {
    // לוגיקה חוזרת על עצמה
  }
}
```

### הגישה החדשה (עם utilities - ספרייה):

```typescript
// lib/strategies/double-top.ts
import { DOUBLE_TOP_PATTERN } from "../utilities/pattern-library";

export class DoubleTopStrategy {
  detectPattern(candles: Candle[], context: StrategyContext) {
    // 1. השתמש בתבנית מהספרייה
    const patternResult = DOUBLE_TOP_PATTERN.detect(candles, {
      peakTolerance: this.cfg.peakTolerancePct / 100,
      requireRejection: true,
      requireConfirmation: true,
    });
    
    if (!patternResult.found) {
      return { patternFound: false };
    }
    
    // 2. בדוק תנאים ספציפיים לאסטרטגיה
    if (context.masterScore < this.cfg.minMasterScore) {
      return { patternFound: false };
    }
    
    if (patternResult.strength < this.cfg.minPatternStrength) {
      return { patternFound: false };
    }
    
    // 3. החזר תוצאה
    return {
      patternFound: true,
      firstPeakIdx: patternResult.peak1Index,
      secondPeakIdx: patternResult.peak2Index,
      neckline: patternResult.neckline,
      strength: patternResult.strength,
    };
  }
}
```

**יתרונות:**
- ✅ קוד קצר יותר
- ✅ פחות שגיאות (הלוגיקה נבדקת)
- ✅ עקבי עם אסטרטגיות אחרות

---

## 📋 דוגמה 2: DoubleTop - גישה מותאמת

### אם צריך לוגיקה ספציפית:

```typescript
// lib/strategies/double-top.ts
import {
  findPeaksAsResistance,
  REJECTION_AT_RESISTANCE,
  CONFIRMED_REJECTION,
  findNecklineBetween,
} from "../utilities";

export class DoubleTopStrategy {
  detectPattern(candles: Candle[], context: StrategyContext) {
    // 1. מצא שיאים (כלי בסיסי)
    const peaks = findPeaksAsResistance(candles, {
      minLookback: this.cfg.lookbackPeriod,
      priceTolerance: this.cfg.peakTolerancePct / 100,
      minStrength: 0.3,
    });
    
    if (peaks.length < 2) {
      return { patternFound: false };
    }
    
    // 2. בדוק שני שיאים קרובים (לוגיקה מותאמת)
    const peak1 = peaks[peaks.length - 2];
    const peak2 = peaks[peaks.length - 1];
    
    // בדיקה מותאמת: האם יש ירידה מספקת בין השיאים?
    const dropBetween = this.findDropBetween(candles, peak1.index, peak2.index);
    if (dropBetween < this.cfg.minDropBetweenPct / 100) {
      return { patternFound: false };
    }
    
    // 3. בדוק דחייה (תבנית מהספרייה)
    const rejection = REJECTION_AT_RESISTANCE.detect(
      candles,
      peak1.level,
      peak2.index,
      { tolerance: this.cfg.rejectionTolerancePct / 100 }
    );
    
    if (!rejection.found || rejection.strength < 0.7) {
      return { patternFound: false };
    }
    
    // 4. בדוק אישור (תבנית מהספרייה)
    const confirmation = CONFIRMED_REJECTION.detect(
      candles,
      peak2.index
    );
    
    if (!confirmation.found) {
      return { patternFound: false };
    }
    
    // 5. מצא neckline (כלי בסיסי)
    const neckline = findNecklineBetween(
      candles,
      peak1.index,
      peak1.level,
      peak2.index,
      peak2.level
    );
    
    // 6. בדוק תנאים ספציפיים
    if (context.masterScore < this.cfg.minMasterScore) {
      return { patternFound: false };
    }
    
    // 7. החזר תוצאה
    return {
      patternFound: true,
      firstPeakIdx: peak1.index,
      secondPeakIdx: peak2.index,
      neckline: neckline?.level ?? null,
      strength: rejection.strength * confirmation.strength,
    };
  }
  
  // פונקציה מותאמת - לא קיימת ב-utilities
  private findDropBetween(candles: Candle[], idx1: number, idx2: number): number {
    // לוגיקה ספציפית לאסטרטגיה
    const lowBetween = Math.min(...candles.slice(idx1, idx2 + 1).map(c => c.low));
    const peak1Price = candles[idx1].high;
    return (peak1Price - lowBetween) / peak1Price;
  }
}
```

**יתרונות:**
- ✅ גמיש - יכול לעשות כל מה שרוצה
- ✅ משתמש בתבניות נפוצות (פחות קוד)
- ✅ יכול להוסיף לוגיקה מותאמת

---

## 📋 דוגמה 3: Liquidity Sweep - רק כלים בסיסיים

### אם צריך הרבה לוגיקה מותאמת:

```typescript
// lib/strategies/liquidity-sweep-breakout.ts
import {
  isRejectionCandle,
  findHorizontalSupportResistance,
  calculateStopFromSupportResistance,
} from "../utilities";

export class LiquiditySweepBreakoutStrategy {
  detectPattern(candles: Candle[], context: StrategyContext) {
    // 1. מצא רמות תמיכה/התנגדות (כלי בסיסי)
    const levels = findHorizontalSupportResistance(candles, {
      lookback: 50,
      minTouches: 2,
      tolerancePct: 0.002,
    });
    
    // 2. מצא sweep (לוגיקה מותאמת - לא קיימת ב-utilities)
    const sweepLevel = this.findLiquiditySweep(candles, levels);
    if (!sweepLevel) {
      return { patternFound: false };
    }
    
    // 3. בדוק דחייה (כלי בסיסי)
    const lastCandle = candles[candles.length - 1];
    const isRejection = isRejectionCandle(
      lastCandle,
      sweepLevel,
      0.002
    );
    
    if (!isRejection) {
      return { patternFound: false };
    }
    
    // 4. בדוק breakout (לוגיקה מותאמת)
    const breakout = this.detectBreakout(candles, sweepLevel);
    if (!breakout) {
      return { patternFound: false };
    }
    
    // 5. החזר תוצאה
    return {
      patternFound: true,
      sweepLevel,
      breakoutPrice: breakout.price,
      // ...
    };
  }
  
  // פונקציות מותאמות - לא קיימות ב-utilities
  private findLiquiditySweep(candles: Candle[], levels: SupportResistanceLevel[]) {
    // לוגיקה ספציפית ל-Liquidity Sweep
  }
  
  private detectBreakout(candles: Candle[], level: number) {
    // לוגיקה ספציפית ל-Breakout
  }
}
```

**יתרונות:**
- ✅ גמישות מקסימלית
- ✅ משתמש רק במה שצריך
- ✅ לוגיקה מותאמת מלאה

---

## 🎯 סיכום: מתי להשתמש במה?

### ✅ השתמש בתבניות מהספרייה (DOUBLE_TOP_PATTERN) אם:
- התבנית נפוצה (DoubleTop, Head & Shoulders)
- האסטרטגיה פשוטה (רק בדיקת תנאים נוספים)
- רוצה consistency בין אסטרטגיות

### ✅ השתמש בתבניות פשוטות (REJECTION_AT_RESISTANCE) אם:
- צריך חלק מהתבנית (רק דחייה, לא DoubleTop שלם)
- רוצה לשלב כמה תבניות יחד
- רוצה יותר control על הפרמטרים

### ✅ השתמש בכלים בסיסיים (isRejectionCandle) אם:
- צריך לוגיקה מותאמת מאוד
- רוצה לבנות משהו חדש
- התבנית לא קיימת בספרייה

---

## 💡 המלצה לכל אסטרטגיה

### DoubleTop:
```typescript
// גישה 1: פשוט (מומלץ)
const pattern = DOUBLE_TOP_PATTERN.detect(candles, options);
if (pattern.found && checkConditions(pattern)) {
  return pattern;
}

// גישה 2: מותאם (אם צריך)
const peaks = findPeaksAsResistance(candles);
const rejection = REJECTION_AT_RESISTANCE.detect(...);
const confirmation = CONFIRMED_REJECTION.detect(...);
// ... לוגיקה מותאמת ...
```

### Liquidity Sweep:
```typescript
// גישה: כלים בסיסיים (מומלץ - תבנית מותאמת)
const levels = findHorizontalSupportResistance(candles);
const sweep = this.findLiquiditySweep(candles, levels);
const rejection = isRejectionCandle(...);
// ... לוגיקה מותאמת ...
```

---

**המטרה: כל אסטרטגיה בוחרת מה הכי מתאים לה! 🎯**

