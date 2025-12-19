# 📐 Strategy Utilities Architecture - מדריך למבנה ומילוי

## 🎯 סקירה כללית

המחלקות Utilities הן **3 קבצים נפרדים** המספקים פונקציות עזר לזיהוי תבניות ואסטרטגיות:

```
lib/strategies/
├── candle-patterns.ts       ← זיהוי נרות היפוך
├── support-resistance.ts    ← זיהוי רמות תמיכה/התנגדות
└── stop-levels.ts           ← חישוב סטופים מתקדם
```

---

## 📋 קובץ 1: `candle-patterns.ts` - זיהוי נרות היפוך

### 🎯 מטרה
זיהוי תבניות נרות היפוך (Reversal Candles) שיכולות לסמן סיום מגמה.

### 📦 מה צריך להכיל

#### 1. Types & Interfaces
```typescript
// רשימת כל סוגי נרות ההיפוך
export type ReversalCandleType =
  | "HAMMER"
  | "SHOOTING_STAR"
  | "ENGULFING_BULLISH"
  | "ENGULFING_BEARISH"
  | "DOJI"
  | "PIN_BAR_BULLISH"
  | "PIN_BAR_BEARISH"
  | "INSIDE_BAR"
  | "OUTSIDE_BAR"
  | "DARK_CLOUD_COVER"
  | "PIERCING_PATTERN";

// מידע על נר היפוך שנמצא
export interface ReversalCandleInfo {
  type: ReversalCandleType;
  index: number;              // אינדקס הנר במערך
  candle: Candle;             // הנתונים של הנר
  strength: number;           // 0-1, כמה חזק האות
}
```

#### 2. Helper Functions (פנימיות)
```typescript
// חישוב חלקי הנר (גוף, צל עליון, צל תחתון)
function getCandleParts(candle: Candle) {
  return {
    body,              // גודל הגוף
    upperShadow,       // צל עליון
    lowerShadow,       // צל תחתון
    totalRange,        // טווח מלא
    isBullish,         // נר לבן/ירוק
    bodyRatio,         // אחוז הגוף מהטווח
    upperShadowRatio,  // אחוז הצל העליון
    lowerShadowRatio,  // אחוז הצל התחתון
  };
}
```

#### 3. Detection Functions (ספציפיות לכל סוג נר)
כל פונקציה מקבלת `Candle` ומחזירה `boolean`:

```typescript
// דוגמה: Hammer
export function isHammer(
  candle: Candle,
  minLowerShadowRatio = 0.6,  // מינימום 60% צל תחתון
  maxBodyRatio = 0.3          // מקסימום 30% גוף
): boolean {
  const parts = getCandleParts(candle);
  
  // תנאים:
  // 1. צל תחתון ארוך (לפחות 60%)
  // 2. גוף קטן (עד 30%)
  // 3. צל עליון קצר (עד 15%)
  
  return hasLongLowerShadow && hasSmallBody && hasShortUpperShadow;
}

// דוגמה: Engulfing (צריך 2 נרות)
export function isBullishEngulfing(
  prevCandle: Candle,
  currentCandle: Candle
): boolean {
  // תנאים:
  // 1. נר קודם היה אדום (bearish)
  // 2. נר נוכחי הוא לבן (bullish)
  // 3. הגוף הנוכחי "בולע" את הגוף הקודם
}
```

#### 4. Main Detection Function
```typescript
// זיהוי כל סוגי נרות ההיפוך בנר נתון
export function detectReversalCandles(
  candles: Candle[],
  index: number
): ReversalCandleInfo[] {
  const results: ReversalCandleInfo[] = [];
  const candle = candles[index];
  
  // בדיקת כל סוג נר
  if (isHammer(candle)) {
    results.push({
      type: "HAMMER",
      index,
      candle,
      strength: calculateStrength(candle), // 0-1
    });
  }
  
  if (isShootingStar(candle)) { ... }
  if (isBullishEngulfing(prevCandle, candle)) { ... }
  // ... כל הסוגים
  
  return results;
}
```

