// lib/strategies/stop-levels.ts

// ================================
// Stop Loss Level Calculation
// ================================
// פונקציות עזר לחישוב סטופים על בסיס נרות היפוך, רמות תמיכה/התנגדות, וכו'
// כל אסטרטגיה יכולה להשתמש בפונקציות האלה

import { Candle } from "./double-top";
import {
  findNearestReversalCandle,
  getStopFromReversalCandle,
  ReversalCandleInfo,
} from "./candle-patterns";
import {
  SupportResistanceLevel,
  findNearestSupportResistance,
  findHorizontalSupportResistance,
  findDynamicSupportResistance,
  getPivotLevelsFromCandle,
} from "./support-resistance";

// =========================
// Types
// =========================

export interface StopLevelConfig {
  method:
    | "REVERSAL_CANDLE" // סטופ על בסיס נר היפוך
    | "SUPPORT_RESISTANCE" // סטופ על בסיס רמת תמיכה/התנגדות
    | "PIVOT_LEVEL" // סטופ על בסיס Pivot Point
    | "PSYCHOLOGICAL" // סטופ על בסיס רמה פסיכולוגית
    | "DYNAMIC_MA" // סטופ על בסיס MA
    | "ATR_BASED" // סטופ על בסיס ATR
    | "FIXED_PERCENTAGE"; // סטופ על בסיס אחוז קבוע

  // Options לפי סוג הסטופ
  lookback?: number; // כמה נרות אחורה לחפש (לנרות היפוך/רמות)
  buffer?: number; // buffer במחיר (בנקודות או אחוזים)
  bufferType?: "POINTS" | "PERCENTAGE"; // סוג buffer
  minReversalStrength?: number; // מינימום חוזק נר היפוך (0-1)
  minS/RStrength?: number; // מינימום חוזק רמה (0-1)
  atrMultiplier?: number; // מכפיל ATR לסטופ
  percentage?: number; // אחוז סטופ (אם method = FIXED_PERCENTAGE)
  maPeriod?: number; // תקופת MA (אם method = DYNAMIC_MA)
  maType?: "SMA" | "EMA"; // סוג MA
}

export interface CalculatedStop {
  price: number;
  method: StopLevelConfig["method"];
  source: string; // תיאור המקור (למשל "HAMMER at index 45")
  confidence: number; // 0-1 - כמה בטוחים בסטופ
}

// =========================
// Main Stop Calculation Functions
// =========================

/**
 * חישוב סטופ על בסיס נר היפוך
 * דוגמה: "סטופ במחיר הנמוך של נר היפוך bearish"
 */
export function calculateStopFromReversalCandle(
  candles: Candle[],
  currentIndex: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  const {
    lookback = 20,
    buffer = 0,
    bufferType = "POINTS",
    minReversalStrength = 0.5,
  } = config;

  // מציאת נר היפוך קרוב
  const reversalCandle = findNearestReversalCandle(
    candles,
    currentIndex,
    lookback,
    direction
  );

  if (!reversalCandle || reversalCandle.strength < minReversalStrength) {
    return null;
  }

  // חישוב סטופ מהנר
  let stopPrice = getStopFromReversalCandle(reversalCandle, direction, 0);

  if (stopPrice === null) {
    return null;
  }

  // הוספת buffer
  if (bufferType === "PERCENTAGE") {
    stopPrice = direction === "LONG" 
      ? stopPrice * (1 - buffer / 100)
      : stopPrice * (1 + buffer / 100);
  } else {
    stopPrice = direction === "LONG" 
      ? stopPrice - buffer
      : stopPrice + buffer;
  }

  return {
    price: stopPrice,
    method: "REVERSAL_CANDLE",
    source: `${reversalCandle.type} at index ${reversalCandle.index}`,
    confidence: reversalCandle.strength,
  };
}

/**
 * חישוב סטופ על בסיס רמת תמיכה/התנגדות
 * דוגמה: "סטופ מדלג למחיר הנמוך של רמת ההתנגדות"
 */
