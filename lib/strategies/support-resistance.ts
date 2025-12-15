// lib/strategies/support-resistance.ts

// ================================
// Support & Resistance Levels Detection
// ================================
// זיהוי רמות תמיכה והתנגדות (אופקיות, דינמיות, וכו')
// כל אסטרטגיה יכולה להשתמש בפונקציות האלה

import type { Candle } from "./double-top";

// =========================
// Types
// =========================

export interface SupportResistanceLevel {
  price: number;
  type: "SUPPORT" | "RESISTANCE";
  strength: number; // 0-1 - כמה פעמים הנגיעה ברמה
  touches: number; // כמה פעמים המחיר נגע ברמה
  firstTouchIndex: number; // אינדקס הנגיעה הראשונה
  lastTouchIndex: number; // אינדקס הנגיעה האחרונה
  source: "HORIZONTAL" | "DYNAMIC_MA" | "DYNAMIC_EMA" | "PIVOT" | "PSYCHOLOGICAL";
}

// =========================
// Horizontal S/R Detection
// =========================

/**
 * זיהוי רמות תמיכה/התנגדות אופקיות
 * מחפש מחירים שהמחיר נגע בהם מספר פעמים
 */
export function findHorizontalSupportResistance(
  candles: Candle[],
  options: {
    minTouches?: number; // מינימום נגיעות כדי להיחשב רמה
    priceTolerance?: number; // סובלנות במחיר (באחוזים או נקודות)
    lookback?: number; // כמה נרות אחורה לחפש
  } = {}
): SupportResistanceLevel[] {
  const {
    minTouches = 2,
    priceTolerance = 0.002, // 0.2% default
    lookback = 100,
  } = options;

  const levels: Map<number, SupportResistanceLevel> = new Map();
  const startIndex = Math.max(0, candles.length - lookback);

  // איסוף כל הנקודות הגבוהות והנמוכות
  const candidatePrices: number[] = [];

  for (let i = startIndex; i < candles.length; i++) {
    candidatePrices.push(candles[i].high);
    candidatePrices.push(candles[i].low);
  }

  // קיבוץ מחירים קרובים יחד
  for (const candidatePrice of candidatePrices) {
    // בדיקה אם יש רמה קיימת קרובה
    let foundLevel = false;

    for (const [priceKey, level] of levels.entries()) {
      const tolerance = candidatePrice * priceTolerance;
      if (Math.abs(candidatePrice - priceKey) <= tolerance) {
        // עדכון הרמה הקיימת
        level.touches += 1;
        level.lastTouchIndex = candidatePrices.indexOf(candidatePrice);
        level.strength = Math.min(1, level.touches / 5); // max strength at 5 touches

        // עדכון הסוג לפי המחיר הנוכחי
        const currentCandle = candles[Math.floor(candidatePrices.indexOf(candidatePrice) / 2)];
        if (currentCandle) {
          if (candidatePrice === currentCandle.low) {
            level.type = "SUPPORT";
          } else if (candidatePrice === currentCandle.high) {
            level.type = "RESISTANCE";
          }
        }

        foundLevel = true;
        break;
      }
    }

    // יצירת רמה חדשה
    if (!foundLevel) {
      const currentCandleIndex = Math.floor(candidatePrices.indexOf(candidatePrice) / 2);
      const currentCandle = candles[currentCandleIndex];
      if (!currentCandle) continue;

      const levelType = candidatePrice === currentCandle.low ? "SUPPORT" : "RESISTANCE";

      levels.set(candidatePrice, {
        price: candidatePrice,
        type: levelType,
        strength: 0.2,
        touches: 1,
        firstTouchIndex: currentCandleIndex,
        lastTouchIndex: currentCandleIndex,
        source: "HORIZONTAL",
      });
    }
  }

  // פילטור רק רמות עם מספר נגיעות מספק
  const filteredLevels = Array.from(levels.values()).filter((level) => level.touches >= minTouches);

  // מיון לפי חוזק (strength)
  return filteredLevels.sort((a, b) => b.strength - a.strength);
}

/**
 * מציאת רמת תמיכה/התנגדות הקרובה ביותר למחיר נתון
 */
export function findNearestSupportResistance(
  levels: SupportResistanceLevel[],
  currentPrice: number,
  direction?: "LONG" | "SHORT"
): SupportResistanceLevel | null {
  let nearest: SupportResistanceLevel | null = null;
  let minDistance = Infinity;

  for (const level of levels) {
    // פילטור לפי כיוון
    if (direction === "LONG" && level.type !== "SUPPORT") continue;
    if (direction === "SHORT" && level.type !== "RESISTANCE") continue;

    // עבור LONG - מחפשים רמת תמיכה מתחת למחיר הנוכחי
    if (direction === "LONG" && level.price >= currentPrice) continue;

    // עבור SHORT - מחפשים רמת התנגדות מעל למחיר הנוכחי
    if (direction === "SHORT" && level.price <= currentPrice) continue;

    const distance = Math.abs(currentPrice - level.price);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = level;
    }
  }

  return nearest;
}

// =========================
// Dynamic S/R (Moving Averages)
// =========================

/**
 * חישוב ממוצע נע פשוט (SMA)
 */
function calculateSMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);

  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result[i] = sum / period;
  }

  return result;
}

/**
 * חישוב ממוצע נע אקספוננציאלי (EMA)
 */
function calculateEMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);

  if (values.length < period) return result;

  // ראשית - SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result[period - 1] = sum / period;

  // המשך - EMA
  const multiplier = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    result[i] = (values[i] - result[i - 1]) * multiplier + result[i - 1];
  }

  return result;
}

/**
 * זיהוי רמות תמיכה/התנגדות דינמיות (MA/EMA)
 */
export function findDynamicSupportResistance(
  candles: Candle[],
  options: {
    type: "SMA" | "EMA";
    period: number;
    lookback?: number;
  }
): SupportResistanceLevel | null {
  const { type, period, lookback = candles.length } = options;

  const closes = candles.map((c) => c.close);
  const maValues = type === "SMA" ? calculateSMA(closes, period) : calculateEMA(closes, period);

  const lastMA = maValues[maValues.length - 1];
  if (!Number.isFinite(lastMA)) return null;

  // בדיקה אם המחיר הנוכחי מעל או מתחת ל-MA
  const lastClose = closes[closes.length - 1];
  const levelType = lastClose > lastMA ? "SUPPORT" : "RESISTANCE";

  return {
    price: lastMA,
    type: levelType,
    strength: 0.7, // MA הוא רמה דינמית חזקה
    touches: 1,
    firstTouchIndex: candles.length - 1,
    lastTouchIndex: candles.length - 1,
    source: type === "SMA" ? "DYNAMIC_MA" : "DYNAMIC_EMA",
  };
}

// =========================
// Pivot-based S/R
// =========================

/**
 * זיהוי רמות תמיכה/התנגדות על בסיס Pivot Points
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
} {
  const pivot = (prevHigh + prevLow + prevClose) / 3;
  const range = prevHigh - prevLow;

  return {
    pivot,
    support1: 2 * pivot - prevHigh,
    support2: pivot - range,
    resistance1: 2 * pivot - prevLow,
    resistance2: pivot + range,
  };
}

/**
 * מציאת רמות Pivot עבור נר נתון
 */
export function getPivotLevelsFromCandle(
  candles: Candle[],
  index: number
): SupportResistanceLevel[] {
  if (index < 1 || index >= candles.length) return [];

  const prevCandle = candles[index - 1];
  const levels = calculatePivotLevels(prevCandle.high, prevCandle.low, prevCandle.close);

  return [
    {
      price: levels.pivot,
      type: "SUPPORT", // Pivot יכול לשמש כשתי הרמות
      strength: 0.6,
      touches: 1,
      firstTouchIndex: index,
      lastTouchIndex: index,
      source: "PIVOT",
    },
    {
      price: levels.support1,
      type: "SUPPORT",
      strength: 0.7,
      touches: 1,
      firstTouchIndex: index,
      lastTouchIndex: index,
      source: "PIVOT",
    },
    {
      price: levels.support2,
      type: "SUPPORT",
      strength: 0.5,
      touches: 1,
      firstTouchIndex: index,
      lastTouchIndex: index,
      source: "PIVOT",
    },
    {
      price: levels.resistance1,
      type: "RESISTANCE",
      strength: 0.7,
      touches: 1,
      firstTouchIndex: index,
      lastTouchIndex: index,
      source: "PIVOT",
    },
    {
      price: levels.resistance2,
      type: "RESISTANCE",
      strength: 0.5,
      touches: 1,
      firstTouchIndex: index,
      lastTouchIndex: index,
      source: "PIVOT",
    },
  ];
}

// =========================
// Psychological Levels
// =========================

/**
 * זיהוי רמות פסיכולוגיות (מספרים עגולים)
 * למשל: 100, 1000, 150.00, וכו'
 */
export function findPsychologicalLevels(
  currentPrice: number,
  range = 0.1 // 10% סביב המחיר הנוכחי
): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = [];
  const priceRange = currentPrice * range;

  // פונקציה למציאת המספר העגול הקרוב ביותר
  function roundToNearestRoundNumber(price: number): number {
    if (price >= 1000) {
      return Math.round(price / 100) * 100; // 1000, 1100, 1200...
    } else if (price >= 100) {
      return Math.round(price / 10) * 10; // 100, 110, 120...
    } else if (price >= 10) {
      return Math.round(price); // 10, 11, 12...
    } else {
      return Math.round(price * 10) / 10; // 1.0, 1.1, 1.2...
    }
  }

  const nearestRound = roundToNearestRoundNumber(currentPrice);

  // הוספת רמות סביב המספר העגול
  for (let offset = -priceRange; offset <= priceRange; offset += priceRange / 5) {
    const levelPrice = nearestRound + offset;
    const distance = Math.abs(currentPrice - levelPrice);

    if (distance <= priceRange) {
      levels.push({
        price: levelPrice,
        type: currentPrice > levelPrice ? "SUPPORT" : "RESISTANCE",
        strength: 0.4, // רמות פסיכולוגיות חלשות יותר
        touches: 1,
        firstTouchIndex: 0,
        lastTouchIndex: 0,
        source: "PSYCHOLOGICAL",
      });
    }
  }

  return levels;
}