#### 5. Utility Functions
```typescript
// מציאת נר היפוך הקרוב ביותר
export function findNearestReversalCandle(
  candles: Candle[],
  targetIndex: number,
  lookback = 20,
  direction?: "LONG" | "SHORT"  // פילטר לפי כיוון
): ReversalCandleInfo | null

// חישוב stop מהנר
export function getStopFromReversalCandle(
  reversalCandle: ReversalCandleInfo,
  direction: "LONG" | "SHORT",
  buffer = 0
): number | null
```

### 📝 טמפלט לכתיבת פונקציית זיהוי נר חדש

```typescript
/**
 * זיהוי [שם נר] - [תיאור]
 * Conditions:
 * - [תנאי 1]
 * - [תנאי 2]
 * - [תנאי 3]
 */
export function is[שם הנר](
  candle: Candle,
  // פרמטרים נוספים (אם צריך)
  option1 = defaultValue1,
  option2 = defaultValue2
): boolean {
  if (!candle) return false;
  
  const parts = getCandleParts(candle);
  if (parts.totalRange === 0) return false;
  
  // בדיקת תנאים
  const condition1 = /* בדיקה */;
  const condition2 = /* בדיקה */;
  const condition3 = /* בדיקה */;
  
  return condition1 && condition2 && condition3;
}

// אם הנר צריך 2 נרות:
export function is[שם הנר](
  prevCandle: Candle,
  currentCandle: Candle
): boolean {
  if (!prevCandle || !currentCandle) return false;
  
  // בדיקת תנאים בין 2 נרות
  
  return /* תנאי */;
}
```

### 🔗 קישור לאסטרטגיות
```typescript
// באסטרטגיה:
import { detectReversalCandles, findNearestReversalCandle } from "./candle-patterns";

// שימוש:
const reversals = detectReversalCandles(candles, currentIndex);
const nearestReversal = findNearestReversalCandle(candles, index, 20, "LONG");
```

---

## 📋 קובץ 2: `support-resistance.ts` - רמות תמיכה/התנגדות

### 🎯 מטרה
זיהוי רמות תמיכה והתנגדות (אופקיות, דינמיות, Pivot, פסיכולוגיות).

### 📦 מה צריך להכיל

#### 1. Types & Interfaces
```typescript
export interface SupportResistanceLevel {
  price: number;                    // מחיר הרמה
  type: "SUPPORT" | "RESISTANCE";   // סוג הרמה
  strength: number;                 // 0-1, חוזק הרמה
  touches: number;                  // כמה פעמים נגעו ברמה
  firstTouchIndex: number;          // אינדקס הנגיעה הראשונה
  lastTouchIndex: number;           // אינדקס הנגיעה האחרונה
  source:                           // מקור הרמה
    | "HORIZONTAL"                  // רמה אופקית
    | "DYNAMIC_MA"                  // MA דינמי
    | "DYNAMIC_EMA"                 // EMA דינמי
    | "PIVOT"                       // Pivot Point
    | "PSYCHOLOGICAL";              // רמה פסיכולוגית
}
```

#### 2. Horizontal S/R Detection
```typescript
/**
 * זיהוי רמות אופקיות
 * מחפש מחירים שהמחיר נגע בהם מספר פעמים
 */
export function findHorizontalSupportResistance(
  candles: Candle[],
  options: {
    minTouches?: number;        // מינימום נגיעות (default: 2)
    priceTolerance?: number;    // סובלנות במחיר (default: 0.2%)
    lookback?: number;          // כמה נרות אחורה (default: 100)
  } = {}
): SupportResistanceLevel[] {
  // אלגוריתם:
  // 1. איסוף כל הנקודות הגבוהות והנמוכות
  // 2. קיבוץ מחירים קרובים יחד (לפי tolerance)
  // 3. ספירת נגיעות בכל רמה
  // 4. חישוב strength לפי מספר נגיעות
  // 5. החזרת רמות עם minTouches או יותר
}
```