export function calculateStopFromSupportResistance(
  candles: Candle[],
  currentIndex: number,
  currentPrice: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  const {
    lookback = 100,
    buffer = 0,
    bufferType = "POINTS",
    minS/RStrength = 0.3,
  } = config;

  // מציאת רמות תמיכה/התנגדות
  const levels = findHorizontalSupportResistance(candles, {
    lookback,
    minTouches: 2,
  });

  // מציאת הרמה הקרובה ביותר
  const nearestLevel = findNearestSupportResistance(
    levels,
    currentPrice,
    direction
  );

  if (!nearestLevel || nearestLevel.strength < minS/RStrength) {
    return null;
  }

  // חישוב סטופ מהרמה
  let stopPrice = nearestLevel.price;

  // עבור LONG - סטופ מתחת לרמת תמיכה (אם הרמה היא תמיכה)
  // עבור SHORT - סטופ מעל לרמת התנגדות (אם הרמה היא התנגדות)
  if (direction === "LONG" && nearestLevel.type !== "SUPPORT") {
    // רמה לא מתאימה לכיוון LONG
    return null;
  }
  if (direction === "SHORT" && nearestLevel.type !== "RESISTANCE") {
    // רמה לא מתאימה לכיוון SHORT
    return null;
  }

  // הוספת buffer
  if (bufferType === "PERCENTAGE") {
    stopPrice = direction === "LONG" 
      ? stopPrice * (1 - buffer / 100)
      : stopPrice * (1 + buffer / 100);
  } else {
    stopPrice = direction === "LONG" 
      ? stopPrice - buffer
      : stopPrice + buffer;
  }

  return {
    price: stopPrice,
    method: "SUPPORT_RESISTANCE",
    source: `${nearestLevel.type} level at ${nearestLevel.price.toFixed(2)} (${nearestLevel.touches} touches)`,
    confidence: nearestLevel.strength,
  };
}

/**
 * חישוב סטופ על בסיס Pivot Point
 */
export function calculateStopFromPivot(
  candles: Candle[],
  currentIndex: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  const { buffer = 0, bufferType = "POINTS" } = config;

  const pivotLevels = getPivotLevelsFromCandle(candles, currentIndex);
  
  // עבור LONG - משתמשים ב-Support 1 או Support 2
  // עבור SHORT - משתמשים ב-Resistance 1 או Resistance 2
  const relevantLevel = direction === "LONG"
    ? pivotLevels.find(l => l.type === "SUPPORT" && l.strength >= 0.6)
    : pivotLevels.find(l => l.type === "RESISTANCE" && l.strength >= 0.6);

  if (!relevantLevel) {
    return null;
  }

  let stopPrice = relevantLevel.price;

  // הוספת buffer
  if (bufferType === "PERCENTAGE") {
    stopPrice = direction === "LONG" 
      ? stopPrice * (1 - buffer / 100)
      : stopPrice * (1 + buffer / 100);
  } else {
    stopPrice = direction === "LONG" 
      ? stopPrice - buffer
      : stopPrice + buffer;
  }

  return {
    price: stopPrice,
    method: "PIVOT_LEVEL",
    source: `Pivot ${relevantLevel.type} at ${relevantLevel.price.toFixed(2)}`,
    confidence: relevantLevel.strength,
  };
}

/**
 * חישוב סטופ על בסיס ATR
 */
export function calculateStopFromATR(
  candles: Candle[],
  currentPrice: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  const { atrMultiplier = 2, atrPeriod = 14 } = config;

  // חישוב ATR
  if (candles.length < atrPeriod + 1) {
    return null;
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trueRanges.push(tr);
  }

  const recentTRs = trueRanges.slice(-atrPeriod);
  const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / atrPeriod;

  // חישוב סטופ
  const stopPrice = direction === "LONG"
    ? currentPrice - atr * atrMultiplier
    : currentPrice + atr * atrMultiplier;

  return {
    price: stopPrice,
    method: "ATR_BASED",
    source: `ATR(${atrPeriod}) * ${atrMultiplier} = ${(atr * atrMultiplier).toFixed(2)}`,
    confidence: 0.7,
  };
}