#### 3. Dynamic S/R (MA/EMA)
```typescript
/**
 * רמות דינמיות על בסיס Moving Average
 */
export function findDynamicSupportResistance(
  candles: Candle[],
  options: {
    type: "SMA" | "EMA";
    period: number;              // תקופת ה-MA (20, 50, 200...)
    lookback?: number;
  }
): SupportResistanceLevel | null {
  // 1. חישוב MA/EMA
  // 2. בדיקה אם המחיר מעל/מתחת
  // 3. החזרת רמה (SUPPORT אם מעל, RESISTANCE אם מתחת)
}
```

#### 4. Pivot Points
```typescript
/**
 * Pivot Point = (High + Low + Close) / 3
 * Support 1 = 2 * Pivot - High
 * Resistance 1 = 2 * Pivot - Low
 */
export function calculatePivotLevels(
  prevHigh: number,
  prevLow: number,
  prevClose: number
): {
  pivot: number;
  support1: number;
  support2: number;
  resistance1: number;
  resistance2: number;
}

export function getPivotLevelsFromCandle(
  candles: Candle[],
  index: number
): SupportResistanceLevel[]
```

#### 5. Psychological Levels
```typescript
/**
 * רמות פסיכולוגיות (מספרים עגולים)
 * למשל: 100, 1000, 150.00
 */
export function findPsychologicalLevels(
  currentPrice: number,
  range = 0.1  // 10% סביב המחיר
): SupportResistanceLevel[]
```

#### 6. Utility Functions
```typescript
// מציאת רמה קרובה למחיר
export function findNearestSupportResistance(
  levels: SupportResistanceLevel[],
  currentPrice: number,
  direction?: "LONG" | "SHORT"  // פילטר לפי כיוון
): SupportResistanceLevel | null
```

### 📝 טמפלט לכתיבת פונקציית זיהוי רמה חדשה

```typescript
/**
 * זיהוי [שם רמה] - [תיאור]
 * 
 * אלגוריתם:
 * 1. [שלב 1]
 * 2. [שלב 2]
 * 3. [שלב 3]
 */
export function find[שם הרמה](
  candles: Candle[],
  options: {
    param1?: type1,
    param2?: type2,
  } = {}
): SupportResistanceLevel | SupportResistanceLevel[] {
  const { param1 = defaultValue1, param2 = defaultValue2 } = options;
  
  // 1. חישוב/זיהוי הרמות
  const levels: SupportResistanceLevel[] = [];
  
  // 2. לולאה על הנרות
  for (let i = 0; i < candles.length; i++) {
    // בדיקה/חישוב
    const levelPrice = /* חישוב */;
    
    if (/* תנאי */) {
      levels.push({
        price: levelPrice,
        type: "SUPPORT" | "RESISTANCE",
        strength: /* חישוב */,  // 0-1
        touches: /* מספר */,
        firstTouchIndex: i,
        lastTouchIndex: i,
        source: "SOURCE_NAME",
      });
    }
  }
  
  // 3. פילטור ומיון
  return levels
    .filter(level => /* תנאי */)
    .sort((a, b) => b.strength - a.strength);
}
```

### 🔗 קישור לאסטרטגיות
```typescript
// באסטרטגיה:
import {
  findHorizontalSupportResistance,
  findNearestSupportResistance,
} from "./support-resistance";

// שימוש:
const levels = findHorizontalSupportResistance(candles, { minTouches: 2 });
const nearest = findNearestSupportResistance(levels, currentPrice, "LONG");
```

---

## 📋 קובץ 3: `stop-levels.ts` - חישוב סטופים

### 🎯 מטרה
חישוב מחירי Stop Loss על בסיס נרות היפוך, רמות תמיכה/התנגדות, ATR, וכו'.

### 📦 מה צריך להכיל

#### 1. Types & Interfaces
```typescript
export type StopMethod =
  | "REVERSAL_CANDLE"        // על בסיס נר היפוך
  | "SUPPORT_RESISTANCE"     // על בסיס רמת תמיכה/התנגדות
  | "PIVOT_LEVEL"            // על בסיס Pivot Point
  | "PSYCHOLOGICAL"          // על בסיס רמה פסיכולוגית
  | "DYNAMIC_MA"             // על בסיס MA
  | "ATR_BASED"              // על בסיס ATR
  | "FIXED_PERCENTAGE";      // אחוז קבוע

export interface StopLevelConfig {
  method: StopMethod;
  
  // Options לפי סוג הסטופ
  lookback?: number;                    // כמה נרות אחורה
  buffer?: number;                      // buffer במחיר
  bufferType?: "POINTS" | "PERCENTAGE"; // סוג buffer
  minReversalStrength?: number;         // מינימום חוזק נר (0-1)
  minS/RStrength?: number;              // מינימום חוזק רמה (0-1)
  atrMultiplier?: number;               // מכפיל ATR
  percentage?: number;                  // אחוז (אם FIXED_PERCENTAGE)
  maPeriod?: number;                    // תקופת MA
  maType?: "SMA" | "EMA";               // סוג MA
}

export interface CalculatedStop {
  price: number;                        // מחיר הסטופ
  method: StopMethod;                   // השיטה שבה השתמשנו
  source: string;                       // תיאור המקור
  confidence: number;                   // 0-1, בטחון בסטופ
}
```

#### 2. Specific Stop Calculation Functions
כל פונקציה מחשבת stop לפי שיטה ספציפית:

```typescript
/**
 * סטופ על בסיס נר היפוך
 * דוגמה: "סטופ במחיר הנמוך של נר היפוך bearish"
 */
export function calculateStopFromReversalCandle(
  candles: Candle[],
  currentIndex: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  // 1. מציאת נר היפוך (משימוש ב-candle-patterns.ts)
  const reversalCandle = findNearestReversalCandle(
    candles, currentIndex, config.lookback, direction
  );
  
  if (!reversalCandle) return null;
  
  // 2. חישוב מחיר stop מהנר
  let stopPrice = getStopFromReversalCandle(reversalCandle, direction, 0);
  
  // 3. הוספת buffer
  stopPrice = applyBuffer(stopPrice, config.buffer, config.bufferType, direction);
  
  // 4. החזרת תוצאה
  return {
    price: stopPrice,
    method: "REVERSAL_CANDLE",
    source: `${reversalCandle.type} at index ${reversalCandle.index}`,
    confidence: reversalCandle.strength,
  };
}

/**
 * סטופ על בסיס רמת תמיכה/התנגדות
 * דוגמה: "סטופ מדלג למחיר הנמוך של רמת ההתנגדות"
 */
export function calculateStopFromSupportResistance(
  candles: Candle[],
  currentIndex: number,
  currentPrice: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  // 1. מציאת רמות (משימוש ב-support-resistance.ts)
  const levels = findHorizontalSupportResistance(candles, {
    lookback: config.lookback,
  });
  
  // 2. מציאת רמה קרובה
  const nearestLevel = findNearestSupportResistance(
    levels, currentPrice, direction
  );
  
  if (!nearestLevel) return null;
  
  // 3. חישוב stop + buffer
  // ...
}

/**
 * סטופ על בסיס ATR
 */
export function calculateStopFromATR(
  candles: Candle[],
  currentPrice: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  // 1. חישוב ATR
  const atr = calculateATR(candles, config.atrPeriod || 14);
  
  // 2. חישוב stop = currentPrice ± (ATR * multiplier)
  const stopPrice = direction === "LONG"
    ? currentPrice - atr * config.atrMultiplier!
    : currentPrice + atr * config.atrMultiplier!;
  
  // 3. החזרת תוצאה
  return {
    price: stopPrice,
    method: "ATR_BASED",
    source: `ATR(${config.atrPeriod}) * ${config.atrMultiplier}`,
    confidence: 0.7,
  };
}

// ... עוד פונקציות לכל סוג stop
```