/**
 * חישוב סטופ על בסיס אחוז קבוע
 */
export function calculateStopFromPercentage(
  entryPrice: number,
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  const { percentage = 2 } = config; // 2% default

  const stopPrice = direction === "LONG"
    ? entryPrice * (1 - percentage / 100)
    : entryPrice * (1 + percentage / 100);

  return {
    price: stopPrice,
    method: "FIXED_PERCENTAGE",
    source: `${percentage}% from entry`,
    confidence: 0.5,
  };
}

/**
 * חישוב סטופ על בסיס MA דינמי
 */
export function calculateStopFromMA(
  candles: Candle[],
  direction: "LONG" | "SHORT",
  config: StopLevelConfig
): CalculatedStop | null {
  const {
    maPeriod = 20,
    maType = "EMA",
    buffer = 0,
    bufferType = "POINTS",
  } = config;

  const dynamicLevel = findDynamicSupportResistance(candles, {
    type: maType,
    period: maPeriod,
  });

  if (!dynamicLevel) {
    return null;
  }

  // עבור LONG - סטופ מתחת ל-MA (אם MA = תמיכה)
  // עבור SHORT - סטופ מעל ל-MA (אם MA = התנגדות)
  if (direction === "LONG" && dynamicLevel.type !== "SUPPORT") {
    return null;
  }
  if (direction === "SHORT" && dynamicLevel.type !== "RESISTANCE") {
    return null;
  }

  let stopPrice = dynamicLevel.price;

  // הוספת buffer
  if (bufferType === "PERCENTAGE") {
    stopPrice = direction === "LONG" 
      ? stopPrice * (1 - buffer / 100)
      : stopPrice * (1 + buffer / 100);
  } else {
    stopPrice = direction === "LONG" 
      ? stopPrice - buffer
      : stopPrice + buffer;
  }

  return {
    price: stopPrice,
    method: "DYNAMIC_MA",
    source: `${maType}(${maPeriod}) = ${dynamicLevel.price.toFixed(2)}`,
    confidence: dynamicLevel.strength,
  };
}

// =========================
// Universal Stop Calculator
// =========================

/**
 * פונקציה אוניברסלית לחישוב סטופ - משתמשת בכל השיטות
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
      return calculateStopFromReversalCandle(
        candles,
        entryIndex,
        direction,
        config
      );

    case "SUPPORT_RESISTANCE":
      return calculateStopFromSupportResistance(
        candles,
        entryIndex,
        entryPrice,
        direction,
        config
      );

    case "PIVOT_LEVEL":
      return calculateStopFromPivot(candles, entryIndex, direction, config);

    case "ATR_BASED":
      return calculateStopFromATR(candles, entryPrice, direction, config);

    case "FIXED_PERCENTAGE":
      return calculateStopFromPercentage(entryPrice, direction, config);

    case "DYNAMIC_MA":
      return calculateStopFromMA(candles, direction, config);

    default:
      return null;
  }
}

/**
 * חישוב סטופ עם fallback - מנסה שיטות שונות לפי סדר עדיפות
 */
export function calculateStopWithFallback(
  candles: Candle[],
  entryPrice: number,
  entryIndex: number,
  direction: "LONG" | "SHORT",
  methods: StopLevelConfig[]
): CalculatedStop | null {
  // מנסים כל שיטה לפי סדר עדיפות
  for (const config of methods) {
    const stop = calculateStopLevel(
      candles,
      entryPrice,
      entryIndex,
      direction,
      config
    );

    if (stop && stop.confidence >= (config.minReversalStrength || 0.5)) {
      return stop;
    }
  }

  // אם שום דבר לא עבד, נחזיר סטופ ATR בסיסי
  return calculateStopFromATR(candles, entryPrice, direction, {
    method: "ATR_BASED",
    atrMultiplier: 2,
  });
}