#### 3. Universal Stop Calculator
```typescript
/**
 * פונקציה אוניברסלית - מנתבת לפי method
 */
export function calculateStopLevel(
  candles: Candle[],
  entryPrice: number,
  entryIndex: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  switch (config.method) {
    case "REVERSAL_CANDLE":
      return calculateStopFromReversalCandle(candles, entryIndex, direction, config);
    
    case "SUPPORT_RESISTANCE":
      return calculateStopFromSupportResistance(
        candles, entryIndex, entryPrice, direction, config
      );
    
    case "ATR_BASED":
      return calculateStopFromATR(candles, entryPrice, direction, config);
    
    // ... כל השיטות
    
    default:
      return null;
  }
}
```

#### 4. Fallback Calculator
```typescript
/**
 * מנסה מספר שיטות לפי סדר עדיפות
 */
export function calculateStopWithFallback(
  candles: Candle[],
  entryPrice: number,
  entryIndex: number,
  direction: "LONG" | "SHORT",
  methods: StopLevelConfig[]  // מערך של configs, לפי סדר עדיפות
): CalculatedStop | null {
  for (const config of methods) {
    const stop = calculateStopLevel(
      candles, entryPrice, entryIndex, direction, config
    );
    
    if (stop && stop.confidence >= (config.minReversalStrength || 0.5)) {
      return stop;
    }
  }
  
  // Fallback לסטופ ATR בסיסי
  return calculateStopFromATR(candles, entryPrice, direction, {
    method: "ATR_BASED",
    atrMultiplier: 2,
  });
}
```

### 📝 טמפלט לכתיבת פונקציית stop חדשה

```typescript
/**
 * חישוב סטופ על בסיס [שם השיטה]
 * 
 * דוגמה: "סטופ [תיאור]"
 */
export function calculateStopFrom[שם השיטה](
  candles: Candle[],
  currentPrice: number,  // או entryPrice
  currentIndex: number,  // או entryIndex
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  // 1. אימות פרמטרים
  if (!candles || candles.length === 0) return null;
  if (config.method !== "[שם השיטה]") return null;
  
  // 2. חישוב/זיהוי (משימוש ב-utilities אחרים)
  const level = /* חישוב או קריאה ל-function מ-support-resistance/candle-patterns */;
  
  if (!level) return null;
  
  // 3. חישוב מחיר stop
  let stopPrice = /* חישוב */;
  
  // 4. הוספת buffer
  const { buffer = 0, bufferType = "POINTS" } = config;
  if (bufferType === "PERCENTAGE") {
    stopPrice = direction === "LONG"
      ? stopPrice * (1 - buffer / 100)
      : stopPrice * (1 + buffer / 100);
  } else {
    stopPrice = direction === "LONG"
      ? stopPrice - buffer
      : stopPrice + buffer;
  }
  
  // 5. החזרת תוצאה
  return {
    price: stopPrice,
    method: "[שם השיטה]",
    source: `[תיאור מקור]`,
    confidence: /* 0-1 */,
  };
}
```

### 🔗 קישור לאסטרטגיות
```typescript
// באסטרטגיה:
import { calculateStopLevel, calculateStopWithFallback } from "./stop-levels";

// שימוש:
const stop = calculateStopLevel(candles, entryPrice, entryIndex, "LONG", {
  method: "REVERSAL_CANDLE",
  lookback: 20,
  buffer: 0.05,
});

// או עם fallback:
const stop = calculateStopWithFallback(candles, entryPrice, entryIndex, "LONG", [
  { method: "REVERSAL_CANDLE", ... },
  { method: "SUPPORT_RESISTANCE", ... },
  { method: "ATR_BASED", ... },
]);
```

---

## 📋 איך למלא את המחלקות - מדריך שלב אחר שלב

### שלב 1: זיהוי צורך חדש

**דוגמה:** "אני רוצה להוסיף זיהוי של נר Head & Shoulders"

**שאלות לפרומפט:**
1. מה הסוג של האלמנט? (נר היפוך / רמה / stop method)
2. מה השם המדויק?
3. מה התנאים המדויקים לזיהוי?
4. איזה פרמטרים צריך (configurable)?

### שלב 2: כתיבת הפרומפט ל-ChatGPT

#### תבנית פרומפט לנר היפוך חדש:
```
אני צריך להוסיף זיהוי נר היפוך חדש בשם "[שם הנר]".

תיאור:
[תיאור מפורט של הנר]

תנאים לזיהוי:
1. [תנאי 1]
2. [תנאי 2]
3. [תנאי 3]

פרמטרים שניתן להתאים:
- [פרמטר 1]: [ערך ברירת מחדל], [תיאור]
- [פרמטר 2]: [ערך ברירת מחדל], [תיאור]

הקוד הקיים נמצא בקובץ lib/strategies/candle-patterns.ts.

צור:
1. פונקציה is[שם הנר]() שמחזירה boolean
2. הוסף את הסוג ל-ReversalCandleType
3. הוסף בדיקה ב-detectReversalCandles()
4. בדוק שהקוד TypeScript strict
```

#### תבנית פרומפט לרמה חדשה:
```
אני צריך להוסיף זיהוי רמת תמיכה/התנגדות חדשה בשם "[שם הרמה]".

תיאור:
[תיאור מפורט של הרמה]

אלגוריתם זיהוי:
1. [שלב 1]
2. [שלב 2]
3. [שלב 3]

פרמטרים:
- [פרמטר 1]: [type], [default], [תיאור]

הקוד הקיים נמצא בקובץ lib/strategies/support-resistance.ts.

צור:
1. פונקציה find[שם הרמה]() שמחזירה SupportResistanceLevel[]
2. הוסף source חדש אם צריך
3. בדוק שהקוד TypeScript strict
```

#### תבנית פרומפט ל-stop method חדש:
```
אני צריך להוסיף שיטת חישוב stop חדשה בשם "[שם השיטה]".

תיאור:
[תיאור מפורט]

דוגמה לשימוש:
"סטופ [תיאור איך זה עובד]"

אלגוריתם:
1. [שלב 1]
2. [שלב 2]

פרמטרים ב-StopLevelConfig:
- [פרמטר 1]: [type], [default], [תיאור]

הקוד הקיים נמצא בקובץ lib/strategies/stop-levels.ts.

צור:
1. פונקציה calculateStopFrom[שם השיטה]()
2. הוסף case חדש ב-calculateStopLevel()
3. בדוק שהקוד TypeScript strict
```

### שלב 3: אימות הקוד

**בדיקות חובה:**
1. ✅ TypeScript strict - אין שגיאות
2. ✅ כל הפונקציות export
3. ✅ Types מוגדרים נכון
4. ✅ ערכים ברירת מחדל מוגדרים
5. ✅ null checks במקומות הנכונים

---

## 📋 דוגמאות פרומפטים מוכנים

### דוגמה 1: נר היפוך - Morning Star

```
אני צריך להוסיף זיהוי נר היפוך בשם "MORNING_STAR".

תיאור:
Morning Star הוא תבנית 3 נרות בולשית (bullish reversal).
מתחיל בנר אדום גדול, ואז נר קטן (גוף קטן) עם gap למטה, ואז נר לבן גדול שסוגר את ה-gap.

תנאים לזיהוי:
1. נר 1: אדום (close < open), גוף גדול (body > 50% מהטווח)
2. נר 2: gap למטה מהנר 1 (open < low של נר 1), גוף קטן מאוד (body < 20% מהטווח)
3. נר 3: לבן (close > open), גוף גדול, סוגר את ה-gap (close > 50% מגוף נר 1)

הקוד הקיים נמצא בקובץ lib/strategies/candle-patterns.ts.

צור:
1. פונקציה isMorningStar(candle1: Candle, candle2: Candle, candle3: Candle): boolean
2. הוסף "MORNING_STAR" ל-ReversalCandleType
3. הוסף בדיקה ב-detectReversalCandles() (צריך לבדוק 3 נרות)
4. בדוק שהקוד TypeScript strict
```

### דוגמה 2: רמה - Fibonacci Retracement

```
אני צריך להוסיף זיהוי רמות Fibonacci Retracement.

תיאור:
רמות Fibonacci מתחילות מנקודה גבוהה ונמוכה (swing high/low),
ואז מחשבות אחוזי retracement: 23.6%, 38.2%, 50%, 61.8%, 78.6%.

אלגוריתם:
1. מציאת swing high ו-swing low בתקופה נתונה
2. חישוב ההבדל (range = high - low)
3. חישוב כל רמת Fibonacci:
   - 23.6%: high - range * 0.236
   - 38.2%: high - range * 0.382
   - 50%: high - range * 0.5
   - 61.8%: high - range * 0.618
   - 78.6%: high - range * 0.786
4. החזרת רמות (SUPPORT אם המחיר מעל, RESISTANCE אם מתחת)

פרמטרים:
- lookback: number = 50 (כמה נרות אחורה לחפש swing)
- levels: number[] = [0.236, 0.382, 0.5, 0.618, 0.786] (אחוזי Fibonacci)

הקוד הקיים נמצא בקובץ lib/strategies/support-resistance.ts.

צור:
1. פונקציה findFibonacciLevels(candles: Candle[], options?: {...}): SupportResistanceLevel[]
2. הוסף source: "FIBONACCI" ל-SupportResistanceLevel
3. בדוק שהקוד TypeScript strict
```

### דוגמה 3: Stop Method - Trailing Stop

```
אני צריך להוסיף שיטת stop חדשה בשם "TRAILING_STOP".

תיאור:
Trailing Stop מתעדכן אוטומטית לפי מחיר נוכחי.
עבור LONG: stop עולה כשה-price עולה, אבל לא יורד
עבור SHORT: stop יורד כשה-price יורד, אבל לא עולה

דוגמה לשימוש:
"סטופ נגרר במרחק של 2 ATR מתחת למחיר הנוכחי (עבור LONG)"

אלגוריתם:
1. חישוב ATR
2. עבור LONG: stop = currentPrice - (ATR * multiplier)
3. עבור SHORT: stop = currentPrice + (ATR * multiplier)
4. אם יש stop קיים: עדכן רק אם זה משפר את המיקום

פרמטרים ב-StopLevelConfig:
- atrMultiplier: number = 2 (כמה ATR למרחק)
- atrPeriod: number = 14 (תקופת ATR)

הקוד הקיים נמצא בקובץ lib/strategies/stop-levels.ts.

צור:
1. פונקציה calculateStopFromTrailing(...): CalculatedStop | null
2. הוסף "TRAILING_STOP" ל-StopMethod
3. הוסף case ב-calculateStopLevel()
4. בדוק שהקוד TypeScript strict
```

---

## ✅ Checklist לכתיבת פרומפט

לפני שאתה כותב פרומפט, וודא שיש לך:

- [ ] **שם מדויק** - איך הקוד יקרא לזה?
- [ ] **תיאור ברור** - מה זה עושה?
- [ ] **תנאים/אלגוריתם** - איך זה עובד?
- [ ] **פרמטרים** - מה ניתן להתאים?
- [ ] **ערכי ברירת מחדל** - מה הערכים הסטנדרטיים?
- [ ] **דוגמאות** - איך משתמשים בזה?
- [ ] **קובץ יעד** - איזה קובץ צריך לערוך?

---

## 📚 סיכום

### המבנה:
```
lib/strategies/
├── candle-patterns.ts       ← נרות היפוך
├── support-resistance.ts    ← רמות תמיכה/התנגדות  
└── stop-levels.ts           ← חישוב סטופים
```

### זרימת עבודה:
1. **זיהוי צורך** → מה צריך להוסיף?
2. **כתיבת פרומפט** → לפי התבניות למעלה
3. **אימות קוד** → TypeScript strict, exports, types
4. **שימוש באסטרטגיות** → import ושימוש

### עקרונות:
- ✅ כל פונקציה עושה דבר אחד
- ✅ Types מוגדרים היטב
- ✅ ערכי ברירת מחדל לכל פרמטר
- ✅ null checks במקומות הנכונים
- ✅ Export כל הפונקציות שהאסטרטגיות צריכות

---

**מוכן לכתוב פרומפטים! 🚀**

