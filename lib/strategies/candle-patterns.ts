// lib/strategies/candle-patterns.ts
//
// ================================
// Unified Candle Pattern Utilities
// ================================
// Deterministic, rule-based candle pattern recognition
// All logic is mathematical, reproducible, and optimized for real-time scanning
//
// STANDARD OUTPUT INTERFACE:
// Every detected pattern returns CandlePattern with standardized metrics and scoring

import type { Candle } from "./double-top";

// =========================
// Standard Interfaces
// =========================

export interface CandleMetrics {
  bodyRatio: number;
  lowerWickRatio: number;
  upperWickRatio: number;
  volumeMultiple: number;
  trendStrength: number;
  distanceToSRpct: number;
  [key: string]: number; // for pattern-specific metrics
}

export interface CandlePattern {
  index: number; // candle index in the data series
  pattern: string; // e.g. "BULLISH_HAMMER"
  category: string; // e.g. "REVERSAL"
  direction: "LONG" | "SHORT" | "NEUTRAL";
  isPattern: boolean; // true if strength >= threshold
  strength: number; // 0–1 normalized score
  metrics: CandleMetrics; // raw measurements used for scoring
}

export interface PatternContext {
  candles: Candle[];
  index: number;
  volumeAverage?: number; // average volume for comparison
  trendStrength?: number; // overall trend strength (0-1)
  nearestSupport?: number; // nearest support level
  nearestResistance?: number; // nearest resistance level
  [key: string]: any; // for additional context
}

// =========================
// Core Helper Functions
// =========================

/**
 * Calculate body, wicks, and ratios for a candle
 * All pattern detection uses these base calculations
 */
export function getCandleParts(candle: Candle): {
  body: number;
  upperShadow: number;
  lowerShadow: number;
  totalRange: number;
  isBullish: boolean;
  bodyRatio: number;
  upperShadowRatio: number;
  lowerShadowRatio: number;
} {
  const body = Math.abs(candle.close - candle.open);
  const upperShadow =
    candle.close > candle.open ? candle.high - candle.close : candle.high - candle.open;
  const lowerShadow =
    candle.close > candle.open ? candle.open - candle.low : candle.close - candle.low;
  const totalRange = candle.high - candle.low;
  const isBullish = candle.close > candle.open;

  return {
    body,
    upperShadow,
    lowerShadow,
    totalRange,
    isBullish,
    bodyRatio: totalRange > 0 ? body / totalRange : 0,
    upperShadowRatio: totalRange > 0 ? upperShadow / totalRange : 0,
    lowerShadowRatio: totalRange > 0 ? lowerShadow / totalRange : 0,
  };
}

/**
 * Calculate average volume over a lookback period
 */
export function calculateAverageVolume(
  candles: Candle[],
  endIndex: number,
  lookback: number
): number {
  const startIndex = Math.max(0, endIndex - lookback + 1);
  if (startIndex > endIndex) return 0;

  let totalVolume = 0;
  let count = 0;
  for (let i = startIndex; i <= endIndex; i++) {
    totalVolume += candles[i].volume;
    count++;
  }

  return count > 0 ? totalVolume / count : 0;
}

/**
 * Calculate volume multiple (current volume vs average)
 */
export function calculateVolumeMultiple(candle: Candle, averageVolume: number): number {
  if (averageVolume <= 0) return 1.0;
  return candle.volume / averageVolume;
}

/**
 * Calculate distance to nearest support/resistance level as percentage
 */
export function calculateDistanceToSR(
  candle: Candle,
  support: number | undefined,
  resistance: number | undefined
): number {
  if (!support && !resistance) return 1.0; // no S/R found = far

  const close = candle.close;
  let minDistance = Infinity;

  if (support !== undefined) {
    const distToSupport = Math.abs(close - support) / close;
    minDistance = Math.min(minDistance, distToSupport);
  }

  if (resistance !== undefined) {
    const distToResistance = Math.abs(close - resistance) / close;
    minDistance = Math.min(minDistance, distToResistance);
  }

  return minDistance === Infinity ? 1.0 : minDistance;
}

/**
 * Normalize a value to 0-1 range using min/max bounds
 */
export function normalizeValue(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  const clamped = Math.max(min, Math.min(max, value));
  return (clamped - min) / (max - min);
}

/**
 * Score a metric value against quality bands
 * Returns score 0-1 based on which band the value falls into
 */
export function scoreByBands(
  value: number,
  weakRange: [number, number],
  mediumRange: [number, number],
  strongRange: [number, number],
  excellentRange: [number, number]
): number {
  if (value >= excellentRange[0] && value <= excellentRange[1]) {
    return 1.0;
  } else if (value >= strongRange[0] && value <= strongRange[1]) {
    return 0.75;
  } else if (value >= mediumRange[0] && value <= mediumRange[1]) {
    return 0.5;
  } else if (value >= weakRange[0] && value <= weakRange[1]) {
    return 0.25;
  }
  return 0.0;
}

/**
 * Calculate weighted sum of sub-scores
 * Weights should sum to 1.0 for proper normalization
 */
export function calculateWeightedStrength(
  scores: Array<{ score: number; weight: number }>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const { score, weight } of scores) {
    const clampedScore = Math.max(0, Math.min(1, score));
    weightedSum += clampedScore * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) return 0;
  return Math.max(0, Math.min(1, weightedSum / totalWeight));
}

/**
 * Calculate downward trend strength as percentage decline
 */
function calculateDownTrendStrength(
  candles: Candle[],
  index: number,
  lookback: number = 8
): number {
  if (index < lookback) return 0;

  const startIndex = index - lookback;
  const startPrice = candles[startIndex].close;
  const endPrice = candles[index].close;

  if (startPrice <= 0) return 0;

  const change = (startPrice - endPrice) / startPrice;
  return Math.max(0, change * 100); // return as percentage
}

/**
 * Calculate upward trend strength as percentage rise
 */
function calculateUpTrendStrength(candles: Candle[], index: number, lookback: number = 8): number {
  if (index < lookback) return 0;

  const startIndex = index - lookback;
  const startPrice = candles[startIndex].close;
  const endPrice = candles[index].close;

  if (startPrice <= 0) return 0;

  const change = (endPrice - startPrice) / startPrice;
  return Math.max(0, change * 100); // return as percentage
}

/**
 * Calculate body position within range (how high the body is)
 */
function calculateBodyTopPct(candle: Candle, parts: ReturnType<typeof getCandleParts>): number {
  if (parts.totalRange <= 0) return 0;
  const bodyTop = Math.max(candle.open, candle.close);
  return (bodyTop - candle.low) / parts.totalRange;
}

/**
 * Calculate body position within range (how low the body is)
 */
function calculateBodyBottomPct(candle: Candle, parts: ReturnType<typeof getCandleParts>): number {
  if (parts.totalRange <= 0) return 0;
  const bodyBottom = Math.max(candle.open, candle.close);
  return (bodyBottom - candle.low) / parts.totalRange;
}

/**
 * Calculate distance from price midpoint to high (for Dragonfly Doji)
 */
function calculateHighDistancePct(
  candle: Candle,
  parts: ReturnType<typeof getCandleParts>
): number {
  if (parts.totalRange <= 0) return 0;
  const priceMid = (candle.open + candle.close) / 2;
  return (candle.high - priceMid) / parts.totalRange;
}

/**
 * Calculate distance from price midpoint to low (for Gravestone Doji)
 */
function calculateLowDistancePct(candle: Candle, parts: ReturnType<typeof getCandleParts>): number {
  if (parts.totalRange <= 0) return 0;
  const priceMid = (candle.open + candle.close) / 2;
  return (priceMid - candle.low) / parts.totalRange;
}

/**
 * Calculate close position percentage within the candle range (for Bullish Pin Bars)
 */
function calculateClosePosPct(candle: Candle, parts: ReturnType<typeof getCandleParts>): number {
  if (parts.totalRange <= 0) return 0;
  return (candle.close - candle.low) / parts.totalRange;
}

/**
 * Calculate close position percentage from high (for Bearish Pin Bars)
 */
function calculateClosePosPctFromHigh(
  candle: Candle,
  parts: ReturnType<typeof getCandleParts>
): number {
  if (parts.totalRange <= 0) return 0;
  return (candle.high - candle.close) / parts.totalRange;
}

/**
 * Calculate absolute trend strength (percentage move regardless of direction)
 */
function calculateAbsoluteTrendStrength(
  candles: Candle[],
  index: number,
  lookback: number = 8
): number {
  if (index < lookback) return 0;

  const startIndex = index - lookback;
  const startPrice = candles[startIndex].close;
  const endPrice = candles[index].close;

  if (startPrice <= 0) return 0;

  const change = Math.abs(endPrice - startPrice) / startPrice;
  return change * 100; // return as percentage
}

/**
 * Calculate Average True Range (ATR) over a period
 */
function calculateATR(candles: Candle[], endIndex: number, period: number = 14): number {
  if (endIndex < period) return 0;

  const startIndex = endIndex - period + 1;
  let sumTR = 0;

  for (let i = startIndex; i <= endIndex; i++) {
    if (i === startIndex) {
      // First TR uses high - low
      sumTR += candles[i].high - candles[i].low;
    } else {
      const prevCandle = candles[i - 1];
      const currCandle = candles[i];

      const tr1 = currCandle.high - currCandle.low;
      const tr2 = Math.abs(currCandle.high - prevCandle.close);
      const tr3 = Math.abs(currCandle.low - prevCandle.close);

      sumTR += Math.max(tr1, tr2, tr3);
    }
  }

  return sumTR / period;
}

// =========================
// Pattern Detection Functions
// =========================
// Each pattern will be implemented here following the specification
// Format: detect[PatternName](context: PatternContext): CandlePattern | null

/**
 * Detect Bullish Hammer Candle Pattern
 * Classification: Reversal, Direction: LONG
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishHammer(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Calculate downTrendStrength (percentage decline over last 5-10 candles)
  const downTrendStrength = calculateDownTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to support
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(candle.close - context.nearestSupport) / candle.close) * 100
      : 100.0; // far if no support

  // Calculate body position
  const bodyTopPct = calculateBodyTopPct(candle, parts);

  // =========================
  // 2. QUALITY BAND SCORING
  // =========================

  // A) Lower Wick Ratio Quality
  let wickScore = 0.0;
  if (lowerWickRatio < 2.0) {
    wickScore = 0.0; // invalid
  } else if (lowerWickRatio >= 2.0 && lowerWickRatio < 2.5) {
    wickScore = 0.25; // weak
  } else if (lowerWickRatio >= 2.5 && lowerWickRatio < 3.0) {
    wickScore = 0.5; // medium
  } else if (lowerWickRatio >= 3.0 && lowerWickRatio <= 4.0) {
    wickScore = 0.75; // strong
  } else if (lowerWickRatio > 4.0) {
    wickScore = 1.0; // excellent
  }

  // B) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio > 0.35) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.25 && bodyRatio <= 0.35) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.15 && bodyRatio < 0.25) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.15) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.05) {
    bodyScore = 1.0; // excellent
  }

  // C) Upper Wick Ratio Quality
  let upperWickScore = 0.0;
  if (upperWickRatio > 0.25) {
    upperWickScore = 0.0; // invalid
  } else if (upperWickRatio >= 0.15 && upperWickRatio <= 0.25) {
    upperWickScore = 0.25; // weak
  } else if (upperWickRatio >= 0.05 && upperWickRatio < 0.15) {
    upperWickScore = 0.5; // medium
  } else if (upperWickRatio < 0.05) {
    upperWickScore = 1.0; // strong
  }

  // D) Body Position Quality (close near top)
  let topScore = 0.0;
  if (bodyTopPct < 0.5) {
    topScore = 0.0; // invalid
  } else if (bodyTopPct >= 0.5 && bodyTopPct < 0.65) {
    topScore = 0.25; // weak
  } else if (bodyTopPct >= 0.65 && bodyTopPct < 0.8) {
    topScore = 0.5; // medium
  } else if (bodyTopPct >= 0.8) {
    topScore = 1.0; // strong
  }

  // Volume Context Scoring
  let volScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.5) {
    volScore = 0.5; // medium
  } else if (volumeMultiple >= 1.5) {
    volScore = 1.0; // strong
  }

  // Trend Context Scoring (decline percentage)
  let trendScore = 0.0;
  if (downTrendStrength >= 1.0 && downTrendStrength < 3.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrength >= 3.0 && downTrendStrength < 6.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrength >= 6.0) {
    trendScore = 1.0; // strong
  }

  // Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = 1.0; // strong
  }

  // =========================
  // 3. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: wickScore, weight: 0.35 },
    { score: bodyScore, weight: 0.2 },
    { score: topScore, weight: 0.15 },
    { score: trendScore, weight: 0.1 },
    { score: volScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 4. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 5. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BULLISH_HAMMER",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      lowerWickRatio,
      upperWickRatio,
      volumeMultiple,
      downTrendStrength,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrength,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Shooting Star Candle Pattern
 * Classification: Reversal, Direction: SHORT
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectShootingStar(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Calculate upTrendStrength (percentage rise over last 5-10 candles)
  const upTrendStrength = calculateUpTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to resistance
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - candle.close) / candle.close) * 100
      : 100.0; // far if no resistance

  // Calculate body position (bottom)
  const bodyBottomPct = calculateBodyBottomPct(candle, parts);

  // =========================
  // 2. QUALITY BAND SCORING
  // =========================

  // A) Upper Wick Ratio Quality
  let wickScore = 0.0;
  if (upperWickRatio < 2.0) {
    wickScore = 0.0; // invalid
  } else if (upperWickRatio >= 2.0 && upperWickRatio < 2.5) {
    wickScore = 0.25; // weak
  } else if (upperWickRatio >= 2.5 && upperWickRatio < 3.0) {
    wickScore = 0.5; // medium
  } else if (upperWickRatio >= 3.0 && upperWickRatio <= 4.0) {
    wickScore = 0.75; // strong
  } else if (upperWickRatio > 4.0) {
    wickScore = 1.0; // excellent
  }

  // B) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio > 0.35) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.25 && bodyRatio <= 0.35) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.15 && bodyRatio < 0.25) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.15) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.05) {
    bodyScore = 1.0; // excellent
  }

  // C) Lower Wick Ratio Quality (validation check)
  // Lower wick must be small for valid Shooting Star
  if (lowerWickRatio > 0.25) {
    return null; // invalid pattern
  }

  // D) Body Position Quality (body near bottom)
  let bottomScore = 0.0;
  if (bodyBottomPct > 0.5) {
    bottomScore = 0.0; // invalid
  } else if (bodyBottomPct >= 0.35 && bodyBottomPct <= 0.5) {
    bottomScore = 0.25; // weak
  } else if (bodyBottomPct >= 0.2 && bodyBottomPct < 0.35) {
    bottomScore = 0.5; // medium
  } else if (bodyBottomPct < 0.2) {
    bottomScore = 1.0; // strong
  }

  // Volume Context Scoring
  let volScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.4) {
    volScore = 0.5; // medium
  } else if (volumeMultiple >= 1.4) {
    volScore = 1.0; // strong
  }

  // Trend Context Scoring (rise percentage)
  let trendScore = 0.0;
  if (upTrendStrength >= 1.0 && upTrendStrength < 3.0) {
    trendScore = 0.25; // weak
  } else if (upTrendStrength >= 3.0 && upTrendStrength < 6.0) {
    trendScore = 0.5; // medium
  } else if (upTrendStrength >= 6.0) {
    trendScore = 1.0; // strong
  }

  // Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = 1.0; // strong
  }

  // =========================
  // 3. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: wickScore, weight: 0.35 },
    { score: bodyScore, weight: 0.2 },
    { score: bottomScore, weight: 0.15 },
    { score: trendScore, weight: 0.1 },
    { score: volScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 4. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 5. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "SHOOTING_STAR",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      volumeMultiple,
      upTrendStrength,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrength,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Bullish Engulfing Candle Pattern
 * Classification: Reversal, Direction: LONG
 * Two-candle pattern: previous bearish candle fully engulfed by current bullish candle
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishEngulfing(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 1 || index >= candles.length) {
    return null; // Need at least previous candle
  }

  const prevCandle = candles[index - 1];
  const currCandle = candles[index];

  if (!prevCandle || !currCandle) return null;
  if (currCandle.high === currCandle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Previous candle metrics
  const rangePrev = prevCandle.high - prevCandle.low;
  const bodyPrev = Math.abs(prevCandle.close - prevCandle.open);
  const bodyPrevRatio = rangePrev > 0 ? bodyPrev / rangePrev : 0;

  // Current candle metrics
  const rangeCurr = currCandle.high - currCandle.low;
  const bodyCurr = Math.abs(currCandle.close - currCandle.open);
  const bodyCurrRatio = rangeCurr > 0 ? bodyCurr / rangeCurr : 0;

  // Body boundaries
  const currBodyHigh = Math.max(currCandle.open, currCandle.close);
  const currBodyLow = Math.min(currCandle.open, currCandle.close);
  const prevBodyHigh = Math.max(prevCandle.open, prevCandle.close);
  const prevBodyLow = Math.min(prevCandle.open, prevCandle.close);

  // =========================
  // 2. BASIC ENGULFING CONDITIONS
  // =========================

  // A) Color condition: prev bearish, curr bullish
  const prevIsBearish = prevCandle.close < prevCandle.open;
  const currIsBullish = currCandle.close > currCandle.open;

  // B) Body engulfing condition (strict body-based engulfing)
  const fullyEngulfs = currBodyLow <= prevBodyLow && currBodyHigh >= prevBodyHigh;

  // C) Minimum body size ratio
  const minBodySizeValid = bodyPrev > 0 && bodyCurr >= bodyPrev;

  // Check if basic engulfing conditions are met
  const engulfingConditionsMet = prevIsBearish && currIsBullish && fullyEngulfs && minBodySizeValid;

  // =========================
  // 3. ADDITIONAL RAW METRICS
  // =========================

  const bodySizeRatio = bodyPrev > 0 ? bodyCurr / bodyPrev : 0;
  const bodyCurrRangeRatio = bodyCurrRatio;
  const dominanceRatio = bodyPrev + bodyCurr > 0 ? bodyCurr / (bodyCurr + bodyPrev) : 0;

  // Calculate downTrendStrength (percentage decline over last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(currCandle, avgVolume20);

  // Calculate distance to support
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(currCandle.close - context.nearestSupport) / currCandle.close) * 100
      : 100.0; // far if no support

  // =========================
  // 4. QUALITY BAND SCORING
  // =========================

  // If basic engulfing conditions failed, return early with strength=0
  if (!engulfingConditionsMet) {
    return {
      index,
      pattern: "BULLISH_ENGULFING",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyPrev,
        bodyCurr,
        bodyPrevRatio,
        bodyCurrRatio,
        bodySizeRatio: bodyPrev > 0 ? bodyCurr / bodyPrev : 0,
        bodyCurrRangeRatio,
        dominanceRatio: bodyPrev + bodyCurr > 0 ? bodyCurr / (bodyCurr + bodyPrev) : 0,
        volumeMultiple: calculateVolumeMultiple(
          currCandle,
          context.volumeAverage ?? calculateAverageVolume(candles, index, 20)
        ),
        downTrendStrengthPct: calculateDownTrendStrength(candles, index, 8),
        distanceToSupportPct:
          context.nearestSupport !== undefined
            ? (Math.abs(currCandle.close - context.nearestSupport) / currCandle.close) * 100
            : 100.0,
        bodyRatio: bodyCurrRatio,
        lowerWickRatio: 0,
        upperWickRatio: 0,
        trendStrength: calculateDownTrendStrength(candles, index, 8),
        distanceToSRpct:
          context.nearestSupport !== undefined
            ? (Math.abs(currCandle.close - context.nearestSupport) / currCandle.close) * 100
            : 100.0,
      },
    };
  }

  // A) Body Size Ratio Score (engulfScore)
  let engulfScore = 0.0;
  if (bodySizeRatio >= 1.0 && bodySizeRatio < 1.2) {
    engulfScore = 0.25; // weak
  } else if (bodySizeRatio >= 1.2 && bodySizeRatio < 1.5) {
    engulfScore = 0.5; // medium
  } else if (bodySizeRatio >= 1.5 && bodySizeRatio <= 2.0) {
    engulfScore = 0.75; // strong
  } else if (bodySizeRatio > 2.0) {
    engulfScore = 1.0; // very strong
  }

  // B) Current Body Dominance Score (bodyDominanceScore)
  let bodyDominanceScore = 0.0;
  if (bodyCurrRangeRatio < 0.4) {
    bodyDominanceScore = 0.25; // weak
  } else if (bodyCurrRangeRatio >= 0.4 && bodyCurrRangeRatio < 0.55) {
    bodyDominanceScore = 0.5; // medium
  } else if (bodyCurrRangeRatio >= 0.55 && bodyCurrRangeRatio <= 0.7) {
    bodyDominanceScore = 0.75; // strong
  } else if (bodyCurrRangeRatio > 0.7) {
    bodyDominanceScore = 1.0; // very strong
  }

  // C) Dominance Ratio Score (dominanceRatioScore)
  let dominanceRatioScore = 0.0;
  if (dominanceRatio >= 0.5 && dominanceRatio < 0.6) {
    dominanceRatioScore = 0.25; // weak
  } else if (dominanceRatio >= 0.6 && dominanceRatio < 0.7) {
    dominanceRatioScore = 0.5; // medium
  } else if (dominanceRatio >= 0.7 && dominanceRatio <= 0.8) {
    dominanceRatioScore = 0.75; // strong
  } else if (dominanceRatio > 0.8) {
    dominanceRatioScore = 1.0; // very strong
  }

  // Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.5) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.5 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 5. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: engulfScore, weight: 0.3 },
    { score: bodyDominanceScore, weight: 0.2 },
    { score: dominanceRatioScore, weight: 0.15 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 6. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 7. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // index of the CURRENT (engulfing) candle
    pattern: "BULLISH_ENGULFING",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyPrev,
      bodyCurr,
      bodyPrevRatio,
      bodyCurrRatio,
      bodySizeRatio,
      bodyCurrRangeRatio,
      dominanceRatio,
      volumeMultiple,
      downTrendStrengthPct,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyCurrRatio,
      lowerWickRatio: 0, // not applicable for engulfing pattern
      upperWickRatio: 0, // not applicable for engulfing pattern
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Bearish Engulfing Candle Pattern
 * Classification: Reversal, Direction: SHORT
 * Two-candle pattern: previous bullish candle fully engulfed by current bearish candle
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBearishEngulfing(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 1 || index >= candles.length) {
    return null; // Need at least previous candle
  }

  const prevCandle = candles[index - 1];
  const currCandle = candles[index];

  if (!prevCandle || !currCandle) return null;
  if (currCandle.high === currCandle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Previous candle metrics
  const rangePrev = prevCandle.high - prevCandle.low;
  const bodyPrev = Math.abs(prevCandle.close - prevCandle.open);
  const bodyPrevRatio = rangePrev > 0 ? bodyPrev / rangePrev : 0;

  // Current candle metrics
  const rangeCurr = currCandle.high - currCandle.low;
  const bodyCurr = Math.abs(currCandle.close - currCandle.open);
  const bodyCurrRatio = rangeCurr > 0 ? bodyCurr / rangeCurr : 0;

  // Body boundaries
  const currBodyHigh = Math.max(currCandle.open, currCandle.close);
  const currBodyLow = Math.min(currCandle.open, currCandle.close);
  const prevBodyHigh = Math.max(prevCandle.open, prevCandle.close);
  const prevBodyLow = Math.min(prevCandle.open, prevCandle.close);

  // =========================
  // 2. BASIC ENGULFING CONDITIONS
  // =========================

  // A) Color condition: prev bullish, curr bearish
  const prevIsBullish = prevCandle.close > prevCandle.open;
  const currIsBearish = currCandle.close < currCandle.open;

  // B) Body engulfing condition (strict body-based engulfing)
  const fullyEngulfs = currBodyHigh >= prevBodyHigh && currBodyLow <= prevBodyLow;

  // C) Minimum body size ratio
  const minBodySizeValid = bodyPrev > 0 && bodyCurr >= bodyPrev;

  // Check if basic engulfing conditions are met
  const engulfingConditionsMet = prevIsBullish && currIsBearish && fullyEngulfs && minBodySizeValid;

  // =========================
  // 3. ADDITIONAL RAW METRICS
  // =========================

  const bodySizeRatio = bodyPrev > 0 ? bodyCurr / bodyPrev : 0;
  const bodyCurrRangeRatio = bodyCurrRatio;
  const dominanceRatio = bodyPrev + bodyCurr > 0 ? bodyCurr / (bodyCurr + bodyPrev) : 0;

  // Calculate upTrendStrength (percentage rise over last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(currCandle, avgVolume20);

  // Calculate distance to resistance
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - currCandle.close) / currCandle.close) * 100
      : 100.0; // far if no resistance

  // =========================
  // 4. QUALITY BAND SCORING
  // =========================

  // If basic engulfing conditions failed, return early with strength=0
  if (!engulfingConditionsMet) {
    return {
      index,
      pattern: "BEARISH_ENGULFING",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyPrev,
        bodyCurr,
        bodyPrevRatio,
        bodyCurrRatio,
        bodySizeRatio: bodyPrev > 0 ? bodyCurr / bodyPrev : 0,
        bodyCurrRangeRatio,
        dominanceRatio: bodyPrev + bodyCurr > 0 ? bodyCurr / (bodyCurr + bodyPrev) : 0,
        volumeMultiple: calculateVolumeMultiple(
          currCandle,
          context.volumeAverage ?? calculateAverageVolume(candles, index, 20)
        ),
        upTrendStrengthPct: calculateUpTrendStrength(candles, index, 8),
        distanceToResistancePct:
          context.nearestResistance !== undefined
            ? (Math.abs(context.nearestResistance - currCandle.close) / currCandle.close) * 100
            : 100.0,
        bodyRatio: bodyCurrRatio,
        lowerWickRatio: 0,
        upperWickRatio: 0,
        trendStrength: calculateUpTrendStrength(candles, index, 8),
        distanceToSRpct:
          context.nearestResistance !== undefined
            ? (Math.abs(context.nearestResistance - currCandle.close) / currCandle.close) * 100
            : 100.0,
      },
    };
  }

  // A) Body Size Ratio Score (engulfScore)
  let engulfScore = 0.0;
  if (bodySizeRatio >= 1.0 && bodySizeRatio < 1.2) {
    engulfScore = 0.25; // weak
  } else if (bodySizeRatio >= 1.2 && bodySizeRatio < 1.5) {
    engulfScore = 0.5; // medium
  } else if (bodySizeRatio >= 1.5 && bodySizeRatio <= 2.0) {
    engulfScore = 0.75; // strong
  } else if (bodySizeRatio > 2.0) {
    engulfScore = 1.0; // very strong
  }

  // B) Current Body Dominance Score (bodyDominanceScore)
  let bodyDominanceScore = 0.0;
  if (bodyCurrRangeRatio < 0.4) {
    bodyDominanceScore = 0.25; // weak
  } else if (bodyCurrRangeRatio >= 0.4 && bodyCurrRangeRatio < 0.55) {
    bodyDominanceScore = 0.5; // medium
  } else if (bodyCurrRangeRatio >= 0.55 && bodyCurrRangeRatio <= 0.7) {
    bodyDominanceScore = 0.75; // strong
  } else if (bodyCurrRangeRatio > 0.7) {
    bodyDominanceScore = 1.0; // very strong
  }

  // C) Dominance Ratio Score (dominanceRatioScore)
  let dominanceRatioScore = 0.0;
  if (dominanceRatio >= 0.5 && dominanceRatio < 0.6) {
    dominanceRatioScore = 0.25; // weak
  } else if (dominanceRatio >= 0.6 && dominanceRatio < 0.7) {
    dominanceRatioScore = 0.5; // medium
  } else if (dominanceRatio >= 0.7 && dominanceRatio <= 0.8) {
    dominanceRatioScore = 0.75; // strong
  } else if (dominanceRatio > 0.8) {
    dominanceRatioScore = 1.0; // very strong
  }

  // Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.4) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.4 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 5. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: engulfScore, weight: 0.3 },
    { score: bodyDominanceScore, weight: 0.2 },
    { score: dominanceRatioScore, weight: 0.15 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 6. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 7. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // index of the CURRENT (engulfing) candle
    pattern: "BEARISH_ENGULFING",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyPrev,
      bodyCurr,
      bodyPrevRatio,
      bodyCurrRatio,
      bodySizeRatio,
      bodyCurrRangeRatio,
      dominanceRatio,
      volumeMultiple,
      upTrendStrengthPct,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyCurrRatio,
      lowerWickRatio: 0, // not applicable for engulfing pattern
      upperWickRatio: 0, // not applicable for engulfing pattern
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Hanging Man Candle Pattern
 * Classification: Reversal, Direction: SHORT
 * Appears after uptrend with long lower shadow and small body near top
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectHangingMan(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Calculate body position (top of range)
  const bodyTopPct = calculateBodyTopPct(candle, parts);

  // Calculate upTrendStrength (percentage rise over last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to resistance
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - candle.close) / candle.close) * 100
      : 100.0; // far if no resistance

  // Check if bearish close
  const isBearishClose = candle.close < candle.open ? 1 : 0;

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const lowerWickValid = lowerWickRatio >= 0.4;
  const bodyRatioValid = bodyRatio <= 0.35;
  const bodyTopValid = bodyTopPct >= 0.6;

  if (!lowerWickValid || !bodyRatioValid || !bodyTopValid) {
    return {
      index,
      pattern: "HANGING_MAN",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        lowerWickRatio,
        upperWickRatio,
        bodyTopPct,
        volumeMultiple,
        upTrendStrengthPct,
        distanceToResistancePct: distanceToResistance,
        isBearishClose,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Lower Wick Ratio Quality
  let wickScore = 0.0;
  if (lowerWickRatio >= 0.4 && lowerWickRatio < 0.5) {
    wickScore = 0.25; // weak
  } else if (lowerWickRatio >= 0.5 && lowerWickRatio < 0.65) {
    wickScore = 0.5; // medium
  } else if (lowerWickRatio >= 0.65 && lowerWickRatio <= 0.8) {
    wickScore = 0.75; // strong
  } else if (lowerWickRatio > 0.8) {
    wickScore = 1.0; // very strong
  }

  // B) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio >= 0.25 && bodyRatio <= 0.35) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.15 && bodyRatio < 0.25) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.15) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.05) {
    bodyScore = 1.0; // very strong
  }

  // C) Upper Wick Ratio Quality
  let upperWickScore = 0.0;
  if (upperWickRatio > 0.25) {
    upperWickScore = 0.0; // invalid (but we continue since basic check passed)
  } else if (upperWickRatio >= 0.15 && upperWickRatio <= 0.25) {
    upperWickScore = 0.25; // weak
  } else if (upperWickRatio >= 0.05 && upperWickRatio < 0.15) {
    upperWickScore = 0.5; // medium
  } else if (upperWickRatio < 0.05) {
    upperWickScore = 1.0; // strong
  }

  // D) Body Position Quality (top of range)
  let bodyTopScore = 0.0;
  if (bodyTopPct >= 0.6 && bodyTopPct < 0.7) {
    bodyTopScore = 0.25; // weak
  } else if (bodyTopPct >= 0.7 && bodyTopPct < 0.85) {
    bodyTopScore = 0.5; // medium
  } else if (bodyTopPct >= 0.85) {
    bodyTopScore = Math.min(1.0, 0.75 + (bodyTopPct - 0.85) * 5.0); // strong, cap at 1.0
  }

  // E) Candle Color Contribution
  const colorScore = isBearishClose === 1 ? 1.0 : 0.5;

  // Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.5) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.5 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: wickScore, weight: 0.25 },
    { score: bodyScore, weight: 0.15 },
    { score: upperWickScore, weight: 0.05 },
    { score: bodyTopScore, weight: 0.15 },
    { score: colorScore, weight: 0.05 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "HANGING_MAN",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      lowerWickRatio,
      upperWickRatio,
      bodyTopPct,
      volumeMultiple,
      upTrendStrengthPct,
      distanceToResistancePct: distanceToResistance,
      isBearishClose,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Inverted Hammer Candle Pattern
 * Classification: Reversal, Direction: LONG
 * Appears after downtrend with long upper shadow and small body near low
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectInvertedHammer(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Calculate body position (bottom of range)
  const bodyBottomPct = calculateBodyBottomPct(candle, parts);

  // Calculate downTrendStrength (percentage decline over last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to support
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(candle.close - context.nearestSupport) / candle.close) * 100
      : 100.0; // far if no support

  // Check if bullish close
  const isBullishClose = candle.close > candle.open ? 1 : 0;

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const upperWickValid = upperWickRatio >= 0.5;
  const bodyRatioValid = bodyRatio <= 0.35;
  const bodyBottomValid = bodyBottomPct <= 0.4;

  if (!upperWickValid || !bodyRatioValid || !bodyBottomValid) {
    return {
      index,
      pattern: "INVERTED_HAMMER",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        bodyBottomPct,
        volumeMultiple,
        downTrendStrengthPct,
        distanceToSupportPct: distanceToSupport,
        isBullishClose,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Upper Wick Ratio Quality
  let upperWickScore = 0.0;
  if (upperWickRatio >= 0.5 && upperWickRatio < 0.65) {
    upperWickScore = 0.25; // weak
  } else if (upperWickRatio >= 0.65 && upperWickRatio < 0.8) {
    upperWickScore = 0.5; // medium
  } else if (upperWickRatio >= 0.8 && upperWickRatio <= 1.0) {
    upperWickScore = 0.75; // strong
  } else if (upperWickRatio > 1.0) {
    upperWickScore = 1.0; // very strong
  }

  // B) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio >= 0.25 && bodyRatio <= 0.35) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.15 && bodyRatio < 0.25) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.15) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.05) {
    bodyScore = 1.0; // very strong
  }

  // C) Lower Wick Ratio Quality
  let lowerWickScore = 0.0;
  if (lowerWickRatio > 0.25) {
    lowerWickScore = 0.0; // invalid (but we continue since basic check passed)
  } else if (lowerWickRatio >= 0.15 && lowerWickRatio <= 0.25) {
    lowerWickScore = 0.25; // weak
  } else if (lowerWickRatio >= 0.05 && lowerWickRatio < 0.15) {
    lowerWickScore = 0.5; // medium
  } else if (lowerWickRatio < 0.05) {
    lowerWickScore = 1.0; // strong
  }

  // D) Body Position Quality (near low)
  let bodyBottomScore = 0.0;
  if (bodyBottomPct > 0.5) {
    bodyBottomScore = 0.0; // invalid
  } else if (bodyBottomPct >= 0.35 && bodyBottomPct <= 0.5) {
    bodyBottomScore = 0.25; // weak
  } else if (bodyBottomPct >= 0.2 && bodyBottomPct < 0.35) {
    bodyBottomScore = 0.5; // medium
  } else if (bodyBottomPct < 0.2) {
    bodyBottomScore = Math.min(1.0, 0.75 + (0.2 - bodyBottomPct) * 5.0); // strong, cap at 1.0
  }

  // E) Candle Color Contribution
  const colorScore = isBullishClose === 1 ? 1.0 : 0.5;

  // Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.5) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.5 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: upperWickScore, weight: 0.25 },
    { score: bodyScore, weight: 0.15 },
    { score: lowerWickScore, weight: 0.05 },
    { score: bodyBottomScore, weight: 0.15 },
    { score: colorScore, weight: 0.05 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "INVERTED_HAMMER",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      bodyBottomPct,
      volumeMultiple,
      downTrendStrengthPct,
      distanceToSupportPct: distanceToSupport,
      isBullishClose,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Dragonfly Doji Candle Pattern
 * Classification: Reversal/Indecision, Direction: LONG
 * Appears after downtrend with extremely small body, very small upper wick, and dominant lower shadow
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectDragonflyDoji(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Handle edge case where range is 0
  if (range === 0) return null;

  // Calculate high distance percentage
  const highDistancePct = calculateHighDistancePct(candle, parts);

  // Calculate downTrendStrength (percentage decline over last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to support
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(candle.close - context.nearestSupport) / candle.close) * 100
      : 100.0; // far if no support

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const bodyRatioValid = bodyRatio <= 0.15;
  const upperWickValid = upperWickRatio <= 0.2;
  const lowerWickValid = lowerWickRatio >= 0.6;

  if (!bodyRatioValid || !upperWickValid || !lowerWickValid) {
    return {
      index,
      pattern: "DRAGONFLY_DOJI",
      category: "REVERSAL_INDECISION",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        volumeMultiple,
        downTrendStrengthPct,
        distanceToSupportPct: distanceToSupport,
        highDistancePct,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio > 0.15) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.1 && bodyRatio <= 0.15) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.1) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.02 && bodyRatio < 0.05) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.02) {
    bodyScore = 1.0; // very strong
  }

  // B) Upper Wick Ratio Quality
  let upperWickScore = 0.0;
  if (upperWickRatio > 0.2) {
    upperWickScore = 0.0; // invalid
  } else if (upperWickRatio >= 0.1 && upperWickRatio <= 0.2) {
    upperWickScore = 0.25; // weak
  } else if (upperWickRatio >= 0.05 && upperWickRatio < 0.1) {
    upperWickScore = 0.5; // medium
  } else if (upperWickRatio < 0.05) {
    upperWickScore = 1.0; // strong
  }

  // C) Lower Wick Ratio Quality
  let lowerWickScore = 0.0;
  if (lowerWickRatio < 0.6) {
    lowerWickScore = 0.0; // invalid
  } else if (lowerWickRatio >= 0.6 && lowerWickRatio < 0.7) {
    lowerWickScore = 0.25; // weak
  } else if (lowerWickRatio >= 0.7 && lowerWickRatio < 0.8) {
    lowerWickScore = 0.5; // medium
  } else if (lowerWickRatio >= 0.8 && lowerWickRatio <= 0.9) {
    lowerWickScore = 0.75; // strong
  } else if (lowerWickRatio > 0.9) {
    lowerWickScore = 1.0; // very strong
  }

  // D) Body position vs high (price closes/opens near high)
  let highPosScore = 0.0;
  if (highDistancePct > 0.25) {
    highPosScore = 0.0; // invalid
  } else if (highDistancePct >= 0.15 && highDistancePct <= 0.25) {
    highPosScore = 0.25; // weak
  } else if (highDistancePct >= 0.08 && highDistancePct < 0.15) {
    highPosScore = 0.5; // medium
  } else if (highDistancePct < 0.08) {
    highPosScore = Math.min(1.0, 0.75 + (0.08 - highDistancePct) * 12.5); // strong, cap at 1.0
  }

  // Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.4) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.4 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: lowerWickScore, weight: 0.25 },
    { score: bodyScore, weight: 0.15 },
    { score: upperWickScore, weight: 0.1 },
    { score: highPosScore, weight: 0.1 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "DRAGONFLY_DOJI",
    category: "REVERSAL_INDECISION",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      volumeMultiple,
      downTrendStrengthPct,
      distanceToSupportPct: distanceToSupport,
      highDistancePct,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Gravestone Doji Candle Pattern
 * Classification: Reversal/Indecision, Direction: SHORT
 * Appears after uptrend with extremely small body, very small lower wick, and dominant upper shadow
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectGravestoneDoji(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Handle edge case where range is 0
  if (range === 0) return null;

  // Calculate low distance percentage
  const lowDistancePct = calculateLowDistancePct(candle, parts);

  // Calculate upTrendStrength (percentage rise over last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to resistance
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - candle.close) / candle.close) * 100
      : 100.0; // far if no resistance

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const bodyRatioValid = bodyRatio <= 0.15;
  const lowerWickValid = lowerWickRatio <= 0.2;
  const upperWickValid = upperWickRatio >= 0.6;

  if (!bodyRatioValid || !lowerWickValid || !upperWickValid) {
    return {
      index,
      pattern: "GRAVESTONE_DOJI",
      category: "REVERSAL_INDECISION",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        volumeMultiple,
        upTrendStrengthPct,
        distanceToResistancePct: distanceToResistance,
        lowDistancePct,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio > 0.15) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.1 && bodyRatio <= 0.15) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.1) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.02 && bodyRatio < 0.05) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.02) {
    bodyScore = 1.0; // very strong
  }

  // B) Lower Wick Ratio Quality
  let lowerWickScore = 0.0;
  if (lowerWickRatio > 0.2) {
    lowerWickScore = 0.0; // invalid
  } else if (lowerWickRatio >= 0.1 && lowerWickRatio <= 0.2) {
    lowerWickScore = 0.25; // weak
  } else if (lowerWickRatio >= 0.05 && lowerWickRatio < 0.1) {
    lowerWickScore = 0.5; // medium
  } else if (lowerWickRatio < 0.05) {
    lowerWickScore = 1.0; // strong
  }

  // C) Upper Wick Ratio Quality
  let upperWickScore = 0.0;
  if (upperWickRatio < 0.6) {
    upperWickScore = 0.0; // invalid
  } else if (upperWickRatio >= 0.6 && upperWickRatio < 0.7) {
    upperWickScore = 0.25; // weak
  } else if (upperWickRatio >= 0.7 && upperWickRatio < 0.8) {
    upperWickScore = 0.5; // medium
  } else if (upperWickRatio >= 0.8 && upperWickRatio <= 0.9) {
    upperWickScore = 0.75; // strong
  } else if (upperWickRatio > 0.9) {
    upperWickScore = 1.0; // very strong
  }

  // D) Body position vs low (open/close near low)
  let lowPosScore = 0.0;
  if (lowDistancePct > 0.25) {
    lowPosScore = 0.0; // invalid
  } else if (lowDistancePct >= 0.15 && lowDistancePct <= 0.25) {
    lowPosScore = 0.25; // weak
  } else if (lowDistancePct >= 0.08 && lowDistancePct < 0.15) {
    lowPosScore = 0.5; // medium
  } else if (lowDistancePct < 0.08) {
    lowPosScore = Math.min(1.0, 0.75 + (0.08 - lowDistancePct) * 12.5); // strong, cap at 1.0
  }

  // Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.4) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.4 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: upperWickScore, weight: 0.25 },
    { score: bodyScore, weight: 0.15 },
    { score: lowerWickScore, weight: 0.1 },
    { score: lowPosScore, weight: 0.1 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "GRAVESTONE_DOJI",
    category: "REVERSAL_INDECISION",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      volumeMultiple,
      upTrendStrengthPct,
      distanceToResistancePct: distanceToResistance,
      lowDistancePct,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Spinning Top Candle Pattern
 * Classification: Indecision, Direction: NEUTRAL
 * Shows indecision with small body and balanced wicks
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectSpinningTop(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Handle edge case where range is 0
  if (range === 0) return null;

  // Calculate wick metrics
  const wickTotalRatio = upperWickRatio + lowerWickRatio;
  const wickBalance =
    wickTotalRatio > 0 ? 1 - Math.abs(upperWickRatio - lowerWickRatio) / wickTotalRatio : 0;

  // Calculate absolute trend strength (regardless of direction)
  const trendStrengthPct = calculateAbsoluteTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const bodyRatioValid = bodyRatio >= 0.1 && bodyRatio <= 0.45;
  const upperWickValid = upperWickRatio >= 0.2;
  const lowerWickValid = lowerWickRatio >= 0.2;

  if (!bodyRatioValid || !upperWickValid || !lowerWickValid) {
    return {
      index,
      pattern: "SPINNING_TOP",
      category: "INDECISION",
      direction: "NEUTRAL",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        wickTotalRatio,
        wickBalance,
        volumeMultiple,
        trendStrengthPct,
        // Include standard interface metrics for compatibility
        trendStrength: trendStrengthPct,
        distanceToSRpct: 1.0, // not applicable for spinning top
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio < 0.1 || bodyRatio > 0.45) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.1 && bodyRatio < 0.15) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.15 && bodyRatio < 0.25) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.25 && bodyRatio < 0.35) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio >= 0.35 && bodyRatio <= 0.45) {
    bodyScore = 0.5; // moderate (leaning to small candle but slightly stronger body)
  }

  // B) Wick Total Ratio Quality
  let wickTotalScore = 0.0;
  if (wickTotalRatio < 0.4) {
    wickTotalScore = 0.0; // invalid
  } else if (wickTotalRatio >= 0.4 && wickTotalRatio < 0.6) {
    wickTotalScore = 0.25; // weak
  } else if (wickTotalRatio >= 0.6 && wickTotalRatio < 0.8) {
    wickTotalScore = 0.5; // medium
  } else if (wickTotalRatio >= 0.8 && wickTotalRatio <= 1.0) {
    wickTotalScore = 0.75; // strong
  } else if (wickTotalRatio > 1.0) {
    wickTotalScore = 1.0; // very strong
  }

  // C) Wick Balance Quality
  let wickBalanceScore = 0.0;
  if (wickBalance >= 0.0 && wickBalance < 0.4) {
    wickBalanceScore = 0.25; // poor balance
  } else if (wickBalance >= 0.4 && wickBalance < 0.7) {
    wickBalanceScore = 0.5; // medium
  } else if (wickBalance >= 0.7 && wickBalance <= 0.9) {
    wickBalanceScore = 0.75; // strong
  } else if (wickBalance > 0.9) {
    wickBalanceScore = 1.0; // very strong
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.5 && volumeMultiple < 0.8) {
    volumeScore = 0.25; // low participation
  } else if (volumeMultiple >= 0.8 && volumeMultiple < 1.2) {
    volumeScore = 0.5; // normal
  } else if (volumeMultiple >= 1.2 && volumeMultiple <= 1.8) {
    volumeScore = 0.75; // elevated
  } else if (volumeMultiple > 1.8) {
    volumeScore = 1.0; // high
  }

  // Trend Context Scoring (absolute value, regardless of direction)
  let trendScore = 0.0;
  if (trendStrengthPct >= 0 && trendStrengthPct < 2.0) {
    trendScore = 0.25; // flat/sideways context
  } else if (trendStrengthPct >= 2.0 && trendStrengthPct < 5.0) {
    trendScore = 0.5; // moderate context
  } else if (trendStrengthPct >= 5.0) {
    trendScore = Math.min(1.0, 0.75 + (trendStrengthPct - 5.0) / 10.0); // strong trend context, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyScore, weight: 0.25 },
    { score: wickTotalScore, weight: 0.25 },
    { score: wickBalanceScore, weight: 0.2 },
    { score: volumeScore, weight: 0.15 },
    { score: trendScore, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  // Lower threshold because spinning tops are inherently softer signals
  const isPattern = strength >= 0.45;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "SPINNING_TOP",
    category: "INDECISION",
    direction: "NEUTRAL",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      wickTotalRatio,
      wickBalance,
      volumeMultiple,
      trendStrengthPct,
      // Include standard interface metrics for compatibility
      trendStrength: trendStrengthPct,
      distanceToSRpct: 1.0, // not applicable for spinning top
    },
  };
}

/**
 * Detect High-Wave Candle Pattern
 * Classification: Indecision / Volatility Spike, Direction: NEUTRAL
 * Shows confusion with strong intrabar volatility - small body and very large shadows
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectHighWave(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Handle edge case where range is 0
  if (range === 0) return null;

  // Calculate wick metrics
  const wickTotalRatio = upperWickRatio + lowerWickRatio;
  const epsilon = 0.0001;
  const wickBalance =
    wickTotalRatio > epsilon ? 1 - Math.abs(upperWickRatio - lowerWickRatio) / wickTotalRatio : 0;

  // Calculate ATR multiple (volatility spike)
  const atr14 = calculateATR(candles, index, 14);
  const atrMultiple = atr14 > 0 ? range / atr14 : 1.0;

  // Calculate absolute trend strength (regardless of direction)
  const trendStrengthPct = calculateAbsoluteTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const bodyRatioValid = bodyRatio <= 0.35;
  const wickTotalValid = wickTotalRatio >= 0.6;

  if (!bodyRatioValid || !wickTotalValid) {
    return {
      index,
      pattern: "HIGH_WAVE",
      category: "INDECISION",
      direction: "NEUTRAL",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        wickTotalRatio,
        wickBalance,
        atrMultiple,
        volumeMultiple,
        trendStrengthPct,
        // Include standard interface metrics for compatibility
        trendStrength: trendStrengthPct,
        distanceToSRpct: 1.0, // not applicable for high wave
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio > 0.35) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.25 && bodyRatio <= 0.35) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.15 && bodyRatio < 0.25) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.07 && bodyRatio < 0.15) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.07) {
    bodyScore = 1.0; // very strong
  }

  // B) Wick Total Ratio Quality
  let wickTotalScore = 0.0;
  if (wickTotalRatio < 0.6) {
    wickTotalScore = 0.0; // invalid
  } else if (wickTotalRatio >= 0.6 && wickTotalRatio < 0.8) {
    wickTotalScore = 0.25; // weak
  } else if (wickTotalRatio >= 0.8 && wickTotalRatio < 1.0) {
    wickTotalScore = 0.5; // medium
  } else if (wickTotalRatio >= 1.0 && wickTotalRatio <= 1.2) {
    wickTotalScore = 0.75; // strong
  } else if (wickTotalRatio > 1.2) {
    wickTotalScore = 1.0; // very strong
  }

  // C) Wick Balance Quality
  let wickBalanceScore = 0.0;
  if (wickBalance >= 0.0 && wickBalance < 0.4) {
    wickBalanceScore = 0.25; // poor balance
  } else if (wickBalance >= 0.4 && wickBalance < 0.7) {
    wickBalanceScore = 0.5; // medium
  } else if (wickBalance >= 0.7 && wickBalance <= 0.9) {
    wickBalanceScore = 0.75; // strong
  } else if (wickBalance > 0.9) {
    wickBalanceScore = 1.0; // very strong
  }

  // ATR Multiple (Volatility Spike) Scoring
  let atrScore = 0.0;
  if (atrMultiple >= 1.0 && atrMultiple < 1.2) {
    atrScore = 0.25; // weak
  } else if (atrMultiple >= 1.2 && atrMultiple < 1.5) {
    atrScore = 0.5; // medium
  } else if (atrMultiple >= 1.5 && atrMultiple <= 2.0) {
    atrScore = 0.75; // strong
  } else if (atrMultiple > 2.0) {
    atrScore = 1.0; // very strong
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.4) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.4 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Trend Context Scoring (absolute value, regardless of direction)
  let trendScore = 0.0;
  if (trendStrengthPct >= 0 && trendStrengthPct < 2.0) {
    trendScore = 0.25; // flat context
  } else if (trendStrengthPct >= 2.0 && trendStrengthPct < 5.0) {
    trendScore = 0.5; // moderate trend
  } else if (trendStrengthPct >= 5.0) {
    trendScore = Math.min(1.0, 0.75 + (trendStrengthPct - 5.0) / 10.0); // strong trend context, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyScore, weight: 0.2 },
    { score: wickTotalScore, weight: 0.25 },
    { score: wickBalanceScore, weight: 0.1 },
    { score: atrScore, weight: 0.2 },
    { score: volumeScore, weight: 0.15 },
    { score: trendScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.5;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "HIGH_WAVE",
    category: "INDECISION",
    direction: "NEUTRAL",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      wickTotalRatio,
      wickBalance,
      atrMultiple,
      volumeMultiple,
      trendStrengthPct,
      // Include standard interface metrics for compatibility
      trendStrength: trendStrengthPct,
      distanceToSRpct: 1.0, // not applicable for high wave
    },
  };
}

/**
 * Detect Standard Doji Candle Pattern
 * Classification: Indecision, Direction: NEUTRAL
 * Shows pure indecision with extremely small body and balanced wicks
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectStandardDoji(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle (no range)

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Handle edge case where range is 0
  if (range === 0) return null;

  // Calculate wick metrics
  const wickTotalRatio = upperWickRatio + lowerWickRatio;
  const epsilon = 0.0001;
  const wickBalance =
    wickTotalRatio > epsilon ? 1 - Math.abs(upperWickRatio - lowerWickRatio) / wickTotalRatio : 0;

  // Calculate absolute trend strength (regardless of direction)
  const trendStrengthPct = calculateAbsoluteTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to nearest S/R (support or resistance)
  const distanceToSRNormalized = calculateDistanceToSR(
    candle,
    context.nearestSupport,
    context.nearestResistance
  );
  const distanceToNearestSRpct = distanceToSRNormalized * 100; // convert to percentage

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const bodyRatioValid = bodyRatio <= 0.15;
  const wickTotalValid = wickTotalRatio >= 0.6;

  if (!bodyRatioValid || !wickTotalValid) {
    return {
      index,
      pattern: "STANDARD_DOJI",
      category: "INDECISION",
      direction: "NEUTRAL",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        wickTotalRatio,
        wickBalance,
        volumeMultiple,
        trendStrengthPct,
        distanceToNearestSRpct,
        // Include standard interface metrics for compatibility
        trendStrength: trendStrengthPct,
        distanceToSRpct: distanceToNearestSRpct,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio > 0.15) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.1 && bodyRatio <= 0.15) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.1) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.02 && bodyRatio < 0.05) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.02) {
    bodyScore = 1.0; // very strong
  }

  // B) Wick Total Ratio Quality
  let wickTotalScore = 0.0;
  if (wickTotalRatio < 0.6) {
    wickTotalScore = 0.0; // invalid
  } else if (wickTotalRatio >= 0.6 && wickTotalRatio < 0.8) {
    wickTotalScore = 0.25; // weak
  } else if (wickTotalRatio >= 0.8 && wickTotalRatio < 1.0) {
    wickTotalScore = 0.5; // medium
  } else if (wickTotalRatio >= 1.0 && wickTotalRatio <= 1.2) {
    wickTotalScore = 0.75; // strong
  } else if (wickTotalRatio > 1.2) {
    wickTotalScore = 1.0; // very strong
  }

  // C) Wick Balance Quality
  let wickBalanceScore = 0.0;
  if (wickBalance >= 0.0 && wickBalance < 0.4) {
    wickBalanceScore = 0.25; // skewed
  } else if (wickBalance >= 0.4 && wickBalance < 0.7) {
    wickBalanceScore = 0.5; // medium balance
  } else if (wickBalance >= 0.7 && wickBalance <= 0.9) {
    wickBalanceScore = 0.75; // strong balance
  } else if (wickBalance > 0.9) {
    wickBalanceScore = 1.0; // very symmetric
  }

  // Trend Context Scoring (absolute value, regardless of direction)
  let trendScore = 0.0;
  if (trendStrengthPct >= 0 && trendStrengthPct < 2.0) {
    trendScore = 0.25; // weak trend context
  } else if (trendStrengthPct >= 2.0 && trendStrengthPct < 5.0) {
    trendScore = 0.5; // moderate
  } else if (trendStrengthPct >= 5.0) {
    trendScore = Math.min(1.0, 0.75 + (trendStrengthPct - 5.0) / 10.0); // strong, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.5 && volumeMultiple < 0.8) {
    volumeScore = 0.25; // low participation
  } else if (volumeMultiple >= 0.8 && volumeMultiple < 1.2) {
    volumeScore = 0.5; // normal
  } else if (volumeMultiple >= 1.2 && volumeMultiple <= 1.8) {
    volumeScore = 0.75; // elevated
  } else if (volumeMultiple > 1.8) {
    volumeScore = 1.0; // high
  }

  // S/R Proximity Scoring
  let srScore = 0.0;
  if (distanceToNearestSRpct > 1.0) {
    srScore = 0.25; // weak S/R context
  } else if (distanceToNearestSRpct >= 0.5 && distanceToNearestSRpct <= 1.0) {
    srScore = 0.5; // medium
  } else if (distanceToNearestSRpct >= 0.25 && distanceToNearestSRpct < 0.5) {
    srScore = 0.75; // strong
  } else if (distanceToNearestSRpct < 0.25) {
    srScore = 1.0; // very strong
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyScore, weight: 0.3 },
    { score: wickTotalScore, weight: 0.25 },
    { score: wickBalanceScore, weight: 0.1 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.5;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "STANDARD_DOJI",
    category: "INDECISION",
    direction: "NEUTRAL",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      wickTotalRatio,
      wickBalance,
      volumeMultiple,
      trendStrengthPct,
      distanceToNearestSRpct,
      // Include standard interface metrics for compatibility
      trendStrength: trendStrengthPct,
      distanceToSRpct: distanceToNearestSRpct,
    },
  };
}

/**
 * Detect Bullish Pin Bar Candle Pattern
 * Classification: Reversal / Rejection, Direction: LONG
 * Shows aggressive rejection of lower prices with close in upper range
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishPinBar(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Calculate close position percentage
  const closePosPct = calculateClosePosPct(candle, parts);

  // Calculate downTrendStrength (percentage decline over last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to support
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(candle.close - context.nearestSupport) / candle.close) * 100
      : 100.0; // far if no support

  // Check if bullish close
  const isBullishClose = candle.close > candle.open ? 1 : 0;

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const lowerWickValid = lowerWickRatio >= 0.5;
  const bodyRatioValid = bodyRatio <= 0.35;
  const closePosValid = closePosPct >= 0.5;

  if (!lowerWickValid || !bodyRatioValid || !closePosValid) {
    return {
      index,
      pattern: "BULLISH_PIN_BAR",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        lowerWickRatio,
        upperWickRatio,
        closePosPct,
        volumeMultiple,
        downTrendStrengthPct,
        distanceToSupportPct: distanceToSupport,
        isBullishClose,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Lower Wick Ratio Quality
  let wickScore = 0.0;
  if (lowerWickRatio < 0.5) {
    wickScore = 0.0; // invalid
  } else if (lowerWickRatio >= 0.5 && lowerWickRatio < 0.65) {
    wickScore = 0.25; // weak
  } else if (lowerWickRatio >= 0.65 && lowerWickRatio < 0.8) {
    wickScore = 0.5; // medium
  } else if (lowerWickRatio >= 0.8 && lowerWickRatio <= 1.0) {
    wickScore = 0.75; // strong
  } else if (lowerWickRatio > 1.0) {
    wickScore = 1.0; // very strong
  }

  // B) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio > 0.35) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.25 && bodyRatio <= 0.35) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.15 && bodyRatio < 0.25) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.15) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.05) {
    bodyScore = 1.0; // very strong
  }

  // C) Close Position Quality
  let closePosScore = 0.0;
  if (closePosPct < 0.5) {
    closePosScore = 0.0; // invalid (weak pin)
  } else if (closePosPct >= 0.5 && closePosPct < 0.6) {
    closePosScore = 0.25; // weak
  } else if (closePosPct >= 0.6 && closePosPct < 0.75) {
    closePosScore = 0.5; // medium
  } else if (closePosPct >= 0.75 && closePosPct < 0.9) {
    closePosScore = 0.75; // strong
  } else if (closePosPct >= 0.9) {
    closePosScore = 1.0; // very strong
  }

  // D) Color Score
  const colorScore = isBullishClose === 1 ? 1.0 : 0.6;

  // Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 0 && downTrendStrengthPct < 2.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 5.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 5.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 5.0) / 10.0); // strong context, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.5) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.5 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: wickScore, weight: 0.3 },
    { score: bodyScore, weight: 0.15 },
    { score: closePosScore, weight: 0.15 },
    { score: colorScore, weight: 0.05 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BULLISH_PIN_BAR",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      lowerWickRatio,
      upperWickRatio,
      closePosPct,
      volumeMultiple,
      downTrendStrengthPct,
      distanceToSupportPct: distanceToSupport,
      isBullishClose,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Bearish Pin Bar Candle Pattern
 * Classification: Reversal / Rejection, Direction: SHORT
 * Shows aggressive rejection of higher prices with close in lower range
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBearishPinBar(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];
  if (candle.high === candle.low) return null; // invalid candle

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);
  const range = parts.totalRange;
  const body = parts.body;
  const upperWick = parts.upperShadow;
  const lowerWick = parts.lowerShadow;
  const bodyRatio = parts.bodyRatio;
  const lowerWickRatio = parts.lowerShadowRatio;
  const upperWickRatio = parts.upperShadowRatio;

  // Calculate close position percentage from high
  const closePosPctFromHigh = calculateClosePosPctFromHigh(candle, parts);

  // Calculate upTrendStrength (percentage rise over last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index, 8);

  // Calculate volume multiple
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Calculate distance to resistance
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - candle.close) / candle.close) * 100
      : 100.0; // far if no resistance

  // Check if bearish close
  const isBearishClose = candle.close < candle.open ? 1 : 0;

  // =========================
  // 2. BASIC SHAPE REQUIREMENTS
  // =========================

  // Basic requirements check
  const upperWickValid = upperWickRatio >= 0.5;
  const bodyRatioValid = bodyRatio <= 0.35;
  const closePosValid = closePosPctFromHigh >= 0.5;

  if (!upperWickValid || !bodyRatioValid || !closePosValid) {
    return {
      index,
      pattern: "BEARISH_PIN_BAR",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        closePosPctFromHigh,
        volumeMultiple,
        upTrendStrengthPct,
        distanceToResistancePct: distanceToResistance,
        isBearishClose,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Upper Wick Ratio Quality
  let wickScore = 0.0;
  if (upperWickRatio < 0.5) {
    wickScore = 0.0; // invalid
  } else if (upperWickRatio >= 0.5 && upperWickRatio < 0.65) {
    wickScore = 0.25; // weak
  } else if (upperWickRatio >= 0.65 && upperWickRatio < 0.8) {
    wickScore = 0.5; // medium
  } else if (upperWickRatio >= 0.8 && upperWickRatio <= 1.0) {
    wickScore = 0.75; // strong
  } else if (upperWickRatio > 1.0) {
    wickScore = 1.0; // very strong
  }

  // B) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio > 0.35) {
    bodyScore = 0.0; // invalid
  } else if (bodyRatio >= 0.25 && bodyRatio <= 0.35) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.15 && bodyRatio < 0.25) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.05 && bodyRatio < 0.15) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio < 0.05) {
    bodyScore = 1.0; // very strong
  }

  // C) Close Position Quality (near low side relative to full range)
  let closePosScore = 0.0;
  if (closePosPctFromHigh < 0.5) {
    closePosScore = 0.0; // invalid
  } else if (closePosPctFromHigh >= 0.5 && closePosPctFromHigh < 0.6) {
    closePosScore = 0.25; // weak
  } else if (closePosPctFromHigh >= 0.6 && closePosPctFromHigh < 0.75) {
    closePosScore = 0.5; // medium
  } else if (closePosPctFromHigh >= 0.75 && closePosPctFromHigh < 0.9) {
    closePosScore = 0.75; // strong
  } else if (closePosPctFromHigh >= 0.9) {
    closePosScore = 1.0; // very strong
  }

  // D) Color Score
  const colorScore = isBearishClose === 1 ? 1.0 : 0.6;

  // Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 0 && upTrendStrengthPct < 2.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 2.0 && upTrendStrengthPct < 5.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 5.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 5.0) / 10.0); // strong context, cap at 1.0
  }

  // Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.5) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.5 && volumeMultiple <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: wickScore, weight: 0.3 },
    { score: bodyScore, weight: 0.15 },
    { score: closePosScore, weight: 0.15 },
    { score: colorScore, weight: 0.05 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BEARISH_PIN_BAR",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      closePosPctFromHigh,
      volumeMultiple,
      upTrendStrengthPct,
      distanceToResistancePct: distanceToResistance,
      isBearishClose,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Morning Star Candle Pattern (Three-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * Three-candle bullish reversal: bearish C1, small "star" C2, strong bullish C3
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectMorningStar(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 3 candles (index >= 2)
  if (!candles || index < 2 || index >= candles.length) {
    return null;
  }

  // Get the three candles: C1 (n-2), C2 (n-1), C3 (n)
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;

  // Color checks
  const isBearishC1 = c1.close < c1.open;
  const isBullishC3 = c3.close > c3.open;

  // C1 body midpoint
  const c1BodyMid = (c1.open + c1.close) / 2;
  const c1BodySize = Math.abs(c1.open - c1.close);

  // Recovery percentage
  const epsilon = 0.0001;
  const recoveryPct = c1BodySize > epsilon ? (c3.close - c1BodyMid) / c1BodySize : 0;

  // Gap-like score (C2 low below C1 low)
  const gapLikeScore = c2.low < c1.low ? 1.0 : 0.5;

  // Calculate downTrendStrength (before C1, last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 2, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const vol1 = calculateVolumeMultiple(c1, avgVolume20);
  const vol2 = calculateVolumeMultiple(c2, avgVolume20);
  const vol3 = calculateVolumeMultiple(c3, avgVolume20);

  // Distance to support (using C3 close)
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(c3.close - context.nearestSupport) / c3.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) First candle (C1) - bearish, relatively strong body
  const c1Condition = isBearishC1 && bodyRatio1 >= 0.4;

  // B) Second candle (C2) - small body, gap down or lower close
  const c2Condition = bodyRatio2 <= 0.35 && c2.close < c1.close;

  // C) Third candle (C3) - strong bullish recovery
  const c3Condition = isBullishC3 && bodyRatio3 >= 0.4 && c3.close >= c1BodyMid;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition) {
    return {
      index, // Return index of C3
      pattern: "MORNING_STAR",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        downTrendStrengthPct,
        vol1,
        vol2,
        vol3,
        gapLikeScore,
        recoveryPct,
        distanceToSupportPct: distanceToSupport,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) First candle bearish strength (C1)
  let firstBearScore = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    firstBearScore = 0.25; // weak
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    firstBearScore = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    firstBearScore = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    firstBearScore = 1.0; // very strong
  }

  // B) Second candle "star" quality (C2)
  let starScore = 0.0;
  if (bodyRatio2 >= 0.25 && bodyRatio2 <= 0.35) {
    starScore = 0.25; // weak star
  } else if (bodyRatio2 >= 0.15 && bodyRatio2 < 0.25) {
    starScore = 0.5; // medium
  } else if (bodyRatio2 >= 0.05 && bodyRatio2 < 0.15) {
    starScore = 0.75; // strong
  } else if (bodyRatio2 < 0.05) {
    starScore = 1.0; // very strong
  }

  // C) Third candle bullish strength (C3)
  let thirdBullScore = 0.0;
  if (bodyRatio3 >= 0.3 && bodyRatio3 < 0.4) {
    thirdBullScore = 0.25; // weak
  } else if (bodyRatio3 >= 0.4 && bodyRatio3 < 0.55) {
    thirdBullScore = 0.5; // medium
  } else if (bodyRatio3 >= 0.55 && bodyRatio3 < 0.7) {
    thirdBullScore = 0.75; // strong
  } else if (bodyRatio3 >= 0.7) {
    thirdBullScore = 1.0; // very strong
  }

  // D) Recovery score (C3 close relative to C1 midpoint)
  let recoveryScore = 0.0;
  if (recoveryPct < 0) {
    recoveryScore = 0.0; // invalid (didn't reach midpoint)
  } else if (recoveryPct >= 0 && recoveryPct < 0.2) {
    recoveryScore = 0.25; // weak
  } else if (recoveryPct >= 0.2 && recoveryPct < 0.5) {
    recoveryScore = 0.5; // medium
  } else if (recoveryPct >= 0.5 && recoveryPct <= 1.0) {
    recoveryScore = Math.min(1.0, 0.75 + (recoveryPct - 0.5) * 0.5); // strong, cap at 1.0
  }

  // E) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // F) Volume Context Scoring (focus on C3, with bonus for vol2 low & vol3 high)
  let volumeScore = 0.0;
  if (vol3 >= 0.7 && vol3 < 1.0) {
    volumeScore = 0.25; // weak
  } else if (vol3 >= 1.0 && vol3 < 1.4) {
    volumeScore = 0.5; // medium
  } else if (vol3 >= 1.4 && vol3 <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (vol3 > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Optional bonus: low volume in C2 + high volume in C3 (exhaustion then demand)
  if (vol2 < 0.8 && vol3 >= 1.2) {
    volumeScore = Math.min(1.0, volumeScore + 0.1); // add small bonus
  }

  // G) Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: firstBearScore, weight: 0.15 },
    { score: starScore, weight: 0.15 },
    { score: gapLikeScore, weight: 0.1 },
    { score: thirdBullScore, weight: 0.2 },
    { score: recoveryScore, weight: 0.15 },
    { score: trendScore, weight: 0.1 },
    { score: volumeScore, weight: 0.08 },
    { score: srScore, weight: 0.07 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C3 (the third candle)
    pattern: "MORNING_STAR",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      downTrendStrengthPct,
      vol1,
      vol2,
      vol3,
      gapLikeScore,
      recoveryPct,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Evening Star Candle Pattern (Three-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Three-candle bearish reversal: bullish C1, small "star" C2, strong bearish C3
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectEveningStar(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 3 candles (index >= 2)
  if (!candles || index < 2 || index >= candles.length) {
    return null;
  }

  // Get the three candles: C1 (n-2), C2 (n-1), C3 (n)
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;

  // Color checks
  const isBullishC1 = c1.close > c1.open;
  const isBearishC3 = c3.close < c3.open;

  // C1 body midpoint
  const c1BodyMid = (c1.open + c1.close) / 2;
  const c1BodySize = Math.abs(c1.open - c1.close);

  // Breakdown percentage (how much C3 closes below C1 midpoint)
  const epsilon = 0.0001;
  const breakdownPct = c1BodySize > epsilon ? (c1BodyMid - c3.close) / c1BodySize : 0;

  // Star above score (C2 position relative to C1)
  let starAboveScore = 0.4;
  if (c2.low > c1.close) {
    starAboveScore = 1.0; // ideal "gap-like"
  } else if (c2.close >= c1.close) {
    starAboveScore = 0.7; // above C1 close
  }

  // Calculate upTrendStrength (before C1, last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 2, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const vol1 = calculateVolumeMultiple(c1, avgVolume20);
  const vol2 = calculateVolumeMultiple(c2, avgVolume20);
  const vol3 = calculateVolumeMultiple(c3, avgVolume20);

  // Distance to resistance (using C3 close)
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - c3.close) / c3.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) First candle (C1) - bullish, relatively strong body
  const c1Condition = isBullishC1 && bodyRatio1 >= 0.4;

  // B) Second candle (C2) - small body, star-like, typically above C1 close
  const c2Condition = bodyRatio2 <= 0.35;

  // C) Third candle (C3) - strong bearish breakdown
  const c3Condition = isBearishC3 && bodyRatio3 >= 0.4 && c3.close <= c1BodyMid;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition) {
    return {
      index, // Return index of C3
      pattern: "EVENING_STAR",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        upTrendStrengthPct,
        vol1,
        vol2,
        vol3,
        starAboveScore,
        breakdownPct,
        distanceToResistancePct: distanceToResistance,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) First candle bullish strength (C1)
  let firstBullScore = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    firstBullScore = 0.25; // weak
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    firstBullScore = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    firstBullScore = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    firstBullScore = 1.0; // very strong
  }

  // B) Second candle "star" quality (C2)
  let starScore = 0.0;
  if (bodyRatio2 >= 0.25 && bodyRatio2 <= 0.35) {
    starScore = 0.25; // weak star
  } else if (bodyRatio2 >= 0.15 && bodyRatio2 < 0.25) {
    starScore = 0.5; // medium
  } else if (bodyRatio2 >= 0.05 && bodyRatio2 < 0.15) {
    starScore = 0.75; // strong
  } else if (bodyRatio2 < 0.05) {
    starScore = 1.0; // very strong
  }

  // C) Third candle bearish strength (C3)
  let thirdBearScore = 0.0;
  if (bodyRatio3 >= 0.3 && bodyRatio3 < 0.4) {
    thirdBearScore = 0.25; // weak
  } else if (bodyRatio3 >= 0.4 && bodyRatio3 < 0.55) {
    thirdBearScore = 0.5; // medium
  } else if (bodyRatio3 >= 0.55 && bodyRatio3 < 0.7) {
    thirdBearScore = 0.75; // strong
  } else if (bodyRatio3 >= 0.7) {
    thirdBearScore = 1.0; // very strong
  }

  // D) Breakdown score (C3 close relative to C1 midpoint)
  let breakdownScore = 0.0;
  if (breakdownPct <= 0) {
    breakdownScore = 0.0; // invalid (didn't break midpoint)
  } else if (breakdownPct > 0 && breakdownPct < 0.2) {
    breakdownScore = 0.25; // weak
  } else if (breakdownPct >= 0.2 && breakdownPct < 0.5) {
    breakdownScore = 0.5; // medium
  } else if (breakdownPct >= 0.5 && breakdownPct <= 1.0) {
    breakdownScore = Math.min(1.0, 0.75 + (breakdownPct - 0.5) * 0.5); // strong, cap at 1.0
  }

  // E) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // F) Volume Context Scoring (focus on C3, with bonus for vol2 low & vol3 high)
  let volumeScore = 0.0;
  if (vol3 >= 0.7 && vol3 < 1.0) {
    volumeScore = 0.25; // weak
  } else if (vol3 >= 1.0 && vol3 < 1.4) {
    volumeScore = 0.5; // medium
  } else if (vol3 >= 1.4 && vol3 <= 2.0) {
    volumeScore = 0.75; // strong
  } else if (vol3 > 2.0) {
    volumeScore = 1.0; // very strong
  }

  // Optional bonus: low volume in C2 + high volume in C3 (exhaustion then aggressive selling)
  if (vol2 < 0.8 && vol3 >= 1.4) {
    volumeScore = Math.min(1.0, volumeScore + 0.1); // add small bonus
  }

  // G) Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: firstBullScore, weight: 0.15 },
    { score: starScore, weight: 0.15 },
    { score: starAboveScore, weight: 0.1 },
    { score: thirdBearScore, weight: 0.2 },
    { score: breakdownScore, weight: 0.15 },
    { score: trendScore, weight: 0.1 },
    { score: volumeScore, weight: 0.08 },
    { score: srScore, weight: 0.07 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C3 (the third candle)
    pattern: "EVENING_STAR",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      upTrendStrengthPct,
      vol1,
      vol2,
      vol3,
      starAboveScore,
      breakdownPct,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Three White Soldiers Candle Pattern (Three-Candle Pattern)
 * Classification: Reversal / Strong Continuation, Direction: LONG
 * Three consecutive strong bullish candles with progressive structure
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectThreeWhiteSoldiers(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 3 candles (index >= 2)
  if (!candles || index < 2 || index >= candles.length) {
    return null;
  }

  // Get the three candles: C1 (n-2), C2 (n-1), C3 (n)
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;

  const upperWickRatio1 = parts1.upperShadowRatio;
  const upperWickRatio2 = parts2.upperShadowRatio;
  const upperWickRatio3 = parts3.upperShadowRatio;

  const lowerWickRatio1 = parts1.lowerShadowRatio;
  const lowerWickRatio2 = parts2.lowerShadowRatio;
  const lowerWickRatio3 = parts3.lowerShadowRatio;

  // Color checks
  const isBullishC1 = c1.close > c1.open;
  const isBullishC2 = c2.close > c2.open;
  const isBullishC3 = c3.close > c3.open;

  // Close to high percentage
  const epsilon = 0.0001;
  const range1 = Math.max(c1.high - c1.low, epsilon);
  const range2 = Math.max(c2.high - c2.low, epsilon);
  const range3 = Math.max(c3.high - c3.low, epsilon);

  const closeToHighPct1 = (c1.high - c1.close) / range1;
  const closeToHighPct2 = (c2.high - c2.close) / range2;
  const closeToHighPct3 = (c3.high - c3.close) / range3;

  // C1 and C2 midpoints
  const c1Mid = (c1.open + c1.close) / 2;
  const c2Mid = (c2.open + c2.close) / 2;

  // Progressive structure checks
  const open2AboveC1Mid = c2.open >= c1Mid;
  const open3AboveC2Mid = c3.open >= c2Mid;
  const closeSequence = c3.close > c2.close && c2.close > c1.close;

  // Calculate downTrendStrength (before C1, last 5-15 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 2, 10);

  // Volume calculation (focus on C3)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volume3 = calculateVolumeMultiple(c3, avgVolume20);

  // Distance to support (using C3 close)
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(c3.close - context.nearestSupport) / c3.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) All three candles must be bullish
  const allBullish = isBullishC1 && isBullishC2 && isBullishC3;

  // B) Each candle must close near high
  const closeNearHigh =
    closeToHighPct1 <= 0.25 && closeToHighPct2 <= 0.25 && closeToHighPct3 <= 0.25;

  // C) Body strength
  const bodyStrengthValid = bodyRatio1 >= 0.4 && bodyRatio2 >= 0.4 && bodyRatio3 >= 0.4;

  // D) Progressive structure
  const progressiveStructure = open2AboveC1Mid && open3AboveC2Mid && closeSequence;

  // E) Shadows must not be overly long
  const shadowsValid =
    upperWickRatio1 <= 0.35 &&
    upperWickRatio2 <= 0.35 &&
    upperWickRatio3 <= 0.35 &&
    lowerWickRatio1 <= 0.35 &&
    lowerWickRatio2 <= 0.35 &&
    lowerWickRatio3 <= 0.35;

  // If any structural condition fails, return invalid
  if (
    !allBullish ||
    !closeNearHigh ||
    !bodyStrengthValid ||
    !progressiveStructure ||
    !shadowsValid
  ) {
    return {
      index, // Return index of C3
      pattern: "THREE_WHITE_SOLDIERS",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        closeSeqStrong: closeSequence,
        volume3,
        downTrendStrengthPct,
        distanceToSupportPct: distanceToSupport,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality (average of all three)
  const avgBodyRatio = (bodyRatio1 + bodyRatio2 + bodyRatio3) / 3;
  let bodyStrength = 0.0;
  if (avgBodyRatio >= 0.3 && avgBodyRatio < 0.4) {
    bodyStrength = 0.25; // weak
  } else if (avgBodyRatio >= 0.4 && avgBodyRatio < 0.55) {
    bodyStrength = 0.5; // medium
  } else if (avgBodyRatio >= 0.55 && avgBodyRatio < 0.7) {
    bodyStrength = 0.75; // strong
  } else if (avgBodyRatio >= 0.7) {
    bodyStrength = 1.0; // very strong
  }

  // B) Higher-high sequence strength
  let strengthCloseSequence = 0.0;
  if (closeSequence) {
    strengthCloseSequence = 1.0; // perfect sequence
  } else if (c3.close > c2.close || c2.close > c1.close) {
    strengthCloseSequence = 0.5; // partially valid
  }

  // C) Gap control (ideal gaps)
  let idealGapScore = 0.5;
  if (c2.open >= c1.close && c3.open >= c2.close) {
    idealGapScore = 1.0; // ideal gaps
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring
  let volumeScore = 0.0;
  if (volume3 >= 0.8 && volume3 < 1.2) {
    volumeScore = 0.25; // weak
  } else if (volume3 >= 1.2 && volume3 < 1.8) {
    volumeScore = 0.5; // medium
  } else if (volume3 >= 1.8 && volume3 <= 2.5) {
    volumeScore = 0.75; // strong
  } else if (volume3 > 2.5) {
    volumeScore = 1.0; // very strong
  }

  // F) Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyStrength, weight: 0.25 },
    { score: strengthCloseSequence, weight: 0.2 },
    { score: idealGapScore, weight: 0.1 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore, weight: 0.15 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C3 (the third candle)
    pattern: "THREE_WHITE_SOLDIERS",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      closeSeqStrong: closeSequence,
      volume3,
      downTrendStrengthPct,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Three Black Crows Candle Pattern (Three-Candle Pattern)
 * Classification: Reversal / Strong Continuation, Direction: SHORT
 * Three consecutive strong bearish candles with progressive decline structure
 * Bearish mirror of Three White Soldiers
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectThreeBlackCrows(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 3 candles (index >= 2)
  if (!candles || index < 2 || index >= candles.length) {
    return null;
  }

  // Get the three candles: C1 (n-2), C2 (n-1), C3 (n)
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;

  const upperWickRatio1 = parts1.upperShadowRatio;
  const upperWickRatio2 = parts2.upperShadowRatio;
  const upperWickRatio3 = parts3.upperShadowRatio;

  const lowerWickRatio1 = parts1.lowerShadowRatio;
  const lowerWickRatio2 = parts2.lowerShadowRatio;
  const lowerWickRatio3 = parts3.lowerShadowRatio;

  // Color checks
  const isBearishC1 = c1.close < c1.open;
  const isBearishC2 = c2.close < c2.open;
  const isBearishC3 = c3.close < c3.open;

  // Close to low percentage
  const epsilon = 0.0001;
  const range1 = Math.max(c1.high - c1.low, epsilon);
  const range2 = Math.max(c2.high - c2.low, epsilon);
  const range3 = Math.max(c3.high - c3.low, epsilon);

  const closeToLowPct1 = (c1.close - c1.low) / range1;
  const closeToLowPct2 = (c2.close - c2.low) / range2;
  const closeToLowPct3 = (c3.close - c3.low) / range3;

  // C1 and C2 midpoints
  const c1Mid = (c1.open + c1.close) / 2;
  const c2Mid = (c2.open + c2.close) / 2;

  // Progressive decline structure checks
  const open2BelowC1Mid = c2.open <= c1Mid;
  const open3BelowC2Mid = c3.open <= c2Mid;
  const declineSequence = c3.close < c2.close && c2.close < c1.close;

  // Calculate upTrendStrength (before C1, last 5-15 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 2, 10);

  // Volume calculation (focus on C3)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volume3 = calculateVolumeMultiple(c3, avgVolume20);

  // Distance to resistance (using C3 close)
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - c3.close) / c3.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) All three candles must be bearish
  const allBearish = isBearishC1 && isBearishC2 && isBearishC3;

  // B) Each candle must close near low
  const closeNearLow = closeToLowPct1 <= 0.25 && closeToLowPct2 <= 0.25 && closeToLowPct3 <= 0.25;

  // C) Body strength
  const bodyStrengthValid = bodyRatio1 >= 0.4 && bodyRatio2 >= 0.4 && bodyRatio3 >= 0.4;

  // D) Progressive decline structure
  const progressiveStructure = open2BelowC1Mid && open3BelowC2Mid && declineSequence;

  // E) Shadows must not be overly long
  const shadowsValid =
    upperWickRatio1 <= 0.35 &&
    upperWickRatio2 <= 0.35 &&
    upperWickRatio3 <= 0.35 &&
    lowerWickRatio1 <= 0.35 &&
    lowerWickRatio2 <= 0.35 &&
    lowerWickRatio3 <= 0.35;

  // If any structural condition fails, return invalid
  if (
    !allBearish ||
    !closeNearLow ||
    !bodyStrengthValid ||
    !progressiveStructure ||
    !shadowsValid
  ) {
    return {
      index, // Return index of C3
      pattern: "THREE_BLACK_CROWS",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        declineSequenceStrong: declineSequence,
        upTrendStrengthPct,
        volume3,
        distanceToResistancePct: distanceToResistance,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality (average of all three)
  const avgBodyRatio = (bodyRatio1 + bodyRatio2 + bodyRatio3) / 3;
  let bodyStrength = 0.0;
  if (avgBodyRatio >= 0.3 && avgBodyRatio < 0.4) {
    bodyStrength = 0.25; // weak
  } else if (avgBodyRatio >= 0.4 && avgBodyRatio < 0.55) {
    bodyStrength = 0.5; // medium
  } else if (avgBodyRatio >= 0.55 && avgBodyRatio < 0.7) {
    bodyStrength = 0.75; // strong
  } else if (avgBodyRatio >= 0.7) {
    bodyStrength = 1.0; // very strong
  }

  // B) Decline sequence strength
  let declineSeqScore = 0.0;
  if (declineSequence) {
    declineSeqScore = 1.0; // perfect sequence
  } else if (c3.close < c2.close || c2.close < c1.close) {
    declineSeqScore = 0.5; // partially valid
  }

  // C) Gap control (ideal gaps down)
  let idealGapScore = 0.5;
  if (c2.open <= c1.close && c3.open <= c2.close) {
    idealGapScore = 1.0; // ideal gaps
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 2.0 && upTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 4.0 && upTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 7.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring
  let volumeScore = 0.0;
  if (volume3 >= 0.8 && volume3 < 1.2) {
    volumeScore = 0.25; // weak
  } else if (volume3 >= 1.2 && volume3 < 1.8) {
    volumeScore = 0.5; // medium
  } else if (volume3 >= 1.8 && volume3 <= 2.5) {
    volumeScore = 0.75; // strong
  } else if (volume3 > 2.5) {
    volumeScore = 1.0; // very strong
  }

  // F) Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyStrength, weight: 0.25 },
    { score: declineSeqScore, weight: 0.2 },
    { score: idealGapScore, weight: 0.1 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore, weight: 0.15 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C3 (the third candle)
    pattern: "THREE_BLACK_CROWS",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      declineSequenceStrong: declineSequence,
      upTrendStrengthPct,
      volume3,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Bullish Harami Candle Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * Two-candle pattern: strong bearish C1, small inside-body C2 (bullish or neutral)
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishHarami(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (index >= 1)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Get the two candles: C1 (n-1), C2 (n)
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBearishC1 = c1.close < c1.open;
  const isBullishC2 = c2.close > c2.open;
  const isDojiLikeC2 = Math.abs(c2.close - c2.open) / Math.max(c2.high - c2.low, 0.0001) <= 0.1;

  // Body boundaries
  const c1BodyHigh = Math.max(c1.open, c1.close);
  const c1BodyLow = Math.min(c1.open, c1.close);
  const c2BodyHigh = Math.max(c2.open, c2.close);
  const c2BodyLow = Math.min(c2.open, c2.close);

  // Harami logic: C2 body fully inside C1 body
  const haramiValid = c2BodyHigh < c1BodyHigh && c2BodyLow > c1BodyLow;

  // Insideness ratio
  const c1BodySize = c1BodyHigh - c1BodyLow;
  const c2BodySize = c2BodyHigh - c2BodyLow;
  const epsilon = 0.0001;
  const insidePct = c1BodySize > epsilon ? (c1BodySize - c2BodySize) / c1BodySize : 0;

  // Color score for C2
  let colorScoreC2 = 0.5;
  if (isBullishC2) {
    colorScoreC2 = 1.0; // bullish
  } else if (isDojiLikeC2) {
    colorScoreC2 = 0.6; // doji-like
  }

  // Calculate downTrendStrength (before C1, last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculation (focus on C2)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to support (using C2 close)
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(c2.close - context.nearestSupport) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 must be a strong bearish candle
  const c1Condition = isBearishC1 && bodyRatio1 >= 0.4;

  // B) C2 must have small body
  const c2Condition = bodyRatio2 <= 0.3;

  // C) Harami logic: C2 body fully inside C1 body
  const haramiCondition = haramiValid;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !haramiCondition) {
    return {
      index, // Return index of C2
      pattern: "BULLISH_HARAMI",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        downTrendStrengthPct,
        insidePct,
        volumeMultiple2,
        distanceToSupportPct: distanceToSupport,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Bear Strength of C1
  let bearStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    bearStrengthC1 = 0.25; // weak
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    bearStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bearStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bearStrengthC1 = 1.0; // very strong
  }

  // B) Insideness Ratio
  let insideScore = 0.0;
  if (insidePct >= 0.0 && insidePct < 0.2) {
    insideScore = 0.25; // weak
  } else if (insidePct >= 0.2 && insidePct < 0.5) {
    insideScore = 0.5; // medium
  } else if (insidePct >= 0.5 && insidePct < 0.8) {
    insideScore = 0.75; // strong
  } else if (insidePct >= 0.8) {
    insideScore = 1.0; // very strong
  }

  // C) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // D) Volume Context Scoring (for C2)
  let volumeScore = 0.0;
  if (volumeMultiple2 >= 0.5 && volumeMultiple2 < 0.8) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple2 >= 1.8) {
    volumeScore = 1.0; // very strong
  }

  // E) Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bearStrengthC1, weight: 0.25 },
    { score: insideScore, weight: 0.25 },
    { score: colorScoreC2, weight: 0.1 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C2 (the second candle)
    pattern: "BULLISH_HARAMI",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      downTrendStrengthPct,
      insidePct,
      volumeMultiple2,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Bearish Harami Candle Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Two-candle pattern: strong bullish C1, small inside-body C2 (bearish or neutral)
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBearishHarami(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (index >= 1)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Get the two candles: C1 (n-1), C2 (n)
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBullishC1 = c1.close > c1.open;
  const isBearishC2 = c2.close < c2.open;
  const isDojiLikeC2 = bodyRatio2 <= 0.1;

  // Body boundaries
  const c1BodyHigh = Math.max(c1.open, c1.close);
  const c1BodyLow = Math.min(c1.open, c1.close);
  const c2BodyHigh = Math.max(c2.open, c2.close);
  const c2BodyLow = Math.min(c2.open, c2.close);

  // Harami logic: C2 body fully inside C1 body
  const haramiValid = c2BodyHigh < c1BodyHigh && c2BodyLow > c1BodyLow;

  // Insideness ratio
  const c1BodySize = c1BodyHigh - c1BodyLow;
  const c2BodySize = c2BodyHigh - c2BodyLow;
  const epsilon = 0.0001;
  const insidePct = c1BodySize > epsilon ? (c1BodySize - c2BodySize) / c1BodySize : 0;

  // Color score for C2
  let colorScoreC2 = 0.5;
  if (isBearishC2) {
    colorScoreC2 = 1.0; // bearish
  } else if (isDojiLikeC2) {
    colorScoreC2 = 0.7; // doji-like
  }

  // Calculate upTrendStrength (before C1, last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 1, 8);

  // Volume calculation (focus on C2)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to resistance (using C2 close)
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - c2.close) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 must be a strong bullish candle
  const c1Condition = isBullishC1 && bodyRatio1 >= 0.4;

  // B) C2 must have small body
  const c2Condition = bodyRatio2 <= 0.3;

  // C) Harami logic: C2 body fully inside C1 body
  const haramiCondition = haramiValid;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !haramiCondition) {
    return {
      index, // Return index of C2
      pattern: "BEARISH_HARAMI",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        upTrendStrengthPct,
        insidePct,
        volumeMultiple2,
        distanceToResistancePct: distanceToResistance,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Bull Strength of C1
  let bullStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    bullStrengthC1 = 0.25; // weak
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    bullStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bullStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bullStrengthC1 = 1.0; // very strong
  }

  // B) Insideness Ratio
  let insidenessScore = 0.0;
  if (insidePct >= 0.0 && insidePct < 0.2) {
    insidenessScore = 0.25; // weak
  } else if (insidePct >= 0.2 && insidePct < 0.5) {
    insidenessScore = 0.5; // medium
  } else if (insidePct >= 0.5 && insidePct < 0.8) {
    insidenessScore = 0.75; // strong
  } else if (insidePct >= 0.8) {
    insidenessScore = 1.0; // very strong
  }

  // C) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // D) Volume Context Scoring (for C2)
  let volumeScore = 0.0;
  if (volumeMultiple2 >= 0.5 && volumeMultiple2 < 0.8) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple2 >= 1.8) {
    volumeScore = 1.0; // very strong
  }

  // E) Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bullStrengthC1, weight: 0.25 },
    { score: insidenessScore, weight: 0.25 },
    { score: colorScoreC2, weight: 0.1 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C2 (the second candle)
    pattern: "BEARISH_HARAMI",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      upTrendStrengthPct,
      insidePct,
      volumeMultiple2,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Piercing Line Candle Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * Two-candle bullish reversal: strong bearish C1, bullish C2 opens below C1 low and closes above C1 midpoint
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectPiercingLine(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (index >= 1)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Get the two candles: C1 (n-1), C2 (n)
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBearishC1 = c1.close < c1.open;
  const isBullishC2 = c2.close > c2.open;

  // C1 midpoint
  const c1Mid = (c1.open + c1.close) / 2;
  const c1BodySize = Math.abs(c1.open - c1.close);

  // Gap down check: C2 opens below C1 low
  const gapDown = c2.open < c1.low;

  // Penetration percentage: how much of C1 body did C2 recover
  const epsilon = 0.0001;
  const penetrationPct = c1BodySize > epsilon ? (c2.close - c1.close) / c1BodySize : 0;

  // Calculate downTrendStrength (before C1, last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculation (focus on C2)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to support (using C2 close)
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(c2.close - context.nearestSupport) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 must be a strong bearish candle
  const c1Condition = isBearishC1 && bodyRatio1 >= 0.4;

  // B) C2 must open below the low of C1 (gap down)
  const gapDownCondition = gapDown;

  // C) C2 closes at least above midpoint of C1 body
  const penetrationCondition = c2.close >= c1Mid;

  // D) C2 should be bullish
  const bullishCondition = isBullishC2;

  // E) C2 body must be respectable
  const bodyCondition = bodyRatio2 >= 0.35;

  // If any structural condition fails, return invalid
  if (
    !c1Condition ||
    !gapDownCondition ||
    !penetrationCondition ||
    !bullishCondition ||
    !bodyCondition
  ) {
    return {
      index, // Return index of C2
      pattern: "PIERCING_LINE",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        penetrationPct,
        volumeMultiple2,
        downTrendStrengthPct,
        distanceToSupportPct: distanceToSupport,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Bear Strength of C1
  let bearStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    bearStrengthC1 = 0.25; // weak
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    bearStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bearStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bearStrengthC1 = 1.0; // very strong
  }

  // B) C2 Penetration Strength
  let penetrationScore = 0.0;
  if (penetrationPct < 0.25) {
    penetrationScore = 0.0; // didn't reach midpoint (already filtered)
  } else if (penetrationPct >= 0.25 && penetrationPct < 0.5) {
    penetrationScore = 0.25; // weak
  } else if (penetrationPct >= 0.5 && penetrationPct < 0.75) {
    penetrationScore = 0.5; // medium
  } else if (penetrationPct >= 0.75) {
    penetrationScore = Math.min(1.0, 0.75 + (penetrationPct - 0.75) * 1.0); // strong to very strong, cap at 1.0
  }

  // C) C2 Body Size
  let c2BodyScore = 0.0;
  if (bodyRatio2 >= 0.35 && bodyRatio2 < 0.45) {
    c2BodyScore = 0.25; // weak
  } else if (bodyRatio2 >= 0.45 && bodyRatio2 < 0.6) {
    c2BodyScore = 0.5; // medium
  } else if (bodyRatio2 >= 0.6 && bodyRatio2 < 0.75) {
    c2BodyScore = 0.75; // strong
  } else if (bodyRatio2 >= 0.75) {
    c2BodyScore = 1.0; // very strong
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring (for C2)
  let volumeScore = 0.0;
  if (volumeMultiple2 >= 0.7 && volumeMultiple2 < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple2 >= 1.0 && volumeMultiple2 < 1.3) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple2 >= 1.3 && volumeMultiple2 < 1.8) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple2 >= 1.8) {
    volumeScore = 1.0; // very strong
  }

  // F) Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bearStrengthC1, weight: 0.2 },
    { score: penetrationScore, weight: 0.25 },
    { score: c2BodyScore, weight: 0.15 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.15 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C2 (the second candle)
    pattern: "PIERCING_LINE",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      penetrationPct,
      volumeMultiple2,
      downTrendStrengthPct,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Dark Cloud Cover Candle Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Two-candle bearish reversal: strong bullish C1, bearish C2 opens above C1 high and closes below C1 midpoint
 * Bearish equivalent of Piercing Line
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectDarkCloudCover(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (index >= 1)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Get the two candles: C1 (n-1), C2 (n)
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBullishC1 = c1.close > c1.open;
  const isBearishC2 = c2.close < c2.open;

  // C1 midpoint
  const c1Mid = (c1.open + c1.close) / 2;
  const c1BodySize = Math.abs(c1.open - c1.close);

  // Gap up check: C2 opens above C1 high
  const gapUp = c2.open > c1.high;

  // Penetration percentage down: how much of C1 body did C2 penetrate
  // Formula: (open_2 - close_2) / (close_1 - open_1)
  const epsilon = 0.0001;
  const c1BullishBody = c1.close - c1.open; // bullish body size
  const c2BearishBody = c2.open - c2.close; // bearish body size
  const penetrationPctDown = c1BullishBody > epsilon ? c2BearishBody / c1BullishBody : 0;

  // Calculate upTrendStrength (before C1, last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 1, 8);

  // Volume calculation (focus on C2)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to resistance (using C2 close)
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - c2.close) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 must be a strong bullish candle
  const c1Condition = isBullishC1 && bodyRatio1 >= 0.4;

  // B) C2 must open above the high of C1 (gap up)
  const gapUpCondition = gapUp;

  // C) C2 closes at least below midpoint of C1 body
  const penetrationCondition = c2.close <= c1Mid;

  // D) C2 must be bearish
  const bearishCondition = isBearishC2;

  // E) C2 body must be of decent size
  const bodyCondition = bodyRatio2 >= 0.35;

  // If any structural condition fails, return invalid
  if (
    !c1Condition ||
    !gapUpCondition ||
    !penetrationCondition ||
    !bearishCondition ||
    !bodyCondition
  ) {
    return {
      index, // Return index of C2
      pattern: "DARK_CLOUD_COVER",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        penetrationPctDown,
        volumeMultiple2,
        upTrendStrengthPct,
        distanceToResistancePct: distanceToResistance,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Bull Strength of C1
  let bullStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    bullStrengthC1 = 0.25; // weak
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    bullStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bullStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bullStrengthC1 = 1.0; // very strong
  }

  // B) C2 Penetration Strength Down
  let penetrationScore = 0.0;
  if (penetrationPctDown < 0.25) {
    penetrationScore = 0.0; // didn't penetrate much (already filtered)
  } else if (penetrationPctDown >= 0.25 && penetrationPctDown < 0.5) {
    penetrationScore = 0.25; // weak
  } else if (penetrationPctDown >= 0.5 && penetrationPctDown < 0.75) {
    penetrationScore = 0.5; // medium
  } else if (penetrationPctDown >= 0.75) {
    penetrationScore = Math.min(1.0, 0.75 + (penetrationPctDown - 0.75) * 1.0); // strong to very strong, cap at 1.0
  }

  // C) C2 Body Size
  let c2BodyScore = 0.0;
  if (bodyRatio2 >= 0.35 && bodyRatio2 < 0.45) {
    c2BodyScore = 0.25; // weak
  } else if (bodyRatio2 >= 0.45 && bodyRatio2 < 0.6) {
    c2BodyScore = 0.5; // medium
  } else if (bodyRatio2 >= 0.6 && bodyRatio2 < 0.75) {
    c2BodyScore = 0.75; // strong
  } else if (bodyRatio2 >= 0.75) {
    c2BodyScore = 1.0; // very strong
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring (for C2)
  let volumeScore = 0.0;
  if (volumeMultiple2 >= 0.7 && volumeMultiple2 < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple2 >= 1.0 && volumeMultiple2 < 1.3) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple2 >= 1.3 && volumeMultiple2 < 1.8) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple2 >= 1.8) {
    volumeScore = 1.0; // very strong
  }

  // F) Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bullStrengthC1, weight: 0.2 },
    { score: penetrationScore, weight: 0.25 },
    { score: c2BodyScore, weight: 0.15 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.15 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C2 (the second candle)
    pattern: "DARK_CLOUD_COVER",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      penetrationPctDown,
      volumeMultiple2,
      upTrendStrengthPct,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Bullish Harami Cross Candle Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * Two-candle pattern: strong bearish C1, doji-like inside candle C2
 * Stronger version of Bullish Harami where the second candle is a doji
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishHaramiCross(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (index >= 1)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Get the two candles: C1 (n-1), C2 (n)
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBearishC1 = c1.close < c1.open;

  // Body boundaries
  const c1BodyHigh = Math.max(c1.open, c1.close);
  const c1BodyLow = Math.min(c1.open, c1.close);
  const c2BodyHigh = Math.max(c2.open, c2.close);
  const c2BodyLow = Math.min(c2.open, c2.close);

  // Harami logic: C2 body fully inside C1 body
  const haramiValid = c2BodyHigh < c1BodyHigh && c2BodyLow > c1BodyLow;

  // Insideness ratio
  const c1BodySize = c1BodyHigh - c1BodyLow;
  const c2BodySize = c2BodyHigh - c2BodyLow;
  const epsilon = 0.0001;
  const insidePct = c1BodySize > epsilon ? (c1BodySize - c2BodySize) / c1BodySize : 0;

  // Calculate downTrendStrength (before C1, last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculation (focus on C2)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to support (using C2 close)
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(c2.close - context.nearestSupport) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 must be a strong bearish candle
  const c1Condition = isBearishC1 && bodyRatio1 >= 0.4;

  // B) C2 must be doji-like (small body)
  const c2Condition = bodyRatio2 <= 0.1;

  // C) Harami logic: C2 body fully inside C1 body
  const haramiCondition = haramiValid;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !haramiCondition) {
    return {
      index, // Return index of C2
      pattern: "BULLISH_HARAMI_CROSS",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        downTrendStrengthPct,
        insidePct,
        volumeMultiple2,
        distanceToSupportPct: distanceToSupport,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Bear Strength of C1
  let bearStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    bearStrengthC1 = 0.25; // weak
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    bearStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bearStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bearStrengthC1 = 1.0; // very strong
  }

  // B) Doji Quality for C2
  let dojiQualityC2 = 0.0;
  if (bodyRatio2 >= 0.07 && bodyRatio2 <= 0.1) {
    dojiQualityC2 = 0.25; // weak doji
  } else if (bodyRatio2 >= 0.04 && bodyRatio2 < 0.07) {
    dojiQualityC2 = 0.5; // medium
  } else if (bodyRatio2 >= 0.02 && bodyRatio2 < 0.04) {
    dojiQualityC2 = 0.75; // strong
  } else if (bodyRatio2 < 0.02) {
    dojiQualityC2 = 1.0; // very strong
  }

  // C) Insideness Score
  let insidenessScore = 0.0;
  if (insidePct >= 0.0 && insidePct < 0.2) {
    insidenessScore = 0.25; // weak
  } else if (insidePct >= 0.2 && insidePct < 0.5) {
    insidenessScore = 0.5; // medium
  } else if (insidePct >= 0.5 && insidePct < 0.8) {
    insidenessScore = 0.75; // strong
  } else if (insidePct >= 0.8) {
    insidenessScore = 1.0; // very strong
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring (for C2) - different logic for doji (low volume = exhaustion = good)
  let volumeScore = 0.0;
  if (volumeMultiple2 >= 0.5 && volumeMultiple2 < 0.8) {
    volumeScore = 0.75; // exhaustion-like (good for doji)
  } else if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore = 0.5; // neutral
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore = 0.5; // participation
  } else if (volumeMultiple2 >= 1.8) {
    volumeScore = 0.25; // anomaly (large volume on doji can be noisy)
  }

  // F) Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bearStrengthC1, weight: 0.25 },
    { score: dojiQualityC2, weight: 0.25 },
    { score: insidenessScore, weight: 0.2 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.05 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C2 (the second candle)
    pattern: "BULLISH_HARAMI_CROSS",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      downTrendStrengthPct,
      insidePct,
      volumeMultiple2,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Bearish Harami Cross Candle Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Two-candle pattern: strong bullish C1, doji-like inside candle C2
 * Bearish counterpart of Bullish Harami Cross
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBearishHaramiCross(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (index >= 1)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Get the two candles: C1 (n-1), C2 (n)
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBullishC1 = c1.close > c1.open;

  // Body boundaries
  const c1BodyHigh = Math.max(c1.open, c1.close);
  const c1BodyLow = Math.min(c1.open, c1.close);
  const c2BodyHigh = Math.max(c2.open, c2.close);
  const c2BodyLow = Math.min(c2.open, c2.close);

  // Harami logic: C2 body fully inside C1 body
  const haramiValid = c2BodyHigh < c1BodyHigh && c2BodyLow > c1BodyLow;

  // Insideness ratio
  const c1BodySize = c1BodyHigh - c1BodyLow;
  const c2BodySize = c2BodyHigh - c2BodyLow;
  const epsilon = 0.0001;
  const insidePct = c1BodySize > epsilon ? (c1BodySize - c2BodySize) / c1BodySize : 0;

  // Calculate upTrendStrength (before C1, last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 1, 8);

  // Volume calculation (focus on C2)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to resistance (using C2 close)
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - c2.close) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 must be a strong bullish candle
  const c1Condition = isBullishC1 && bodyRatio1 >= 0.4;

  // B) C2 must be doji-like (small body)
  const c2Condition = bodyRatio2 <= 0.1;

  // C) Harami logic: C2 body fully inside C1 body
  const haramiCondition = haramiValid;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !haramiCondition) {
    return {
      index, // Return index of C2
      pattern: "BEARISH_HARAMI_CROSS",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        upTrendStrengthPct,
        insidePct,
        volumeMultiple2,
        distanceToResistancePct: distanceToResistance,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Bull Strength of C1
  let bullStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    bullStrengthC1 = 0.25; // weak
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    bullStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bullStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bullStrengthC1 = 1.0; // very strong
  }

  // B) Doji Quality for C2
  let dojiQualityC2 = 0.0;
  if (bodyRatio2 >= 0.07 && bodyRatio2 <= 0.1) {
    dojiQualityC2 = 0.25; // weak doji
  } else if (bodyRatio2 >= 0.04 && bodyRatio2 < 0.07) {
    dojiQualityC2 = 0.5; // medium
  } else if (bodyRatio2 >= 0.02 && bodyRatio2 < 0.04) {
    dojiQualityC2 = 0.75; // strong
  } else if (bodyRatio2 < 0.02) {
    dojiQualityC2 = 1.0; // very strong
  }

  // C) Insideness Score
  let insidenessScore = 0.0;
  if (insidePct >= 0.0 && insidePct < 0.2) {
    insidenessScore = 0.25; // weak
  } else if (insidePct >= 0.2 && insidePct < 0.5) {
    insidenessScore = 0.5; // medium
  } else if (insidePct >= 0.5 && insidePct < 0.8) {
    insidenessScore = 0.75; // strong
  } else if (insidePct >= 0.8) {
    insidenessScore = 1.0; // very strong
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring (for C2) - different logic for doji (low volume = exhaustion = good)
  let volumeScore = 0.0;
  if (volumeMultiple2 >= 0.5 && volumeMultiple2 < 0.8) {
    volumeScore = 0.75; // exhaustion-like (good for doji)
  } else if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore = 0.5; // neutral
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore = 0.5; // participation
  } else if (volumeMultiple2 >= 1.8) {
    volumeScore = 0.25; // anomaly (large volume on doji can be noisy)
  }

  // F) Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bullStrengthC1, weight: 0.25 },
    { score: dojiQualityC2, weight: 0.25 },
    { score: insidenessScore, weight: 0.2 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.05 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C2 (the second candle)
    pattern: "BEARISH_HARAMI_CROSS",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      upTrendStrengthPct,
      insidePct,
      volumeMultiple2,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Tweezers Top Candle Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Two-candle pattern: double high rejection on two consecutive candles
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectTweezersTop(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (index >= 1)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Get the two candles: C1 (n-1), C2 (n)
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // High difference percentage
  const maxHigh = Math.max(c1.high, c2.high);
  const epsilon = 0.0001;
  const highDiffPct = maxHigh > epsilon ? (Math.abs(c2.high - c1.high) / maxHigh) * 100 : 100.0;

  // C2 rejection percentage
  const range2 = Math.max(c2.high - c2.low, epsilon);
  const rejectionPct2 = (c2.high - c2.close) / range2;

  // Color checks
  const isBearishC2 = c2.close < c2.open;
  const isBearish2 = isBearishC2 ? 1 : 0;

  // Calculate upTrendStrength (before C1, last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 1, 8);

  // Volume calculation (focus on C2)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to resistance (using the shared high or C2 close)
  const sharedHigh = Math.max(c1.high, c2.high);
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - sharedHigh) / sharedHigh) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) Highs approximately equal (tolerance: 0.15% of price)
  const highEqualityCondition = highDiffPct <= 0.15;

  // If high equality condition fails, return invalid
  if (!highEqualityCondition) {
    return {
      index, // Return index of C2
      pattern: "TWEEZERS_TOP",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        highDiffPct,
        rejectionPct2,
        bodyRatio2,
        upTrendStrengthPct,
        volumeMultiple2,
        distanceToResistancePct: distanceToResistance,
        isBearish2,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) High Equality Score
  let highEqualityScore = 0.0;
  if (highDiffPct > 0.3) {
    highEqualityScore = 0.0; // invalid (already filtered)
  } else if (highDiffPct >= 0.2 && highDiffPct <= 0.3) {
    highEqualityScore = 0.25; // weak
  } else if (highDiffPct >= 0.1 && highDiffPct < 0.2) {
    highEqualityScore = 0.5; // medium
  } else if (highDiffPct >= 0.05 && highDiffPct < 0.1) {
    highEqualityScore = 0.75; // strong
  } else if (highDiffPct < 0.05) {
    highEqualityScore = 1.0; // very strong
  }

  // B) C2 Rejection Quality
  let rejectionScoreC2 = 0.0;
  if (rejectionPct2 < 0.2) {
    rejectionScoreC2 = 0.25; // weak
  } else if (rejectionPct2 >= 0.2 && rejectionPct2 < 0.4) {
    rejectionScoreC2 = 0.5; // medium
  } else if (rejectionPct2 >= 0.4 && rejectionPct2 < 0.6) {
    rejectionScoreC2 = 0.75; // strong
  } else if (rejectionPct2 >= 0.6) {
    rejectionScoreC2 = 1.0; // very strong
  }

  // C) C2 Body Direction & Size
  const colorScore = isBearishC2 ? 1.0 : 0.6;

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring (for C2)
  let volumeScore = 0.0;
  if (volumeMultiple2 >= 0.7 && volumeMultiple2 < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple2 >= 1.0 && volumeMultiple2 < 1.4) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple2 >= 1.4 && volumeMultiple2 < 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple2 >= 2.0) {
    volumeScore = 1.0; // very strong
  }

  // F) Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: highEqualityScore, weight: 0.3 },
    { score: rejectionScoreC2, weight: 0.25 },
    { score: colorScore, weight: 0.05 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C2 (the second candle)
    pattern: "TWEEZERS_TOP",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      highDiffPct,
      rejectionPct2,
      bodyRatio2,
      upTrendStrengthPct,
      volumeMultiple2,
      distanceToResistancePct: distanceToResistance,
      isBearish2,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Tweezers Bottom Candle Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * Two-candle pattern: double low rejection on two consecutive candles
 * Mirror of Tweezers Top on lows
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectTweezersBottom(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (index >= 1)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Get the two candles: C1 (n-1), C2 (n)
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Low difference percentage (using min for normalization)
  const minLow = Math.min(c1.low, c2.low);
  const epsilon = 0.0001;
  const lowDiffPct = minLow > epsilon ? (Math.abs(c2.low - c1.low) / minLow) * 100 : 100.0;

  // C2 rejection percentage (from low)
  const range2 = Math.max(c2.high - c2.low, epsilon);
  const rejectionPct2 = (c2.close - c2.low) / range2;

  // Color checks
  const isBullishC2 = c2.close > c2.open;
  const isBullish2 = isBullishC2 ? 1 : 0;

  // Calculate downTrendStrength (before C1, last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculation (focus on C2)
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to support (using the shared low or C2 close)
  const sharedLow = Math.min(c1.low, c2.low);
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(c2.close - context.nearestSupport) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) Lows approximately equal (tolerance: 0.30% of price)
  const lowEqualityCondition = lowDiffPct <= 0.3;

  // If low equality condition fails, return invalid
  if (!lowEqualityCondition) {
    return {
      index, // Return index of C2
      pattern: "TWEEZERS_BOTTOM",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        lowDiffPct,
        rejectionPct2,
        bodyRatio2,
        downTrendStrengthPct,
        volumeMultiple2,
        distanceToSupportPct: distanceToSupport,
        isBullish2,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Low Equality Score
  let lowEqualityScore = 0.0;
  if (lowDiffPct > 0.3) {
    lowEqualityScore = 0.0; // invalid (already filtered)
  } else if (lowDiffPct >= 0.2 && lowDiffPct <= 0.3) {
    lowEqualityScore = 0.25; // weak
  } else if (lowDiffPct >= 0.1 && lowDiffPct < 0.2) {
    lowEqualityScore = 0.5; // medium
  } else if (lowDiffPct >= 0.05 && lowDiffPct < 0.1) {
    lowEqualityScore = 0.75; // strong
  } else if (lowDiffPct < 0.05) {
    lowEqualityScore = 1.0; // very strong
  }

  // B) C2 Rejection Quality (from low)
  let rejectionScoreC2 = 0.0;
  if (rejectionPct2 < 0.2) {
    rejectionScoreC2 = 0.25; // weak
  } else if (rejectionPct2 >= 0.2 && rejectionPct2 < 0.4) {
    rejectionScoreC2 = 0.5; // medium
  } else if (rejectionPct2 >= 0.4 && rejectionPct2 < 0.6) {
    rejectionScoreC2 = 0.75; // strong
  } else if (rejectionPct2 >= 0.6) {
    rejectionScoreC2 = 1.0; // very strong
  }

  // C) C2 Body Direction
  const colorScore = isBullishC2 ? 1.0 : 0.6;

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring (for C2)
  let volumeScore = 0.0;
  if (volumeMultiple2 >= 0.7 && volumeMultiple2 < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple2 >= 1.0 && volumeMultiple2 < 1.4) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple2 >= 1.4 && volumeMultiple2 < 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple2 >= 2.0) {
    volumeScore = 1.0; // very strong
  }

  // F) Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: lowEqualityScore, weight: 0.3 },
    { score: rejectionScoreC2, weight: 0.25 },
    { score: colorScore, weight: 0.05 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C2 (the second candle)
    pattern: "TWEEZERS_BOTTOM",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      lowDiffPct,
      rejectionPct2,
      bodyRatio2,
      downTrendStrengthPct,
      volumeMultiple2,
      distanceToSupportPct: distanceToSupport,
      isBullish2,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Rising Three Methods Candle Pattern (5-Candle Pattern)
 * Classification: Continuation, Direction: LONG
 * Multi-candle bullish continuation pattern: strong bullish C1, small pullback C2-C4, strong bullish breakout C5
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectRisingThreeMethods(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 5 candles (index >= 4)
  if (!candles || index < 4 || index >= candles.length) {
    return null;
  }

  // Get the five candles: C1 (n-4), C2 (n-3), C3 (n-2), C4 (n-1), C5 (n)
  const c1 = candles[index - 4];
  const c2 = candles[index - 3];
  const c3 = candles[index - 2];
  const c4 = candles[index - 1];
  const c5 = candles[index];

  // Validate candles
  if (
    c1.high === c1.low ||
    c2.high === c2.low ||
    c3.high === c3.low ||
    c4.high === c4.low ||
    c5.high === c5.low
  ) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);
  const parts4 = getCandleParts(c4);
  const parts5 = getCandleParts(c5);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;
  const bodyRatio4 = parts4.bodyRatio;
  const bodyRatio5 = parts5.bodyRatio;

  // Color checks
  const isBullishC1 = c1.close > c1.open;
  const isBullishC5 = c5.close > c5.open;

  // C1 range
  const c1Range = c1.high - c1.low;
  const tolerance = c1Range * 0.05; // 5% tolerance
  const smallTolerance = c1Range * 0.1; // 10% tolerance for low

  // Pullback cluster metrics
  const maxHighPullback = Math.max(c2.high, c3.high, c4.high);
  const minLowPullback = Math.min(c2.low, c3.low, c4.low);
  const pullbackRange = maxHighPullback - minLowPullback;
  const pullbackRangePct = c1Range > 0 ? pullbackRange / c1Range : 1.0;

  // Pullback depth
  const pullbackLowMin = minLowPullback;
  const c1CloseToLow = c1.close - c1.low;
  const epsilon = 0.0001;
  const pullbackDepthPct =
    c1CloseToLow > epsilon ? (c1.close - pullbackLowMin) / c1CloseToLow : 1.0;

  // Calculate upTrendStrength (before C1, last 5-10 candles)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 4, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple5 = calculateVolumeMultiple(c5, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 strong bullish
  const c1Condition = isBullishC1 && bodyRatio1 >= 0.45;

  // B) C2-C4: small-bodied pullback candles
  const c2Condition = bodyRatio2 <= 0.35;
  const c3Condition = bodyRatio3 <= 0.35;
  const c4Condition = bodyRatio4 <= 0.35;

  // C2-C4 within C1 range or slightly overlapping
  const c2InRange = c2.high <= c1.high + tolerance && c2.low >= c1.low - smallTolerance;
  const c3InRange = c3.high <= c1.high + tolerance && c3.low >= c1.low - smallTolerance;
  const c4InRange = c4.high <= c1.high + tolerance && c4.low >= c1.low - smallTolerance;

  // C) C5 strong bullish continuation
  const c5Condition = isBullishC5 && bodyRatio5 >= 0.45 && c5.close > c1.close;

  // If any structural condition fails, return invalid
  if (
    !c1Condition ||
    !c2Condition ||
    !c3Condition ||
    !c4Condition ||
    !c5Condition ||
    !c2InRange ||
    !c3InRange ||
    !c4InRange
  ) {
    return {
      index, // Return index of C5
      pattern: "RISING_THREE_METHODS",
      category: "CONTINUATION",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio5,
        pullbackRangePct,
        pullbackDepthPct,
        upTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple5,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 & C5 Body Strength Combined
  const avgBigBody = (bodyRatio1 + bodyRatio5) / 2;
  let bigBodyStrength = 0.0;
  if (avgBigBody >= 0.35 && avgBigBody < 0.45) {
    bigBodyStrength = 0.25; // weak
  } else if (avgBigBody >= 0.45 && avgBigBody < 0.6) {
    bigBodyStrength = 0.5; // medium
  } else if (avgBigBody >= 0.6 && avgBigBody < 0.75) {
    bigBodyStrength = 0.75; // strong
  } else if (avgBigBody >= 0.75) {
    bigBodyStrength = 1.0; // very strong
  }

  // B) Pullback Cluster Tightness
  let pullbackTightness = 0.0;
  if (pullbackRangePct > 1.0) {
    pullbackTightness = 0.0; // invalid (too big, breaks structure)
  } else if (pullbackRangePct >= 0.75 && pullbackRangePct <= 1.0) {
    pullbackTightness = 0.25; // weak
  } else if (pullbackRangePct >= 0.5 && pullbackRangePct < 0.75) {
    pullbackTightness = 0.5; // medium
  } else if (pullbackRangePct >= 0.25 && pullbackRangePct < 0.5) {
    pullbackTightness = 0.75; // strong
  } else if (pullbackRangePct < 0.25) {
    pullbackTightness = 1.0; // very strong
  }

  // C) Pullback Depth Score
  let pullbackDepthScore = 0.0;
  if (pullbackDepthPct > 1.0) {
    pullbackDepthScore = 0.0; // invalid (broke C1 low)
  } else if (pullbackDepthPct >= 0.75 && pullbackDepthPct <= 1.0) {
    pullbackDepthScore = 0.25; // weak
  } else if (pullbackDepthPct >= 0.5 && pullbackDepthPct < 0.75) {
    pullbackDepthScore = 0.5; // medium
  } else if (pullbackDepthPct >= 0.25 && pullbackDepthPct < 0.5) {
    pullbackDepthScore = 0.75; // strong
  } else if (pullbackDepthPct < 0.25) {
    pullbackDepthScore = 1.0; // very strong
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring (for C5)
  let volumeScoreC5 = 0.0;
  if (volumeMultiple5 >= 0.8 && volumeMultiple5 < 1.2) {
    volumeScoreC5 = 0.25; // weak
  } else if (volumeMultiple5 >= 1.2 && volumeMultiple5 < 1.8) {
    volumeScoreC5 = 0.5; // medium
  } else if (volumeMultiple5 >= 1.8 && volumeMultiple5 < 2.5) {
    volumeScoreC5 = 0.75; // strong
  } else if (volumeMultiple5 >= 2.5) {
    volumeScoreC5 = 1.0; // very strong
  }

  // F) Volume Context Scoring (for C1)
  let volumeScoreC1 = 0.0;
  if (volumeMultiple1 >= 0.8 && volumeMultiple1 < 1.2) {
    volumeScoreC1 = 0.25; // weak
  } else if (volumeMultiple1 >= 1.2 && volumeMultiple1 < 1.8) {
    volumeScoreC1 = 0.5; // medium
  } else if (volumeMultiple1 >= 1.8 && volumeMultiple1 < 2.5) {
    volumeScoreC1 = 0.75; // strong
  } else if (volumeMultiple1 >= 2.5) {
    volumeScoreC1 = 1.0; // very strong
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bigBodyStrength, weight: 0.25 },
    { score: pullbackTightness, weight: 0.2 },
    { score: pullbackDepthScore, weight: 0.15 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScoreC5, weight: 0.15 },
    { score: volumeScoreC1, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C5 (the fifth candle)
    pattern: "RISING_THREE_METHODS",
    category: "CONTINUATION",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio5,
      pullbackRangePct,
      pullbackDepthPct,
      upTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple5,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Falling Three Methods Candle Pattern (5-Candle Pattern)
 * Classification: Continuation, Direction: SHORT
 * Multi-candle bearish continuation pattern: strong bearish C1, small pullback C2-C4, strong bearish continuation C5
 * Bearish continuation mirror of Rising Three Methods
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectFallingThreeMethods(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 5 candles (index >= 4)
  if (!candles || index < 4 || index >= candles.length) {
    return null;
  }

  // Get the five candles: C1 (n-4), C2 (n-3), C3 (n-2), C4 (n-1), C5 (n)
  const c1 = candles[index - 4];
  const c2 = candles[index - 3];
  const c3 = candles[index - 2];
  const c4 = candles[index - 1];
  const c5 = candles[index];

  // Validate candles
  if (
    c1.high === c1.low ||
    c2.high === c2.low ||
    c3.high === c3.low ||
    c4.high === c4.low ||
    c5.high === c5.low
  ) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);
  const parts4 = getCandleParts(c4);
  const parts5 = getCandleParts(c5);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;
  const bodyRatio4 = parts4.bodyRatio;
  const bodyRatio5 = parts5.bodyRatio;

  // Color checks
  const isBearishC1 = c1.close < c1.open;
  const isBearishC5 = c5.close < c5.open;

  // C1 range
  const c1Range = c1.high - c1.low;
  const tolerance = c1Range * 0.05; // 5% tolerance
  const smallTolerance = c1Range * 0.1; // 10% tolerance for high

  // Pullback cluster metrics
  const maxHighPullback = Math.max(c2.high, c3.high, c4.high);
  const minLowPullback = Math.min(c2.low, c3.low, c4.low);
  const pullbackRange = maxHighPullback - minLowPullback;
  const pullbackRangePct = c1Range > 0 ? pullbackRange / c1Range : 1.0;

  // Pullback height (upward from C1 close)
  const pullbackHighMax = maxHighPullback;
  const c1HighToClose = c1.high - c1.close;
  const epsilon = 0.0001;
  const pullbackHeightPct =
    c1HighToClose > epsilon ? (pullbackHighMax - c1.close) / c1HighToClose : 1.0;

  // Calculate downTrendStrength (before C1, last 5-10 candles)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 4, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple5 = calculateVolumeMultiple(c5, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 strong bearish
  const c1Condition = isBearishC1 && bodyRatio1 >= 0.45;

  // B) C2-C4: small-bodied pullback candles
  const c2Condition = bodyRatio2 <= 0.35;
  const c3Condition = bodyRatio3 <= 0.35;
  const c4Condition = bodyRatio4 <= 0.35;

  // C2-C4 within C1 range or slightly overlapping (but not above high_1 by more than tolerance)
  const c2InRange = c2.high <= c1.high + tolerance && c2.low >= c1.low - smallTolerance;
  const c3InRange = c3.high <= c1.high + tolerance && c3.low >= c1.low - smallTolerance;
  const c4InRange = c4.high <= c1.high + tolerance && c4.low >= c1.low - smallTolerance;

  // C) C5 strong bearish continuation
  const c5Condition = isBearishC5 && bodyRatio5 >= 0.45 && c5.close < c1.close;

  // If any structural condition fails, return invalid
  if (
    !c1Condition ||
    !c2Condition ||
    !c3Condition ||
    !c4Condition ||
    !c5Condition ||
    !c2InRange ||
    !c3InRange ||
    !c4InRange
  ) {
    return {
      index, // Return index of C5
      pattern: "FALLING_THREE_METHODS",
      category: "CONTINUATION",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio5,
        pullbackRangePct,
        pullbackHeightPct,
        downTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple5,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 & C5 Body Strength Combined
  const avgBigBody = (bodyRatio1 + bodyRatio5) / 2;
  let bigBodyStrength = 0.0;
  if (avgBigBody >= 0.35 && avgBigBody < 0.45) {
    bigBodyStrength = 0.25; // weak
  } else if (avgBigBody >= 0.45 && avgBigBody < 0.6) {
    bigBodyStrength = 0.5; // medium
  } else if (avgBigBody >= 0.6 && avgBigBody < 0.75) {
    bigBodyStrength = 0.75; // strong
  } else if (avgBigBody >= 0.75) {
    bigBodyStrength = 1.0; // very strong
  }

  // B) Pullback Cluster Tightness
  let pullbackTightness = 0.0;
  if (pullbackRangePct > 1.0) {
    pullbackTightness = 0.0; // invalid (too big, breaks structure)
  } else if (pullbackRangePct >= 0.75 && pullbackRangePct <= 1.0) {
    pullbackTightness = 0.25; // weak
  } else if (pullbackRangePct >= 0.5 && pullbackRangePct < 0.75) {
    pullbackTightness = 0.5; // medium
  } else if (pullbackRangePct >= 0.25 && pullbackRangePct < 0.5) {
    pullbackTightness = 0.75; // strong
  } else if (pullbackRangePct < 0.25) {
    pullbackTightness = 1.0; // very strong
  }

  // C) Pullback Height Score (upward from C1 close)
  let pullbackHeightScore = 0.0;
  if (pullbackHeightPct > 1.0) {
    pullbackHeightScore = 0.0; // invalid (reversal, not continuation)
  } else if (pullbackHeightPct >= 0.75 && pullbackHeightPct <= 1.0) {
    pullbackHeightScore = 0.25; // weak
  } else if (pullbackHeightPct >= 0.5 && pullbackHeightPct < 0.75) {
    pullbackHeightScore = 0.5; // medium
  } else if (pullbackHeightPct >= 0.25 && pullbackHeightPct < 0.5) {
    pullbackHeightScore = 0.75; // strong
  } else if (pullbackHeightPct < 0.25) {
    pullbackHeightScore = 1.0; // very strong
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring (for C5)
  let volumeScoreC5 = 0.0;
  if (volumeMultiple5 >= 0.8 && volumeMultiple5 < 1.2) {
    volumeScoreC5 = 0.25; // weak
  } else if (volumeMultiple5 >= 1.2 && volumeMultiple5 < 1.8) {
    volumeScoreC5 = 0.5; // medium
  } else if (volumeMultiple5 >= 1.8 && volumeMultiple5 < 2.5) {
    volumeScoreC5 = 0.75; // strong
  } else if (volumeMultiple5 >= 2.5) {
    volumeScoreC5 = 1.0; // very strong
  }

  // F) Volume Context Scoring (for C1)
  let volumeScoreC1 = 0.0;
  if (volumeMultiple1 >= 0.8 && volumeMultiple1 < 1.2) {
    volumeScoreC1 = 0.25; // weak
  } else if (volumeMultiple1 >= 1.2 && volumeMultiple1 < 1.8) {
    volumeScoreC1 = 0.5; // medium
  } else if (volumeMultiple1 >= 1.8 && volumeMultiple1 < 2.5) {
    volumeScoreC1 = 0.75; // strong
  } else if (volumeMultiple1 >= 2.5) {
    volumeScoreC1 = 1.0; // very strong
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bigBodyStrength, weight: 0.25 },
    { score: pullbackTightness, weight: 0.2 },
    { score: pullbackHeightScore, weight: 0.15 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScoreC5, weight: 0.15 },
    { score: volumeScoreC1, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index, // Index of C5 (the fifth candle)
    pattern: "FALLING_THREE_METHODS",
    category: "CONTINUATION",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio5,
      pullbackRangePct,
      pullbackHeightPct,
      downTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple5,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Bullish Marubozu Candle Pattern (Single-Candle Pattern)
 * Classification: Momentum / Continuation / Reversal, Direction: LONG
 * Classic "full body" bullish candle with almost no wicks - shows absolute buyer control
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishMarubozu(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 1 candle
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];

  // Validate candle
  if (candle.high === candle.low) {
    return null; // invalid candle
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);

  const bodyRatio = parts.bodyRatio;
  const upperWickRatio = parts.upperShadowRatio;
  const lowerWickRatio = parts.lowerShadowRatio;

  // Combined wick ratio
  const combinedWick = upperWickRatio + lowerWickRatio;

  // Color check
  const isBullish = candle.close > candle.open;

  // Calculate upTrendStrength (last 5-10 candles before this one)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index, 8);

  // Volume calculation
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Distance to nearest S/R (using the existing function)
  const distanceToNearestSRpct =
    calculateDistanceToSR(candle, context.nearestSupport, context.nearestResistance) * 100; // Convert to percentage

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) Bullish close
  const bullishCondition = isBullish;

  // B) Dominant body
  const bodyCondition = bodyRatio >= 0.8;

  // C) Very small shadows
  const combinedWickCondition = combinedWick <= 0.3;

  // If any structural condition fails, return invalid
  if (!bullishCondition || !bodyCondition || !combinedWickCondition) {
    return {
      index,
      pattern: "BULLISH_MARUBOZU",
      category: "MOMENTUM",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        volumeMultiple,
        upTrendStrengthPct,
        distanceToNearestSRpct,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToNearestSRpct,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio < 0.7) {
    bodyScore = 0.0; // invalid as Marubozu-like (already filtered)
  } else if (bodyRatio >= 0.7 && bodyRatio < 0.8) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.8 && bodyRatio < 0.9) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.9 && bodyRatio < 0.97) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio >= 0.97) {
    bodyScore = 1.0; // very strong
  }

  // B) Wick Score (combined)
  let wickScore = 0.0;
  if (combinedWick > 0.3) {
    wickScore = 0.0; // invalid (already filtered)
  } else if (combinedWick >= 0.2 && combinedWick <= 0.3) {
    wickScore = 0.25; // weak
  } else if (combinedWick >= 0.1 && combinedWick < 0.2) {
    wickScore = 0.5; // medium
  } else if (combinedWick >= 0.05 && combinedWick < 0.1) {
    wickScore = 0.75; // strong
  } else if (combinedWick < 0.05) {
    wickScore = 1.0; // very strong
  }

  // C) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 0 && upTrendStrengthPct < 2.0) {
    trendScore = 0.25; // flat/weak trend
  } else if (upTrendStrengthPct >= 2.0 && upTrendStrengthPct < 5.0) {
    trendScore = 0.5; // moderate trend
  } else if (upTrendStrengthPct >= 5.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 5.0) / 10.0); // strong trend, cap at 1.0
  }

  // D) Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.4) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.4 && volumeMultiple < 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple >= 2.0) {
    volumeScore = 1.0; // very strong
  }

  // E) S/R Proximity Scoring
  let srScore = 0.0;
  if (distanceToNearestSRpct > 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToNearestSRpct >= 0.5 && distanceToNearestSRpct <= 1.0) {
    srScore = 0.5; // medium
  } else if (distanceToNearestSRpct >= 0.25 && distanceToNearestSRpct < 0.5) {
    srScore = 0.75; // strong
  } else if (distanceToNearestSRpct < 0.25) {
    srScore = 1.0; // very strong
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyScore, weight: 0.35 },
    { score: wickScore, weight: 0.2 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.15 },
    { score: srScore, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BULLISH_MARUBOZU",
    category: "MOMENTUM",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      volumeMultiple,
      upTrendStrengthPct,
      distanceToNearestSRpct,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToNearestSRpct,
    },
  };
}

/**
 * Detect Bearish Marubozu Candle Pattern (Single-Candle Pattern)
 * Classification: Momentum / Continuation / Reversal, Direction: SHORT
 * Classic "full body" bearish candle with almost no wicks - shows absolute seller control
 * Mirror of Bullish Marubozu
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBearishMarubozu(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 1 candle
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];

  // Validate candle
  if (candle.high === candle.low) {
    return null; // invalid candle
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);

  const bodyRatio = parts.bodyRatio;
  const upperWickRatio = parts.upperShadowRatio;
  const lowerWickRatio = parts.lowerShadowRatio;

  // Combined wick ratio
  const combinedWick = upperWickRatio + lowerWickRatio;

  // Color check
  const isBearish = candle.close < candle.open;

  // Calculate downTrendStrength (last 5-10 candles before this one)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index, 8);

  // Volume calculation
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Distance to nearest S/R (using the existing function)
  const distanceToNearestSRpct =
    calculateDistanceToSR(candle, context.nearestSupport, context.nearestResistance) * 100; // Convert to percentage

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) Bearish close
  const bearishCondition = isBearish;

  // B) Dominant body
  const bodyCondition = bodyRatio >= 0.8;

  // C) Very small shadows
  const combinedWickCondition = combinedWick <= 0.3;

  // If any structural condition fails, return invalid
  if (!bearishCondition || !bodyCondition || !combinedWickCondition) {
    return {
      index,
      pattern: "BEARISH_MARUBOZU",
      category: "MOMENTUM",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        volumeMultiple,
        downTrendStrengthPct,
        distanceToNearestSRpct,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToNearestSRpct,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio < 0.7) {
    bodyScore = 0.0; // invalid as Marubozu-like (already filtered)
  } else if (bodyRatio >= 0.7 && bodyRatio < 0.8) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.8 && bodyRatio < 0.9) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.9 && bodyRatio < 0.97) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio >= 0.97) {
    bodyScore = 1.0; // very strong
  }

  // B) Wick Score (combined)
  let wickScore = 0.0;
  if (combinedWick > 0.3) {
    wickScore = 0.0; // invalid (already filtered)
  } else if (combinedWick >= 0.2 && combinedWick <= 0.3) {
    wickScore = 0.25; // weak
  } else if (combinedWick >= 0.1 && combinedWick < 0.2) {
    wickScore = 0.5; // medium
  } else if (combinedWick >= 0.05 && combinedWick < 0.1) {
    wickScore = 0.75; // strong
  } else if (combinedWick < 0.05) {
    wickScore = 1.0; // very strong
  }

  // C) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 0 && downTrendStrengthPct < 2.0) {
    trendScore = 0.25; // flat/weak trend
  } else if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 5.0) {
    trendScore = 0.5; // moderate trend
  } else if (downTrendStrengthPct >= 5.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 5.0) / 10.0); // strong trend, cap at 1.0
  }

  // D) Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.4) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.4 && volumeMultiple < 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple >= 2.0) {
    volumeScore = 1.0; // very strong
  }

  // E) S/R Proximity Scoring
  let srScore = 0.0;
  if (distanceToNearestSRpct > 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToNearestSRpct >= 0.5 && distanceToNearestSRpct <= 1.0) {
    srScore = 0.5; // medium
  } else if (distanceToNearestSRpct >= 0.25 && distanceToNearestSRpct < 0.5) {
    srScore = 0.75; // strong
  } else if (distanceToNearestSRpct < 0.25) {
    srScore = 1.0; // very strong
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyScore, weight: 0.35 },
    { score: wickScore, weight: 0.2 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.15 },
    { score: srScore, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BEARISH_MARUBOZU",
    category: "MOMENTUM",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      volumeMultiple,
      downTrendStrengthPct,
      distanceToNearestSRpct,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToNearestSRpct,
    },
  };
}

/**
 * Detect Bullish Belt Hold Candle Pattern (Single-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * "Opening shaven bottom" bullish reversal candle (Yorikiri style)
 * Opens at or near low of the day with strong bullish body
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishBeltHold(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 1 candle
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];

  // Validate candle
  if (candle.high === candle.low) {
    return null; // invalid candle
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);

  const bodyRatio = parts.bodyRatio;
  const upperWickRatio = parts.upperShadowRatio;
  const lowerWickRatio = parts.lowerShadowRatio;

  // Color check
  const isBullish = candle.close > candle.open;

  // Calculate downTrendStrength (last 5-10 candles before this one)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index, 8);

  // Volume calculation
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Distance to support
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(candle.close - context.nearestSupport) / candle.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) Bullish candle
  const bullishCondition = isBullish;

  // B) Opens at or near low of the day
  const lowerWickCondition = lowerWickRatio <= 0.1;

  // C) Large body
  const bodyCondition = bodyRatio >= 0.6;

  // If any structural condition fails, return invalid
  if (!bullishCondition || !lowerWickCondition || !bodyCondition) {
    return {
      index,
      pattern: "BULLISH_BELT_HOLD",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        volumeMultiple,
        downTrendStrengthPct,
        distanceToSupportPct: distanceToSupport,
        // Include standard interface metrics for compatibility
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Lower Wick Ratio Quality
  let lowerWickScore = 0.0;
  if (lowerWickRatio > 0.1) {
    lowerWickScore = 0.0; // invalid (already filtered)
  } else if (lowerWickRatio >= 0.05 && lowerWickRatio <= 0.1) {
    lowerWickScore = 0.25; // weak
  } else if (lowerWickRatio >= 0.02 && lowerWickRatio < 0.05) {
    lowerWickScore = 0.5; // medium
  } else if (lowerWickRatio < 0.02) {
    lowerWickScore = 1.0; // very strong
  }

  // B) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio >= 0.6 && bodyRatio < 0.7) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.7 && bodyRatio < 0.8) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.8 && bodyRatio < 0.9) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio >= 0.9) {
    bodyScore = 1.0; // very strong
  }

  // C) Upper Wick Ratio Quality
  let upperWickScore = 0.0;
  if (upperWickRatio > 0.4) {
    upperWickScore = 0.0; // invalid
  } else if (upperWickRatio >= 0.3 && upperWickRatio <= 0.4) {
    upperWickScore = 0.25; // weak
  } else if (upperWickRatio >= 0.15 && upperWickRatio < 0.3) {
    upperWickScore = 0.5; // medium
  } else if (upperWickRatio >= 0.05 && upperWickRatio < 0.15) {
    upperWickScore = 0.75; // strong
  } else if (upperWickRatio < 0.05) {
    upperWickScore = 1.0; // very strong
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.5) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.5 && volumeMultiple < 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple >= 2.0) {
    volumeScore = 1.0; // very strong
  }

  // F) Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: lowerWickScore, weight: 0.25 },
    { score: bodyScore, weight: 0.25 },
    { score: upperWickScore, weight: 0.1 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.15 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BULLISH_BELT_HOLD",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      volumeMultiple,
      downTrendStrengthPct,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Bearish Belt Hold Candle Pattern (Single-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Bearish reversal candle that opens at or near high of the day with strong bearish body
 * Bearish mirror of Bullish Belt Hold
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBearishBeltHold(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 1 candle
  if (!candles || index < 0 || index >= candles.length) {
    return null;
  }

  const candle = candles[index];

  // Validate candle
  if (candle.high === candle.low) {
    return null; // invalid candle
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================
  const parts = getCandleParts(candle);

  const bodyRatio = parts.bodyRatio;
  const upperWickRatio = parts.upperShadowRatio;
  const lowerWickRatio = parts.lowerShadowRatio;

  // Color check
  const isBearish = candle.close < candle.open;

  // Calculate upTrendStrength (last 5-10 candles before this one)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index, 8);

  // Volume calculation
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple = calculateVolumeMultiple(candle, avgVolume20);

  // Distance to resistance
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - candle.close) / candle.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) Bearish candle
  const bearishCondition = isBearish;

  // B) Opens at or near high of the day
  const upperWickCondition = upperWickRatio <= 0.1;

  // C) Large body
  const bodyCondition = bodyRatio >= 0.6;

  // If any structural condition fails, return invalid
  if (!bearishCondition || !upperWickCondition || !bodyCondition) {
    return {
      index,
      pattern: "BEARISH_BELT_HOLD",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio,
        upperWickRatio,
        lowerWickRatio,
        volumeMultiple,
        upTrendStrengthPct,
        distanceToResistancePct: distanceToResistance,
        // Include standard interface metrics for compatibility
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Upper Wick Ratio Quality
  let upperWickScore = 0.0;
  if (upperWickRatio > 0.1) {
    upperWickScore = 0.0; // invalid (already filtered)
  } else if (upperWickRatio >= 0.05 && upperWickRatio <= 0.1) {
    upperWickScore = 0.25; // weak
  } else if (upperWickRatio >= 0.02 && upperWickRatio < 0.05) {
    upperWickScore = 0.5; // medium
  } else if (upperWickRatio < 0.02) {
    upperWickScore = 1.0; // very strong
  }

  // B) Body Ratio Quality
  let bodyScore = 0.0;
  if (bodyRatio >= 0.6 && bodyRatio < 0.7) {
    bodyScore = 0.25; // weak
  } else if (bodyRatio >= 0.7 && bodyRatio < 0.8) {
    bodyScore = 0.5; // medium
  } else if (bodyRatio >= 0.8 && bodyRatio < 0.9) {
    bodyScore = 0.75; // strong
  } else if (bodyRatio >= 0.9) {
    bodyScore = 1.0; // very strong
  }

  // C) Lower Wick Ratio Quality
  let lowerWickScore = 0.0;
  if (lowerWickRatio > 0.4) {
    lowerWickScore = 0.0; // invalid
  } else if (lowerWickRatio >= 0.3 && lowerWickRatio <= 0.4) {
    lowerWickScore = 0.25; // weak
  } else if (lowerWickRatio >= 0.15 && lowerWickRatio < 0.3) {
    lowerWickScore = 0.5; // medium
  } else if (lowerWickRatio >= 0.05 && lowerWickRatio < 0.15) {
    lowerWickScore = 0.75; // strong
  } else if (lowerWickRatio < 0.05) {
    lowerWickScore = 1.0; // very strong
  }

  // D) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // E) Volume Context Scoring
  let volumeScore = 0.0;
  if (volumeMultiple >= 0.7 && volumeMultiple < 1.0) {
    volumeScore = 0.25; // weak
  } else if (volumeMultiple >= 1.0 && volumeMultiple < 1.5) {
    volumeScore = 0.5; // medium
  } else if (volumeMultiple >= 1.5 && volumeMultiple < 2.0) {
    volumeScore = 0.75; // strong
  } else if (volumeMultiple >= 2.0) {
    volumeScore = 1.0; // very strong
  }

  // F) Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: upperWickScore, weight: 0.25 },
    { score: bodyScore, weight: 0.25 },
    { score: lowerWickScore, weight: 0.1 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore, weight: 0.15 },
    { score: srScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BEARISH_BELT_HOLD",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio,
      upperWickRatio,
      lowerWickRatio,
      volumeMultiple,
      upTrendStrengthPct,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Upside Tasuki Gap Pattern (Three-Candle Pattern)
 * Classification: Continuation, Direction: LONG
 * Bullish continuation pattern with gap up and shallow pullback
 * Based on classical Japanese candlestick literature
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectUpsideTasukiGap(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 3 candles (C1, C2, C3)
  if (!candles || index < 2 || index >= candles.length) {
    return null;
  }

  // Three candles: C1 = n-2, C2 = n-1, C3 = n
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBullish1 = c1.close > c1.open;
  const isBullish2 = c2.close > c2.open;
  const isBearish3 = c3.close < c3.open;

  // Gap calculations
  const gapSize = c2.open > c1.high ? ((c2.open - c1.high) / c1.high) * 100 : 0;
  const gapExists = c2.open > c1.high;
  const gapNotFilled = c3.low > c1.high;

  // Gap fill percentage (how much of the gap was filled by C3)
  const gapFillPct = gapExists && gapSize > 0 ? (c2.open - c3.low) / (c2.open - c1.high) : 1.0; // if no gap or gap filled, this is invalid

  // Calculate uptrend strength (before C1)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 2, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple3 = calculateVolumeMultiple(c3, avgVolume20);

  // Gap support distance
  const distanceToGapSupportPct = gapExists ? ((c2.open - c3.low) / c2.open) * 100 : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 bullish with strong body
  const c1BullishCondition = isBullish1 && bodyRatio1 >= 0.4;

  // B) C2 bullish with gap up
  const c2BullishCondition = isBullish2;
  const gapUpCondition = gapExists; // open_2 > high_1

  // C) C3 bearish but NOT fully closing the gap
  const c3BearishCondition = isBearish3;
  const gapNotFilledCondition = gapNotFilled; // low_3 > high_1

  // If any structural condition fails, return invalid
  if (
    !c1BullishCondition ||
    !c2BullishCondition ||
    !gapUpCondition ||
    !c3BearishCondition ||
    !gapNotFilledCondition ||
    gapSize < 0.1
  ) {
    return {
      index,
      pattern: "UPSIDE_TASUKI_GAP",
      category: "CONTINUATION",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        gapSize,
        gapFillPct,
        upTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple3,
        distanceToGapSupportPct,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio2,
        upperWickRatio: parts2.upperShadowRatio,
        lowerWickRatio: parts2.lowerShadowRatio,
        volumeMultiple: volumeMultiple2,
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToGapSupportPct,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Gap Size Quality
  let gapSizeScore = 0.0;
  if (gapSize < 0.1) {
    gapSizeScore = 0.0; // invalid (too small)
  } else if (gapSize >= 0.1 && gapSize < 0.2) {
    gapSizeScore = 0.25; // weak
  } else if (gapSize >= 0.2 && gapSize < 0.4) {
    gapSizeScore = 0.5; // medium
  } else if (gapSize >= 0.4 && gapSize < 0.7) {
    gapSizeScore = 0.75; // strong
  } else if (gapSize >= 0.7) {
    gapSizeScore = 1.0; // very strong
  }

  // B) Gap Fill Percentage Quality (shallow pullback is better)
  let gapFillScore = 0.0;
  if (gapFillPct > 0.8) {
    gapFillScore = 0.0; // invalid (pullback too deep)
  } else if (gapFillPct >= 0.6 && gapFillPct <= 0.8) {
    gapFillScore = 0.25; // weak
  } else if (gapFillPct >= 0.4 && gapFillPct < 0.6) {
    gapFillScore = 0.5; // medium
  } else if (gapFillPct >= 0.2 && gapFillPct < 0.4) {
    gapFillScore = 0.75; // strong
  } else if (gapFillPct < 0.2) {
    gapFillScore = Math.min(1.0, 0.75 + (0.2 - gapFillPct) * 1.25); // very strong, cap at 1.0
  }

  // C) Trend Context Scoring
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // D) Volume Score for C1
  let volumeScore1 = 0.0;
  if (volumeMultiple1 >= 0.8 && volumeMultiple1 < 1.2) {
    volumeScore1 = 0.25; // weak
  } else if (volumeMultiple1 >= 1.2 && volumeMultiple1 < 1.6) {
    volumeScore1 = 0.5; // medium
  } else if (volumeMultiple1 >= 1.6 && volumeMultiple1 < 2.2) {
    volumeScore1 = 0.75; // strong
  } else if (volumeMultiple1 >= 2.2) {
    volumeScore1 = 1.0; // very strong
  }

  // E) Volume Score for C2
  let volumeScore2 = 0.0;
  if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore2 = 0.25; // weak
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.6) {
    volumeScore2 = 0.5; // medium
  } else if (volumeMultiple2 >= 1.6 && volumeMultiple2 < 2.2) {
    volumeScore2 = 0.75; // strong
  } else if (volumeMultiple2 >= 2.2) {
    volumeScore2 = 1.0; // very strong
  }

  // F) Pullback Volume Score for C3 (lower is better)
  let pullbackVolumeScore = 0.0;
  if (volumeMultiple3 < 0.9) {
    pullbackVolumeScore = 1.0; // strong (buyers still dominating)
  } else if (volumeMultiple3 >= 0.9 && volumeMultiple3 < 1.2) {
    pullbackVolumeScore = 0.5; // neutral
  } else if (volumeMultiple3 >= 1.2) {
    pullbackVolumeScore = 0.25; // weak (distribution)
  }

  // G) Gap Support Score
  let gapSupportScore = 0.0;
  // The smaller the distance, the stronger the support
  if (distanceToGapSupportPct < 0.1) {
    gapSupportScore = 1.0; // very strong support
  } else if (distanceToGapSupportPct >= 0.1 && distanceToGapSupportPct < 0.25) {
    gapSupportScore = 0.75; // strong support
  } else if (distanceToGapSupportPct >= 0.25 && distanceToGapSupportPct < 0.5) {
    gapSupportScore = 0.5; // medium support
  } else if (distanceToGapSupportPct >= 0.5 && distanceToGapSupportPct < 1.0) {
    gapSupportScore = 0.25; // weak support
  } else {
    gapSupportScore = 0.0; // no support
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: gapSizeScore, weight: 0.25 },
    { score: gapFillScore, weight: 0.25 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore1, weight: 0.1 },
    { score: volumeScore2, weight: 0.1 },
    { score: pullbackVolumeScore, weight: 0.05 },
    { score: gapSupportScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "UPSIDE_TASUKI_GAP",
    category: "CONTINUATION",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      gapSize,
      gapFillPct,
      upTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple3,
      distanceToGapSupportPct,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio2,
      upperWickRatio: parts2.upperShadowRatio,
      lowerWickRatio: parts2.lowerShadowRatio,
      volumeMultiple: volumeMultiple2,
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToGapSupportPct,
    },
  };
}

/**
 * Detect Downside Tasuki Gap Pattern (Three-Candle Pattern)
 * Classification: Continuation, Direction: SHORT
 * Bearish continuation pattern with gap down and shallow pullback
 * Bearish counterpart of Upside Tasuki Gap
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectDownsideTasukiGap(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 3 candles (C1, C2, C3)
  if (!candles || index < 2 || index >= candles.length) {
    return null;
  }

  // Three candles: C1 = n-2, C2 = n-1, C3 = n
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBearish2 = c2.close < c2.open;
  const isBullish3 = c3.close > c3.open;

  // Gap calculations (gap down)
  const gapSize = c2.open < c1.low ? ((c1.low - c2.open) / c1.low) * 100 : 0;
  const gapExists = c2.open < c1.low;
  const gapNotFilled = c3.high < c1.low;

  // Gap fill percentage (how much of the gap was filled by C3)
  const gapFillPct =
    gapExists && gapSize > 0 && c1.low - c2.open > 0
      ? (c3.high - c2.open) / (c1.low - c2.open)
      : 1.0; // if no gap or gap filled, this is invalid

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 2, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple3 = calculateVolumeMultiple(c3, avgVolume20);

  // Gap resistance distance
  const distanceToGapResistancePct =
    gapExists && c3.high > 0 ? ((c3.high - c2.open) / c3.high) * 100 : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 bearish with strong body
  const c1BearishCondition = isBearish1 && bodyRatio1 >= 0.4;

  // B) C2 bearish with gap down
  const c2BearishCondition = isBearish2;
  const gapDownCondition = gapExists; // open_2 < low_1

  // C) C3 bullish but NOT fully filling the gap
  const c3BullishCondition = isBullish3;
  const gapNotFilledCondition = gapNotFilled; // high_3 < low_1

  // If any structural condition fails, return invalid
  if (
    !c1BearishCondition ||
    !c2BearishCondition ||
    !gapDownCondition ||
    !c3BullishCondition ||
    !gapNotFilledCondition ||
    gapSize < 0.1
  ) {
    return {
      index,
      pattern: "DOWNSIDE_TASUKI_GAP",
      category: "CONTINUATION",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        gapSize,
        gapFillPct,
        downTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple3,
        distanceToGapResistancePct,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio2,
        upperWickRatio: parts2.upperShadowRatio,
        lowerWickRatio: parts2.lowerShadowRatio,
        volumeMultiple: volumeMultiple2,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToGapResistancePct,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Gap Size Quality
  let gapSizeScore = 0.0;
  if (gapSize < 0.1) {
    gapSizeScore = 0.0; // invalid (too small)
  } else if (gapSize >= 0.1 && gapSize < 0.2) {
    gapSizeScore = 0.25; // weak
  } else if (gapSize >= 0.2 && gapSize < 0.4) {
    gapSizeScore = 0.5; // medium
  } else if (gapSize >= 0.4 && gapSize < 0.7) {
    gapSizeScore = 0.75; // strong
  } else if (gapSize >= 0.7) {
    gapSizeScore = 1.0; // very strong
  }

  // B) Gap Fill Percentage Quality (shallow pullback is better)
  let gapFillScore = 0.0;
  if (gapFillPct > 0.8) {
    gapFillScore = 0.0; // invalid (pullback too deep)
  } else if (gapFillPct >= 0.6 && gapFillPct <= 0.8) {
    gapFillScore = 0.25; // weak
  } else if (gapFillPct >= 0.4 && gapFillPct < 0.6) {
    gapFillScore = 0.5; // medium
  } else if (gapFillPct >= 0.2 && gapFillPct < 0.4) {
    gapFillScore = 0.75; // strong
  } else if (gapFillPct < 0.2) {
    gapFillScore = Math.min(1.0, 0.75 + (0.2 - gapFillPct) * 1.25); // very strong, cap at 1.0
  }

  // C) Trend Context Scoring (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // D) Volume Score for C1
  let volumeScore1 = 0.0;
  if (volumeMultiple1 >= 0.8 && volumeMultiple1 < 1.2) {
    volumeScore1 = 0.25; // weak
  } else if (volumeMultiple1 >= 1.2 && volumeMultiple1 < 1.6) {
    volumeScore1 = 0.5; // medium
  } else if (volumeMultiple1 >= 1.6 && volumeMultiple1 < 2.2) {
    volumeScore1 = 0.75; // strong
  } else if (volumeMultiple1 >= 2.2) {
    volumeScore1 = 1.0; // very strong
  }

  // E) Volume Score for C2
  let volumeScore2 = 0.0;
  if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore2 = 0.25; // weak
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.6) {
    volumeScore2 = 0.5; // medium
  } else if (volumeMultiple2 >= 1.6 && volumeMultiple2 < 2.2) {
    volumeScore2 = 0.75; // strong
  } else if (volumeMultiple2 >= 2.2) {
    volumeScore2 = 1.0; // very strong
  }

  // F) Pullback Volume Score for C3 (lower is better for bearish continuation)
  let pullbackVolumeScore = 0.0;
  if (volumeMultiple3 < 0.9) {
    pullbackVolumeScore = 1.0; // strong (sellers still dominating)
  } else if (volumeMultiple3 >= 0.9 && volumeMultiple3 < 1.2) {
    pullbackVolumeScore = 0.5; // neutral
  } else if (volumeMultiple3 >= 1.2) {
    pullbackVolumeScore = 0.25; // weak (accumulation)
  }

  // G) Gap Resistance Score
  let gapResistanceScore = 0.0;
  // The smaller the distance, the stronger the resistance
  if (distanceToGapResistancePct < 0.1) {
    gapResistanceScore = 1.0; // very strong resistance
  } else if (distanceToGapResistancePct >= 0.1 && distanceToGapResistancePct < 0.25) {
    gapResistanceScore = 0.75; // strong resistance
  } else if (distanceToGapResistancePct >= 0.25 && distanceToGapResistancePct < 0.5) {
    gapResistanceScore = 0.5; // medium resistance
  } else if (distanceToGapResistancePct >= 0.5 && distanceToGapResistancePct < 1.0) {
    gapResistanceScore = 0.25; // weak resistance
  } else {
    gapResistanceScore = 0.0; // no resistance
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: gapSizeScore, weight: 0.25 },
    { score: gapFillScore, weight: 0.25 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore1, weight: 0.1 },
    { score: volumeScore2, weight: 0.1 },
    { score: pullbackVolumeScore, weight: 0.05 },
    { score: gapResistanceScore, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "DOWNSIDE_TASUKI_GAP",
    category: "CONTINUATION",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      gapSize,
      gapFillPct,
      downTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple3,
      distanceToGapResistancePct,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio2,
      upperWickRatio: parts2.upperShadowRatio,
      lowerWickRatio: parts2.lowerShadowRatio,
      volumeMultiple: volumeMultiple2,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToGapResistancePct,
    },
  };
}

/**
 * Detect Bullish Kicking Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * Very strong two-candle bullish reversal pattern
 * Consists of bearish Marubozu followed by bullish Marubozu with gap up
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishKicking(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (C1, C2)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Two candles: C1 = n-1, C2 = n
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  const upperWick1 = parts1.upperShadowRatio;
  const lowerWick1 = parts1.lowerShadowRatio;
  const combinedWick1 = upperWick1 + lowerWick1;

  const upperWick2 = parts2.upperShadowRatio;
  const lowerWick2 = parts2.lowerShadowRatio;
  const combinedWick2 = upperWick2 + lowerWick2;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBullish2 = c2.close > c2.open;

  // Gap calculation
  const gapSizePct = c2.open > c1.high ? ((c2.open - c1.high) / c1.high) * 100 : 0;
  const gapExists = c2.open > c1.high;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculation
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to support
  const distanceToSupport =
    context.nearestSupport !== undefined
      ? (Math.abs(c2.close - context.nearestSupport) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 bearish with almost no wicks
  const c1BearishCondition = isBearish1;
  const c1BodyCondition = bodyRatio1 >= 0.8;
  const c1WickCondition = combinedWick1 <= 0.2;

  // B) C2 bullish with almost no wicks
  const c2BullishCondition = isBullish2;
  const c2BodyCondition = bodyRatio2 >= 0.8;
  const c2WickCondition = combinedWick2 <= 0.2;

  // C) Gap between the two candles
  const gapCondition = gapExists;

  // If any structural condition fails, return invalid
  if (
    !c1BearishCondition ||
    !c1BodyCondition ||
    !c1WickCondition ||
    !c2BullishCondition ||
    !c2BodyCondition ||
    !c2WickCondition ||
    !gapCondition
  ) {
    return {
      index,
      pattern: "BULLISH_KICKING",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        gapSizePct,
        volumeMultiple2,
        downTrendStrengthPct,
        distanceToSupportPct: distanceToSupport,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio2,
        upperWickRatio: parts2.upperShadowRatio,
        lowerWickRatio: parts2.lowerShadowRatio,
        volumeMultiple: volumeMultiple2,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: distanceToSupport,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality for C1 (Marubozu scoring)
  let bodyScore1 = 0.0;
  if (bodyRatio1 >= 0.8 && bodyRatio1 < 0.9) {
    bodyScore1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.9 && bodyRatio1 < 0.97) {
    bodyScore1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.97) {
    bodyScore1 = 1.0; // very strong
  } else {
    bodyScore1 = 0.25; // weak (but still valid)
  }

  // B) Body Ratio Quality for C2 (Marubozu scoring)
  let bodyScore2 = 0.0;
  if (bodyRatio2 >= 0.8 && bodyRatio2 < 0.9) {
    bodyScore2 = 0.5; // medium
  } else if (bodyRatio2 >= 0.9 && bodyRatio2 < 0.97) {
    bodyScore2 = 0.75; // strong
  } else if (bodyRatio2 >= 0.97) {
    bodyScore2 = 1.0; // very strong
  } else {
    bodyScore2 = 0.25; // weak (but still valid)
  }

  // C) Gap Size Scoring
  let gapSizeScore = 0.0;
  if (gapSizePct < 0.15) {
    gapSizeScore = 0.25; // weak
  } else if (gapSizePct >= 0.15 && gapSizePct < 0.35) {
    gapSizeScore = 0.5; // medium
  } else if (gapSizePct >= 0.35 && gapSizePct < 0.6) {
    gapSizeScore = 0.75; // strong
  } else if (gapSizePct >= 0.6) {
    gapSizeScore = 1.0; // very strong
  }

  // D) Wick Scoring for C1
  let wickScore1 = 0.0;
  if (combinedWick1 <= 0.03) {
    wickScore1 = 1.0; // extremely strong
  } else if (combinedWick1 <= 0.1) {
    wickScore1 = 0.75; // strong
  } else if (combinedWick1 <= 0.2) {
    wickScore1 = 0.5; // acceptable
  }

  // E) Wick Scoring for C2
  let wickScore2 = 0.0;
  if (combinedWick2 <= 0.03) {
    wickScore2 = 1.0; // extremely strong
  } else if (combinedWick2 <= 0.1) {
    wickScore2 = 0.75; // strong
  } else if (combinedWick2 <= 0.2) {
    wickScore2 = 0.5; // acceptable
  }

  // Average wick score for both candles
  const wickScore = (wickScore1 + wickScore2) / 2;

  // F) Trend Context Scoring
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 1.0 && downTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (downTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // G) Volume Score for C2
  let volumeScore2 = 0.0;
  if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore2 = 0.5; // medium
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore2 = 0.75; // strong
  } else if (volumeMultiple2 >= 1.8) {
    volumeScore2 = 1.0; // very strong
  } else {
    volumeScore2 = 0.25; // weak
  }

  // H) Support Proximity Scoring
  let srScore = 0.0;
  if (distanceToSupport >= 0.5 && distanceToSupport <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToSupport >= 0.25 && distanceToSupport < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToSupport < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToSupport) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyScore1, weight: 0.2 },
    { score: bodyScore2, weight: 0.2 },
    { score: gapSizeScore, weight: 0.25 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore2, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // Note: Wick score is implicit in body score quality, but we could add it as a bonus
  // For now, it's already reflected in the body/wick structural conditions

  // =========================
  // 5. THRESHOLD CHECK (Stronger threshold due to rarity)
  // =========================
  const isPattern = strength >= 0.6;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BULLISH_KICKING",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      gapSizePct,
      volumeMultiple2,
      downTrendStrengthPct,
      distanceToSupportPct: distanceToSupport,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio2,
      upperWickRatio: parts2.upperShadowRatio,
      lowerWickRatio: parts2.lowerShadowRatio,
      volumeMultiple: volumeMultiple2,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: distanceToSupport,
    },
  };
}

/**
 * Detect Bearish Kicking Pattern (Two-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Very strong two-candle bearish reversal pattern
 * Consists of bullish Marubozu followed by bearish Marubozu with gap down
 * Bearish mirror of Bullish Kicking
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBearishKicking(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (C1, C2)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Two candles: C1 = n-1, C2 = n
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  const upperWick1 = parts1.upperShadowRatio;
  const lowerWick1 = parts1.lowerShadowRatio;
  const combinedWick1 = upperWick1 + lowerWick1;

  const upperWick2 = parts2.upperShadowRatio;
  const lowerWick2 = parts2.lowerShadowRatio;
  const combinedWick2 = upperWick2 + lowerWick2;

  // Color checks
  const isBullish1 = c1.close > c1.open;
  const isBearish2 = c2.close < c2.open;

  // Gap calculation (gap down)
  const gapSizePct = c2.open < c1.low ? ((c1.low - c2.open) / c1.low) * 100 : 0;
  const gapExists = c2.open < c1.low;

  // Calculate uptrend strength (before C1)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 1, 8);

  // Volume calculation
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // Distance to resistance
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - c2.close) / c2.close) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 bullish with almost no wicks
  const c1BullishCondition = isBullish1;
  const c1BodyCondition = bodyRatio1 >= 0.8;
  const c1WickCondition = combinedWick1 <= 0.2;

  // B) C2 bearish with almost no wicks
  const c2BearishCondition = isBearish2;
  const c2BodyCondition = bodyRatio2 >= 0.8;
  const c2WickCondition = combinedWick2 <= 0.2;

  // C) Gap between the two candles (gap down)
  const gapCondition = gapExists;

  // If any structural condition fails, return invalid
  if (
    !c1BullishCondition ||
    !c1BodyCondition ||
    !c1WickCondition ||
    !c2BearishCondition ||
    !c2BodyCondition ||
    !c2WickCondition ||
    !gapCondition
  ) {
    return {
      index,
      pattern: "BEARISH_KICKING",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        gapSizePct,
        volumeMultiple2,
        upTrendStrengthPct,
        distanceToResistancePct: distanceToResistance,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio2,
        upperWickRatio: parts2.upperShadowRatio,
        lowerWickRatio: parts2.lowerShadowRatio,
        volumeMultiple: volumeMultiple2,
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Body Ratio Quality for C1 (Marubozu scoring)
  let bodyScore1 = 0.0;
  if (bodyRatio1 >= 0.8 && bodyRatio1 < 0.9) {
    bodyScore1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.9 && bodyRatio1 < 0.97) {
    bodyScore1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.97) {
    bodyScore1 = 1.0; // very strong
  } else {
    bodyScore1 = 0.25; // weak (but still valid)
  }

  // B) Body Ratio Quality for C2 (Marubozu scoring)
  let bodyScore2 = 0.0;
  if (bodyRatio2 >= 0.8 && bodyRatio2 < 0.9) {
    bodyScore2 = 0.5; // medium
  } else if (bodyRatio2 >= 0.9 && bodyRatio2 < 0.97) {
    bodyScore2 = 0.75; // strong
  } else if (bodyRatio2 >= 0.97) {
    bodyScore2 = 1.0; // very strong
  } else {
    bodyScore2 = 0.25; // weak (but still valid)
  }

  // C) Gap Size Scoring
  let gapSizeScore = 0.0;
  if (gapSizePct < 0.15) {
    gapSizeScore = 0.25; // weak
  } else if (gapSizePct >= 0.15 && gapSizePct < 0.35) {
    gapSizeScore = 0.5; // medium
  } else if (gapSizePct >= 0.35 && gapSizePct < 0.6) {
    gapSizeScore = 0.75; // strong
  } else if (gapSizePct >= 0.6) {
    gapSizeScore = 1.0; // very strong
  }

  // D) Wick Scoring for C1
  let wickScore1 = 0.0;
  if (combinedWick1 <= 0.03) {
    wickScore1 = 1.0; // extremely strong
  } else if (combinedWick1 <= 0.1) {
    wickScore1 = 0.75; // strong
  } else if (combinedWick1 <= 0.2) {
    wickScore1 = 0.5; // acceptable
  }

  // E) Wick Scoring for C2
  let wickScore2 = 0.0;
  if (combinedWick2 <= 0.03) {
    wickScore2 = 1.0; // extremely strong
  } else if (combinedWick2 <= 0.1) {
    wickScore2 = 0.75; // strong
  } else if (combinedWick2 <= 0.2) {
    wickScore2 = 0.5; // acceptable
  }

  // Average wick score for both candles
  const wickScore = (wickScore1 + wickScore2) / 2;

  // F) Trend Context Scoring (uptrend)
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // G) Volume Score for C2
  let volumeScore2 = 0.0;
  if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore2 = 0.5; // medium
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore2 = 0.75; // strong
  } else if (volumeMultiple2 >= 1.8) {
    volumeScore2 = 1.0; // very strong
  } else {
    volumeScore2 = 0.25; // weak
  }

  // H) Resistance Proximity Scoring
  let srScore = 0.0;
  if (distanceToResistance >= 0.5 && distanceToResistance <= 1.0) {
    srScore = 0.25; // weak
  } else if (distanceToResistance >= 0.25 && distanceToResistance < 0.5) {
    srScore = 0.5; // medium
  } else if (distanceToResistance < 0.25) {
    srScore = Math.min(1.0, 0.75 + (0.25 - distanceToResistance) * 4.0); // strong, cap at 1.0
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyScore1, weight: 0.2 },
    { score: bodyScore2, weight: 0.2 },
    { score: gapSizeScore, weight: 0.25 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore2, weight: 0.1 },
    { score: srScore, weight: 0.1 },
  ]);

  // Note: Wick score is implicit in body score quality, but we could add it as a bonus
  // For now, it's already reflected in the body/wick structural conditions

  // =========================
  // 5. THRESHOLD CHECK (Stronger threshold due to rarity)
  // =========================
  const isPattern = strength >= 0.6;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BEARISH_KICKING",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      gapSizePct,
      volumeMultiple2,
      upTrendStrengthPct,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio2,
      upperWickRatio: parts2.upperShadowRatio,
      lowerWickRatio: parts2.lowerShadowRatio,
      volumeMultiple: volumeMultiple2,
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Concealing Baby Swallow Pattern (Four-Candle Pattern)
 * Classification: Continuation, Direction: SHORT
 * Rare but very bearish continuation pattern
 * Shows persistent selling pressure with attempts to rally being "concealed" and swallowed
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectConcealingBabySwallow(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 4 candles (C1, C2, C3, C4)
  if (!candles || index < 3 || index >= candles.length) {
    return null;
  }

  // Four candles: C1 = n-3, C2 = n-2, C3 = n-1, C4 = n
  const c1 = candles[index - 3];
  const c2 = candles[index - 2];
  const c3 = candles[index - 1];
  const c4 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low || c4.high === c4.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);
  const parts4 = getCandleParts(c4);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;
  const bodyRatio4 = parts4.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBearish2 = c2.close < c2.open;
  const isBearish3 = c3.close < c3.open;
  const isBearish4 = c4.close < c4.open;

  // Gap calculation (C1 to C2)
  const gapSizePct = c2.open < c1.low ? ((c1.low - c2.open) / c1.low) * 100 : 0;
  const gapExists = c2.open < c1.low;

  // C3 inside C2 body check
  const c2BodyHigh = Math.max(c2.open, c2.close);
  const c2BodyLow = Math.min(c2.open, c2.close);
  const c3BodyHigh = Math.max(c3.open, c3.close);
  const c3BodyLow = Math.min(c3.open, c3.close);

  const c3InsideBody = c3BodyHigh < c2BodyHigh && c3BodyLow > c2BodyLow;
  const c3HighCapped = c3.high <= c2BodyHigh;

  // C4 calculations
  const range4 = c4.high - c4.low;
  const closeToLowPct4 = range4 > 0 ? (c4.close - c4.low) / range4 : 1.0;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 3, 10);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple4 = calculateVolumeMultiple(c4, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: black (bearish) candle, relatively large
  const c1Condition = isBearish1 && bodyRatio1 >= 0.4;

  // B) C2: black candle gapping down from C1
  const c2Condition = isBearish2 && gapExists && bodyRatio2 >= 0.4;

  // C) C3: small black candle whose real body is inside C2 body, and whose HIGH is within C2 body
  const c3Condition = isBearish3 && bodyRatio3 <= 0.35 && c3InsideBody && c3HighCapped;

  // D) C4: black candle that "swallows" / covers C3 completely and closes near its low
  const c4Condition =
    isBearish4 &&
    bodyRatio4 >= 0.45 &&
    c4.high <= c2.high &&
    c4.low <= c3.low &&
    closeToLowPct4 <= 0.25;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition || !c4Condition) {
    return {
      index,
      pattern: "CONCEALING_BABY_SWALLOW",
      category: "CONTINUATION",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        downTrendStrengthPct,
        gapSizePct,
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        bodyRatio4,
        closeToLowPct4,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple4,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio4,
        upperWickRatio: parts4.upperShadowRatio,
        lowerWickRatio: parts4.lowerShadowRatio,
        volumeMultiple: volumeMultiple4,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Trend Context Scoring (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // B) Gap Size Score (C1→C2)
  let gapScore = 0.0;
  if (gapSizePct < 0.1) {
    gapScore = 0.25; // weak
  } else if (gapSizePct >= 0.1 && gapSizePct < 0.25) {
    gapScore = 0.5; // medium
  } else if (gapSizePct >= 0.25 && gapSizePct < 0.5) {
    gapScore = 0.75; // strong
  } else if (gapSizePct >= 0.5) {
    gapScore = 1.0; // very strong
  }

  // C) C3 "inside + capped" quality (concealed baby)
  // insideBodyScore3: smaller body is better (but not zero)
  const insideBodyScore3 = Math.max(0.0, 1.0 - bodyRatio3 / 0.35); // normalize to 0-1

  // topCappedScore3
  const topCappedScore3 = c3HighCapped ? 1.0 : 0.5;

  // Combine into babyInsideScore
  const babyInsideScore = insideBodyScore3 * 0.5 + topCappedScore3 * 0.5;

  // D) C4 dominance score
  // Body ratio score
  let c4BodyScore = 0.0;
  if (bodyRatio4 >= 0.45 && bodyRatio4 < 0.6) {
    c4BodyScore = 0.5; // medium
  } else if (bodyRatio4 >= 0.6 && bodyRatio4 < 0.75) {
    c4BodyScore = 0.75; // strong
  } else if (bodyRatio4 >= 0.75) {
    c4BodyScore = 1.0; // very strong
  }

  // Close to low score
  let c4CloseToLowScore = 0.0;
  if (closeToLowPct4 >= 0.15 && closeToLowPct4 <= 0.25) {
    c4CloseToLowScore = 0.5; // medium
  } else if (closeToLowPct4 >= 0.05 && closeToLowPct4 < 0.15) {
    c4CloseToLowScore = 0.75; // strong
  } else if (closeToLowPct4 < 0.05) {
    c4CloseToLowScore = 1.0; // very strong
  }

  // Combine into c4StrengthScore
  const c4StrengthScore = c4BodyScore * 0.5 + c4CloseToLowScore * 0.5;

  // E) Volume Score (average of C1, C2, C4)
  let volumeScore1 = 0.0;
  if (volumeMultiple1 >= 0.8 && volumeMultiple1 < 1.2) {
    volumeScore1 = 0.25; // weak
  } else if (volumeMultiple1 >= 1.2 && volumeMultiple1 < 1.8) {
    volumeScore1 = 0.5; // medium
  } else if (volumeMultiple1 >= 1.8 && volumeMultiple1 < 2.5) {
    volumeScore1 = 0.75; // strong
  } else if (volumeMultiple1 >= 2.5) {
    volumeScore1 = 1.0; // very strong
  }

  let volumeScore2 = 0.0;
  if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore2 = 0.25; // weak
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore2 = 0.5; // medium
  } else if (volumeMultiple2 >= 1.8 && volumeMultiple2 < 2.5) {
    volumeScore2 = 0.75; // strong
  } else if (volumeMultiple2 >= 2.5) {
    volumeScore2 = 1.0; // very strong
  }

  let volumeScore4 = 0.0;
  if (volumeMultiple4 >= 0.8 && volumeMultiple4 < 1.2) {
    volumeScore4 = 0.25; // weak
  } else if (volumeMultiple4 >= 1.2 && volumeMultiple4 < 1.8) {
    volumeScore4 = 0.5; // medium
  } else if (volumeMultiple4 >= 1.8 && volumeMultiple4 < 2.5) {
    volumeScore4 = 0.75; // strong
  } else if (volumeMultiple4 >= 2.5) {
    volumeScore4 = 1.0; // very strong
  }

  const volumeScore = (volumeScore1 + volumeScore2 + volumeScore4) / 3;

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: trendScore, weight: 0.2 },
    { score: gapScore, weight: 0.2 },
    { score: babyInsideScore, weight: 0.2 },
    { score: c4StrengthScore, weight: 0.25 },
    { score: volumeScore, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK (Higher due to rarity and strictness)
  // =========================
  const isPattern = strength >= 0.6;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "CONCEALING_BABY_SWALLOW",
    category: "CONTINUATION",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      downTrendStrengthPct,
      gapSizePct,
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      bodyRatio4,
      closeToLowPct4,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple4,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio4,
      upperWickRatio: parts4.upperShadowRatio,
      lowerWickRatio: parts4.lowerShadowRatio,
      volumeMultiple: volumeMultiple4,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Bullish Breakaway Pattern (Five-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * Five-candle bullish reversal pattern
 * Pattern suggests the prior downtrend is losing momentum after a breakaway gap,
 * then reverses sharply with a powerful bull candle
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBullishBreakaway(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 5 candles (C1, C2, C3, C4, C5)
  if (!candles || index < 4 || index >= candles.length) {
    return null;
  }

  // Five candles: C1 = n-4, C2 = n-3, C3 = n-2, C4 = n-1, C5 = n
  const c1 = candles[index - 4];
  const c2 = candles[index - 3];
  const c3 = candles[index - 2];
  const c4 = candles[index - 1];
  const c5 = candles[index];

  // Validate candles
  if (
    c1.high === c1.low ||
    c2.high === c2.low ||
    c3.high === c3.low ||
    c4.high === c4.low ||
    c5.high === c5.low
  ) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);
  const parts4 = getCandleParts(c4);
  const parts5 = getCandleParts(c5);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;
  const bodyRatio4 = parts4.bodyRatio;
  const bodyRatio5 = parts5.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBearish2 = c2.close < c2.open;
  const isBullish5 = c5.close > c5.open;

  // Gap calculation (C1 to C2)
  const gapSizePct = c2.open < c1.low ? ((c1.low - c2.open) / c1.low) * 100 : 0;
  const gapExists = c2.open < c1.low;

  // C5 reversal penetration
  const c2Midpoint = (c2.open + c2.close) / 2;
  const c1Midpoint = (c1.open + c1.close) / 2;

  const penetrationC2 = c5.close > c2Midpoint;
  const penetrationC1 = c5.close > c1Midpoint; // optional but stronger

  // Penetration percentages
  const c2BodySize = Math.abs(c2.open - c2.close);
  const penetrationC2Pct = c2BodySize > 0 ? (c5.close - c2.close) / (c2.open - c2.close) : 0;

  const c1BodySize = Math.abs(c1.open - c1.close);
  const penetrationC1Pct = c1BodySize > 0 ? (c5.close - c1.close) / (c1.open - c1.close) : 0;

  // C3-C4 drift cluster quality
  const avgBodySmall = (bodyRatio3 + bodyRatio4) / 2;
  const clusterRange = Math.max(c3.high, c4.high) - Math.min(c3.low, c4.low);
  const c2Range = c2.high - c2.low;
  const clusterRangePct = c2Range > 0 ? clusterRange / c2Range : 1.0;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 4, 10);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple5 = calculateVolumeMultiple(c5, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: long bearish candle
  const c1Condition = isBearish1 && bodyRatio1 >= 0.45;

  // B) C2: gaps down and continues in direction of C1
  const c2Condition = isBearish2 && gapExists && bodyRatio2 >= 0.3;

  // C) C3-C4: small range candles drifting lower or sideways
  const c3Condition = bodyRatio3 <= 0.35;
  const c4Condition = bodyRatio4 <= 0.35;

  // D) C5: strong bullish reversal candle
  const c5Condition = isBullish5 && bodyRatio5 >= 0.45 && penetrationC2; // at least above C2 midpoint

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition || !c4Condition || !c5Condition) {
    return {
      index,
      pattern: "BULLISH_BREAKAWAY",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        downTrendStrengthPct,
        gapSizePct,
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        bodyRatio4,
        bodyRatio5,
        penetrationC2Pct,
        penetrationC1Pct,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple5,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio5,
        upperWickRatio: parts5.upperShadowRatio,
        lowerWickRatio: parts5.lowerShadowRatio,
        volumeMultiple: volumeMultiple5,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 strength score
  let c1StrengthScore = 0.0;
  if (bodyRatio1 >= 0.45 && bodyRatio1 < 0.55) {
    c1StrengthScore = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    c1StrengthScore = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    c1StrengthScore = 1.0; // very strong
  }

  // B) Gap size score
  let gapSizeScore = 0.0;
  if (gapSizePct < 0.1) {
    gapSizeScore = 0.25; // weak
  } else if (gapSizePct >= 0.1 && gapSizePct < 0.25) {
    gapSizeScore = 0.5; // medium
  } else if (gapSizePct >= 0.25 && gapSizePct < 0.5) {
    gapSizeScore = 0.75; // strong
  } else if (gapSizePct >= 0.5) {
    gapSizeScore = 1.0; // very strong
  }

  // C) C3-C4 drift cluster score
  let driftClusterScore = 0.0;
  // Smaller bodies and smaller range = better drift
  const smallBodyScore =
    avgBodySmall <= 0.2 ? 1.0 : avgBodySmall <= 0.3 ? 0.75 : avgBodySmall <= 0.35 ? 0.5 : 0.25;

  const tightRangeScore =
    clusterRangePct <= 0.5
      ? 1.0
      : clusterRangePct <= 0.7
        ? 0.75
        : clusterRangePct <= 0.9
          ? 0.5
          : 0.25;

  driftClusterScore = smallBodyScore * 0.5 + tightRangeScore * 0.5;

  // D) C5 reversal strength score
  let c5ReversalScore = 0.0;

  // Body ratio component
  let c5BodyScore = 0.0;
  if (bodyRatio5 >= 0.45 && bodyRatio5 < 0.55) {
    c5BodyScore = 0.5; // medium
  } else if (bodyRatio5 >= 0.55 && bodyRatio5 < 0.7) {
    c5BodyScore = 0.75; // strong
  } else if (bodyRatio5 >= 0.7) {
    c5BodyScore = 1.0; // very strong
  }

  // Penetration component
  let penetrationScore = 0.0;
  if (penetrationC1) {
    penetrationScore = 1.0; // very strong - penetrated C1 midpoint
  } else if (penetrationC2 && penetrationC2Pct >= 0.5) {
    penetrationScore = 0.75; // strong - deep into C2
  } else if (penetrationC2) {
    penetrationScore = 0.5; // medium - above C2 midpoint
  }

  c5ReversalScore = c5BodyScore * 0.6 + penetrationScore * 0.4;

  // E) Trend context score
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // F) Volume score for C5
  let volumeScore5 = 0.0;
  if (volumeMultiple5 >= 0.8 && volumeMultiple5 < 1.2) {
    volumeScore5 = 0.25; // weak
  } else if (volumeMultiple5 >= 1.2 && volumeMultiple5 < 1.8) {
    volumeScore5 = 0.5; // medium
  } else if (volumeMultiple5 >= 1.8 && volumeMultiple5 < 2.5) {
    volumeScore5 = 0.75; // strong
  } else if (volumeMultiple5 >= 2.5) {
    volumeScore5 = 1.0; // very strong
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: c1StrengthScore, weight: 0.15 },
    { score: gapSizeScore, weight: 0.15 },
    { score: driftClusterScore, weight: 0.15 },
    { score: c5ReversalScore, weight: 0.25 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore5, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BULLISH_BREAKAWAY",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      downTrendStrengthPct,
      gapSizePct,
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      bodyRatio4,
      bodyRatio5,
      penetrationC2Pct,
      penetrationC1Pct,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple5,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio5,
      upperWickRatio: parts5.upperShadowRatio,
      lowerWickRatio: parts5.lowerShadowRatio,
      volumeMultiple: volumeMultiple5,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Bearish Breakaway Pattern (Five-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Five-candle bearish reversal pattern
 * Mirror of Bullish Breakaway but from an uptrend
 * Pattern suggests exhaustion at the top + final gap up that fails,
 * followed by a strong reversal candle
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectBearishBreakaway(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 5 candles (C1, C2, C3, C4, C5)
  if (!candles || index < 4 || index >= candles.length) {
    return null;
  }

  // Five candles: C1 = n-4, C2 = n-3, C3 = n-2, C4 = n-1, C5 = n
  const c1 = candles[index - 4];
  const c2 = candles[index - 3];
  const c3 = candles[index - 2];
  const c4 = candles[index - 1];
  const c5 = candles[index];

  // Validate candles
  if (
    c1.high === c1.low ||
    c2.high === c2.low ||
    c3.high === c3.low ||
    c4.high === c4.low ||
    c5.high === c5.low
  ) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);
  const parts4 = getCandleParts(c4);
  const parts5 = getCandleParts(c5);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;
  const bodyRatio4 = parts4.bodyRatio;
  const bodyRatio5 = parts5.bodyRatio;

  // Color checks
  const isBullish1 = c1.close > c1.open;
  const isBullish2 = c2.close > c2.open;
  const isBearish5 = c5.close < c5.open;

  // Gap calculation (C1 to C2 - gap up)
  const gapSizePct = c2.open > c1.high ? ((c2.open - c1.high) / c1.high) * 100 : 0;
  const gapExists = c2.open > c1.high;

  // C5 reversal penetration
  const c2Midpoint = (c2.open + c2.close) / 2;
  const c1Midpoint = (c1.open + c1.close) / 2;

  const penetrationC2 = c5.close < c2Midpoint;
  const penetrationC1 = c5.close < c1Midpoint; // optional but stronger

  // Penetration percentages (bearish - going down)
  const c2BodySize = Math.abs(c2.open - c2.close);
  const penetrationC2Pct = c2BodySize > 0 ? (c2.close - c5.close) / (c2.close - c2.open) : 0;

  const c1BodySize = Math.abs(c1.open - c1.close);
  const penetrationC1Pct = c1BodySize > 0 ? (c1.close - c5.close) / (c1.close - c1.open) : 0;

  // C3-C4 drift cluster quality
  const avgBodySmall = (bodyRatio3 + bodyRatio4) / 2;
  const clusterRange = Math.max(c3.high, c4.high) - Math.min(c3.low, c4.low);
  const c2Range = c2.high - c2.low;
  const clusterRangePct = c2Range > 0 ? clusterRange / c2Range : 1.0;

  // Calculate uptrend strength (before C1)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 4, 10);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple5 = calculateVolumeMultiple(c5, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: strong bullish candle
  const c1Condition = isBullish1 && bodyRatio1 >= 0.45;

  // B) C2: gaps up and continues the move
  const c2Condition = isBullish2 && gapExists && bodyRatio2 >= 0.3;

  // C) C3-C4: small bodies drifting upward or sideways
  const c3Condition = bodyRatio3 <= 0.35;
  const c4Condition = bodyRatio4 <= 0.35;

  // D) C5: strong bearish reversal candle
  const c5Condition = isBearish5 && bodyRatio5 >= 0.45 && penetrationC2; // at least below C2 midpoint

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition || !c4Condition || !c5Condition) {
    return {
      index,
      pattern: "BEARISH_BREAKAWAY",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        upTrendStrengthPct,
        gapSizePct,
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        bodyRatio4,
        bodyRatio5,
        penetrationC2Pct,
        penetrationC1Pct,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple5,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio5,
        upperWickRatio: parts5.upperShadowRatio,
        lowerWickRatio: parts5.lowerShadowRatio,
        volumeMultiple: volumeMultiple5,
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 strength score
  let c1StrengthScore = 0.0;
  if (bodyRatio1 >= 0.45 && bodyRatio1 < 0.55) {
    c1StrengthScore = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    c1StrengthScore = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    c1StrengthScore = 1.0; // very strong
  }

  // B) Gap size score
  let gapSizeScore = 0.0;
  if (gapSizePct < 0.1) {
    gapSizeScore = 0.25; // weak
  } else if (gapSizePct >= 0.1 && gapSizePct < 0.25) {
    gapSizeScore = 0.5; // medium
  } else if (gapSizePct >= 0.25 && gapSizePct < 0.5) {
    gapSizeScore = 0.75; // strong
  } else if (gapSizePct >= 0.5) {
    gapSizeScore = 1.0; // very strong
  }

  // C) C3-C4 drift cluster score
  let driftClusterScore = 0.0;
  // Smaller bodies and smaller range = better drift
  const smallBodyScore =
    avgBodySmall <= 0.2 ? 1.0 : avgBodySmall <= 0.3 ? 0.75 : avgBodySmall <= 0.35 ? 0.5 : 0.25;

  const tightRangeScore =
    clusterRangePct <= 0.5
      ? 1.0
      : clusterRangePct <= 0.7
        ? 0.75
        : clusterRangePct <= 0.9
          ? 0.5
          : 0.25;

  driftClusterScore = smallBodyScore * 0.5 + tightRangeScore * 0.5;

  // D) C5 reversal strength score
  let c5ReversalScore = 0.0;

  // Body ratio component
  let c5BodyScore = 0.0;
  if (bodyRatio5 >= 0.45 && bodyRatio5 < 0.55) {
    c5BodyScore = 0.5; // medium
  } else if (bodyRatio5 >= 0.55 && bodyRatio5 < 0.7) {
    c5BodyScore = 0.75; // strong
  } else if (bodyRatio5 >= 0.7) {
    c5BodyScore = 1.0; // very strong
  }

  // Penetration component (bearish - going down)
  let penetrationScore = 0.0;
  if (penetrationC1) {
    penetrationScore = 1.0; // very strong - penetrated C1 midpoint
  } else if (penetrationC2 && penetrationC2Pct >= 0.5) {
    penetrationScore = 0.75; // strong - deep into C2
  } else if (penetrationC2) {
    penetrationScore = 0.5; // medium - below C2 midpoint
  }

  c5ReversalScore = c5BodyScore * 0.6 + penetrationScore * 0.4;

  // E) Trend context score (uptrend)
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 2.0 && upTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (upTrendStrengthPct >= 4.0 && upTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (upTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // F) Volume score for C5
  let volumeScore5 = 0.0;
  if (volumeMultiple5 >= 0.8 && volumeMultiple5 < 1.2) {
    volumeScore5 = 0.25; // weak
  } else if (volumeMultiple5 >= 1.2 && volumeMultiple5 < 1.8) {
    volumeScore5 = 0.5; // medium
  } else if (volumeMultiple5 >= 1.8 && volumeMultiple5 < 2.5) {
    volumeScore5 = 0.75; // strong
  } else if (volumeMultiple5 >= 2.5) {
    volumeScore5 = 1.0; // very strong
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: c1StrengthScore, weight: 0.15 },
    { score: gapSizeScore, weight: 0.15 },
    { score: driftClusterScore, weight: 0.15 },
    { score: c5ReversalScore, weight: 0.25 },
    { score: trendScore, weight: 0.15 },
    { score: volumeScore5, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "BEARISH_BREAKAWAY",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      upTrendStrengthPct,
      gapSizePct,
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      bodyRatio4,
      bodyRatio5,
      penetrationC2Pct,
      penetrationC1Pct,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple5,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio5,
      upperWickRatio: parts5.upperShadowRatio,
      lowerWickRatio: parts5.lowerShadowRatio,
      volumeMultiple: volumeMultiple5,
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Upside Gap Two Crows Pattern (Three-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * Bearish reversal after an upside gap with two black candles
 * This pattern signals that an upside gap is being sold into by two consecutive bearish candles
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectUpsideGapTwoCrows(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 3 candles (C1, C2, C3)
  if (!candles || index < 2 || index >= candles.length) {
    return null;
  }

  // Three candles: C1 = n-2, C2 = n-1, C3 = n
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;

  // Color checks
  const isBullish1 = c1.close > c1.open;
  const isBearish2 = c2.close < c2.open;
  const isBearish3 = c3.close < c3.open;

  // Gap calculation (C1 to C2 - gap up)
  const gapSizePct = c2.open > c1.high ? ((c2.open - c1.high) / c1.high) * 100 : 0;
  const gapExists = c2.open > c1.high;

  // C3 position checks
  const open3AboveClose2 = c3.open >= c2.close;
  const close3AboveOpen1 = c3.close > c1.open;
  const close3BelowClose1 = c3.close < c1.close;

  // C3 penetration into C1 body
  const c1BodyLow = Math.min(c1.open, c1.close);
  const c1BodyHigh = Math.max(c1.open, c1.close);
  const c1BodySize = c1BodyHigh - c1BodyLow;
  const penetrationPct = c1BodySize > 0 ? (c1BodyHigh - c3.close) / c1BodySize : 0;

  // Calculate uptrend strength (before C1)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 2, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple3 = calculateVolumeMultiple(c3, avgVolume20);

  // Distance to resistance (based on high_2 or local swing high)
  const patternHigh = Math.max(c1.high, c2.high, c3.high);
  const distanceToResistance =
    context.nearestResistance !== undefined
      ? (Math.abs(context.nearestResistance - patternHigh) / patternHigh) * 100
      : 100.0;

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: strong bullish candle
  const c1Condition = isBullish1 && bodyRatio1 >= 0.45;

  // B) C2: bearish with gap up
  const c2Condition = isBearish2 && gapExists && bodyRatio2 >= 0.2 && bodyRatio2 <= 0.5;

  // C) C3: bearish candle that opens above C2 but closes into the body of C1
  const c3Condition = isBearish3 && open3AboveClose2 && close3AboveOpen1 && close3BelowClose1;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition) {
    return {
      index,
      pattern: "UPSIDE_GAP_TWO_CROWS",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        gapSizePct,
        penetrationPct,
        upTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple3,
        distanceToResistancePct: distanceToResistance,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio3,
        upperWickRatio: parts3.upperShadowRatio,
        lowerWickRatio: parts3.lowerShadowRatio,
        volumeMultiple: volumeMultiple3,
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: distanceToResistance,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 bullish strength score
  let c1StrengthScore = 0.0;
  if (bodyRatio1 >= 0.45 && bodyRatio1 < 0.55) {
    c1StrengthScore = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    c1StrengthScore = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    c1StrengthScore = 1.0; // very strong
  }

  // B) Gap size score
  let gapSizeScore = 0.0;
  if (gapSizePct < 0.1) {
    gapSizeScore = 0.25; // weak
  } else if (gapSizePct >= 0.1 && gapSizePct < 0.25) {
    gapSizeScore = 0.5; // medium
  } else if (gapSizePct >= 0.25 && gapSizePct < 0.5) {
    gapSizeScore = 0.75; // strong
  } else if (gapSizePct >= 0.5) {
    gapSizeScore = 1.0; // very strong
  }

  // C) Bear structure C2-C3 (downClusterScore)
  let downClusterScore = 0.0;
  if (isBearish2 && isBearish3) {
    if (c3.close < c1.close && Math.abs(c3.close - c1.close) / c1.close > 0.005) {
      // Strong: both bearish and C3 closes significantly below C1 close
      downClusterScore = Math.min(1.0, 0.75 + (c1.close - c3.close) / (c1.close * 0.05));
    } else if (Math.abs(c3.close - c1.close) / c1.close <= 0.005) {
      // Medium: both bearish and C3 closes approximately at C1 close
      downClusterScore = 0.5;
    } else {
      // Weak: both bearish but C3 doesn't close below C1 close significantly
      downClusterScore = 0.25;
    }
  } else {
    downClusterScore = 0.25; // weak
  }

  // D) C3 penetration depth into C1 body
  let penetrationScore = 0.0;
  if (penetrationPct < 0.25) {
    penetrationScore = 0.25; // weak
  } else if (penetrationPct >= 0.25 && penetrationPct < 0.5) {
    penetrationScore = 0.5; // medium
  } else if (penetrationPct >= 0.5 && penetrationPct < 0.75) {
    penetrationScore = 0.75; // strong
  } else if (penetrationPct >= 0.75) {
    penetrationScore = 1.0; // very strong
  }

  // E) Trend context score (uptrend)
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 1.0 && upTrendStrengthPct < 3.0) {
    trendScore = 0.25; // weak context
  } else if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 6.0) {
    trendScore = 0.5; // medium context
  } else if (upTrendStrengthPct >= 6.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 6.0) / 10.0); // strong context, cap at 1.0
  }

  // F) Volume score (average of C2 and C3)
  let volumeScore2 = 0.0;
  if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore2 = 0.25; // weak
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore2 = 0.5; // medium
  } else if (volumeMultiple2 >= 1.8 && volumeMultiple2 < 2.5) {
    volumeScore2 = 0.75; // strong
  } else if (volumeMultiple2 >= 2.5) {
    volumeScore2 = 1.0; // very strong
  }

  let volumeScore3 = 0.0;
  if (volumeMultiple3 >= 0.8 && volumeMultiple3 < 1.2) {
    volumeScore3 = 0.25; // weak
  } else if (volumeMultiple3 >= 1.2 && volumeMultiple3 < 1.8) {
    volumeScore3 = 0.5; // medium
  } else if (volumeMultiple3 >= 1.8 && volumeMultiple3 < 2.5) {
    volumeScore3 = 0.75; // strong
  } else if (volumeMultiple3 >= 2.5) {
    volumeScore3 = 1.0; // very strong
  }

  const volumeScore2_3 = (volumeScore2 + volumeScore3) / 2;

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: c1StrengthScore, weight: 0.2 },
    { score: gapSizeScore, weight: 0.2 },
    { score: downClusterScore, weight: 0.2 },
    { score: penetrationScore, weight: 0.2 },
    { score: trendScore, weight: 0.1 },
    { score: volumeScore2_3, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "UPSIDE_GAP_TWO_CROWS",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      gapSizePct,
      penetrationPct,
      upTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple3,
      distanceToResistancePct: distanceToResistance,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio3,
      upperWickRatio: parts3.upperShadowRatio,
      lowerWickRatio: parts3.lowerShadowRatio,
      volumeMultiple: volumeMultiple3,
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: distanceToResistance,
    },
  };
}

/**
 * Detect Downside Gap Three Methods Pattern (Four-Candle Pattern)
 * Classification: Continuation, Direction: SHORT
 * Bearish continuation pattern: gap down + cluster + continuation
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectDownsideGapThreeMethods(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 4 candles (C1, C2, C3, C4)
  if (!candles || index < 3 || index >= candles.length) {
    return null;
  }

  // Four candles: C1 = n-3, C2 = n-2, C3 = n-1, C4 = n
  const c1 = candles[index - 3];
  const c2 = candles[index - 2];
  const c3 = candles[index - 1];
  const c4 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low || c4.high === c4.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);
  const parts4 = getCandleParts(c4);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;
  const bodyRatio4 = parts4.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBearish2 = c2.close < c2.open;
  const isBearish4 = c4.close < c4.open;

  // Gap calculation (C1 to C2 - gap down)
  const gapSizePct = c2.open < c1.low ? ((c1.low - c2.open) / c1.low) * 100 : 0;
  const gapExists = c2.open < c1.low;

  // C3 position checks (inside gap area)
  const c3HighBelowOpen1 = c3.high <= c1.low;
  const c3LowAboveLow2 = c3.low >= c2.low;

  // C4 continuation check
  const c4Continuation = c4.close < c2.close;

  // Cluster quality (C3 range relative to C2 range)
  const c3Range = c3.high - c3.low;
  const c2Range = c2.high - c2.low;
  const clusterRangePct = c2Range > 0 ? c3Range / c2Range : 1.0;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 3, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple4 = calculateVolumeMultiple(c4, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: bearish with solid body
  const c1Condition = isBearish1 && bodyRatio1 >= 0.35;

  // B) C2: bearish with downside gap
  const c2Condition = isBearish2 && gapExists && bodyRatio2 >= 0.35;

  // C) C3: small candle inside C2-C1 gap area
  const c3Condition = bodyRatio3 <= 0.35 && c3HighBelowOpen1 && c3LowAboveLow2;

  // D) C4: bearish continuation candle
  const c4Condition = isBearish4 && bodyRatio4 >= 0.35 && c4Continuation;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition || !c4Condition) {
    return {
      index,
      pattern: "DOWNSIDE_GAP_THREE_METHODS",
      category: "CONTINUATION",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        downTrendStrengthPct,
        gapSizePct,
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        bodyRatio4,
        clusterRangePct,
        volumeMultiple2,
        volumeMultiple4,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio4,
        upperWickRatio: parts4.upperShadowRatio,
        lowerWickRatio: parts4.lowerShadowRatio,
        volumeMultiple: volumeMultiple4,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Trend context score (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // B) Gap size score
  let gapSizeScore = 0.0;
  if (gapSizePct < 0.1) {
    gapSizeScore = 0.25; // weak
  } else if (gapSizePct >= 0.1 && gapSizePct < 0.25) {
    gapSizeScore = 0.5; // medium
  } else if (gapSizePct >= 0.25 && gapSizePct < 0.5) {
    gapSizeScore = 0.75; // strong
  } else if (gapSizePct >= 0.5) {
    gapSizeScore = 1.0; // very strong
  }

  // C) Cluster tightness score (C3)
  let clusterTightScore = 0.0;
  if (clusterRangePct > 1.0) {
    clusterTightScore = 0.0; // invalid
  } else if (clusterRangePct >= 0.6 && clusterRangePct <= 1.0) {
    clusterTightScore = 0.25; // weak
  } else if (clusterRangePct >= 0.35 && clusterRangePct < 0.6) {
    clusterTightScore = 0.5; // medium
  } else if (clusterRangePct >= 0.15 && clusterRangePct < 0.35) {
    clusterTightScore = 0.75; // strong
  } else if (clusterRangePct < 0.15) {
    clusterTightScore = 1.0; // very strong
  }

  // D) C2 bearish strength score
  let bearStrengthC2 = 0.0;
  if (bodyRatio2 >= 0.35 && bodyRatio2 < 0.5) {
    bearStrengthC2 = 0.5; // medium
  } else if (bodyRatio2 >= 0.5 && bodyRatio2 < 0.7) {
    bearStrengthC2 = 0.75; // strong
  } else if (bodyRatio2 >= 0.7) {
    bearStrengthC2 = 1.0; // very strong
  }

  // E) C4 bearish strength score
  let bearStrengthC4 = 0.0;
  if (bodyRatio4 >= 0.35 && bodyRatio4 < 0.5) {
    bearStrengthC4 = 0.5; // medium
  } else if (bodyRatio4 >= 0.5 && bodyRatio4 < 0.7) {
    bearStrengthC4 = 0.75; // strong
  } else if (bodyRatio4 >= 0.7) {
    bearStrengthC4 = 1.0; // very strong
  }

  // F) Volume score (average of C2 and C4)
  let volumeScore2 = 0.0;
  if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScore2 = 0.25; // weak
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore2 = 0.5; // medium
  } else if (volumeMultiple2 >= 1.8 && volumeMultiple2 < 2.5) {
    volumeScore2 = 0.75; // strong
  } else if (volumeMultiple2 >= 2.5) {
    volumeScore2 = 1.0; // very strong
  }

  let volumeScore4 = 0.0;
  if (volumeMultiple4 >= 0.8 && volumeMultiple4 < 1.2) {
    volumeScore4 = 0.25; // weak
  } else if (volumeMultiple4 >= 1.2 && volumeMultiple4 < 1.8) {
    volumeScore4 = 0.5; // medium
  } else if (volumeMultiple4 >= 1.8 && volumeMultiple4 < 2.5) {
    volumeScore4 = 0.75; // strong
  } else if (volumeMultiple4 >= 2.5) {
    volumeScore4 = 1.0; // very strong
  }

  const volumeScore24 = (volumeScore2 + volumeScore4) / 2;

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: trendScore, weight: 0.2 },
    { score: gapSizeScore, weight: 0.2 },
    { score: clusterTightScore, weight: 0.2 },
    { score: bearStrengthC2, weight: 0.15 },
    { score: bearStrengthC4, weight: 0.15 },
    { score: volumeScore24, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "DOWNSIDE_GAP_THREE_METHODS",
    category: "CONTINUATION",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      downTrendStrengthPct,
      gapSizePct,
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      bodyRatio4,
      clusterRangePct,
      volumeMultiple2,
      volumeMultiple4,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio4,
      upperWickRatio: parts4.upperShadowRatio,
      lowerWickRatio: parts4.lowerShadowRatio,
      volumeMultiple: volumeMultiple4,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect On-Neck Pattern (Two-Candle Pattern)
 * Classification: Continuation, Direction: SHORT (WEAK)
 * Weak bearish continuation: long black + small white closing near prior low
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectOnNeck(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (C1, C2)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Two candles: C1 = n-1, C2 = n
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBullish2 = c2.close > c2.open;

  // Neck touch calculation (C2 close near C1 low)
  const neckDiffPct = (Math.abs(c2.close - c1.low) / c1.low) * 100;

  // C2 low position check (should be below or near C1 low)
  const low2Condition = c2.low <= c1.low * 1.0015; // allow 0.15% tolerance

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: long bearish
  const c1Condition = isBearish1 && bodyRatio1 >= 0.45;

  // B) C2: small bullish
  const c2Condition = isBullish2 && bodyRatio2 <= 0.35;

  // C) Close of C2 near low of C1
  const neckCondition = neckDiffPct <= 0.3;

  // D) C2 low must be below or near C1 low
  const lowCondition = low2Condition;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !neckCondition || !lowCondition) {
    return {
      index,
      pattern: "ON_NECK",
      category: "CONTINUATION",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        neckDiffPct,
        downTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple2,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio2,
        upperWickRatio: parts2.upperShadowRatio,
        lowerWickRatio: parts2.lowerShadowRatio,
        volumeMultiple: volumeMultiple2,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 bearish strength score
  let bearStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.45 && bodyRatio1 < 0.55) {
    bearStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bearStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bearStrengthC1 = 1.0; // very strong
  }

  // B) C2 small body score (smaller is better)
  let smallBodyScoreC2 = 0.0;
  if (bodyRatio2 <= 0.35 && bodyRatio2 > 0.25) {
    smallBodyScoreC2 = 0.5; // medium
  } else if (bodyRatio2 <= 0.25 && bodyRatio2 > 0.15) {
    smallBodyScoreC2 = 0.75; // strong
  } else if (bodyRatio2 <= 0.15) {
    smallBodyScoreC2 = 1.0; // very strong
  } else {
    smallBodyScoreC2 = 0.25; // weak
  }

  // C) Neck touch score
  let neckTouchScore = 0.0;
  if (neckDiffPct > 0.3) {
    neckTouchScore = 0.0; // invalid (already filtered)
  } else if (neckDiffPct >= 0.2 && neckDiffPct <= 0.3) {
    neckTouchScore = 0.25; // weak
  } else if (neckDiffPct >= 0.1 && neckDiffPct < 0.2) {
    neckTouchScore = 0.5; // medium
  } else if (neckDiffPct >= 0.05 && neckDiffPct < 0.1) {
    neckTouchScore = 0.75; // strong
  } else if (neckDiffPct < 0.05) {
    neckTouchScore = 1.0; // very strong
  }

  // D) Trend context score (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // E) Volume score (C1 > avg; C2 <= avg)
  let volumeScoreC1 = 0.0;
  if (volumeMultiple1 >= 0.8 && volumeMultiple1 < 1.2) {
    volumeScoreC1 = 0.5; // medium
  } else if (volumeMultiple1 >= 1.2 && volumeMultiple1 < 1.8) {
    volumeScoreC1 = 0.75; // strong
  } else if (volumeMultiple1 >= 1.8) {
    volumeScoreC1 = 1.0; // very strong
  } else {
    volumeScoreC1 = 0.25; // weak
  }

  let volumeScoreC2 = 0.0;
  // For C2, lower volume is better (weak attempt at bounce)
  if (volumeMultiple2 <= 1.0 && volumeMultiple2 >= 0.7) {
    volumeScoreC2 = 1.0; // very strong - low volume bounce
  } else if (volumeMultiple2 <= 1.2 && volumeMultiple2 > 1.0) {
    volumeScoreC2 = 0.75; // strong - moderate volume
  } else if (volumeMultiple2 <= 1.5 && volumeMultiple2 > 1.2) {
    volumeScoreC2 = 0.5; // medium
  } else {
    volumeScoreC2 = 0.25; // weak - high volume bounce (unusual)
  }

  // Combined volume score (weighted: C1 strong + C2 weak = good)
  const volumeScore = volumeScoreC1 * 0.6 + volumeScoreC2 * 0.4;

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bearStrengthC1, weight: 0.3 },
    { score: smallBodyScoreC2, weight: 0.15 },
    { score: neckTouchScore, weight: 0.2 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK (Lower threshold because it's a weaker continuation pattern)
  // =========================
  const isPattern = strength >= 0.5;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "ON_NECK",
    category: "CONTINUATION",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      neckDiffPct,
      downTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple2,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio2,
      upperWickRatio: parts2.upperShadowRatio,
      lowerWickRatio: parts2.lowerShadowRatio,
      volumeMultiple: volumeMultiple2,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect In-Neck Pattern (Two-Candle Pattern)
 * Classification: Continuation, Direction: SHORT (WEAK-MEDIUM)
 * Variation of On-Neck: white candle closes slightly INTO prior black body
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectInNeck(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (C1, C2)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Two candles: C1 = n-1, C2 = n
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBullish2 = c2.close > c2.open;

  // C2 close position relative to C1
  // According to spec: close_2 > low_1 and close_2 < low_1 + 0.5 * (open_1 - low_1)
  const c1Range = c1.open - c1.low; // range from open to low
  const close2AboveLow1 = c2.close > c1.low;
  const close2InLowerHalf = c1Range > 0 && c2.close < c1.low + 0.5 * c1Range;

  // Close position percentage: (close_2 - low_1) / (open_1 - low_1)
  const closePosPctInBody = c1Range > 0 ? (c2.close - c1.low) / c1Range : 1.0;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: long bearish
  const c1Condition = isBearish1 && bodyRatio1 >= 0.45;

  // B) C2: small bullish
  const c2Condition = isBullish2 && bodyRatio2 <= 0.35;

  // C) C2 close is slightly above C1 low but still in lower part of C1 body
  const positionCondition =
    close2AboveLow1 && close2InLowerHalf && closePosPctInBody > 0 && closePosPctInBody <= 0.5;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !positionCondition) {
    return {
      index,
      pattern: "IN_NECK",
      category: "CONTINUATION",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        closePosPctInBody,
        downTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple2,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio2,
        upperWickRatio: parts2.upperShadowRatio,
        lowerWickRatio: parts2.lowerShadowRatio,
        volumeMultiple: volumeMultiple2,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 bearish strength score
  let bearStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.45 && bodyRatio1 < 0.55) {
    bearStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bearStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bearStrengthC1 = 1.0; // very strong
  }

  // B) C2 small body score (smaller is better)
  let smallBodyScoreC2 = 0.0;
  if (bodyRatio2 <= 0.35 && bodyRatio2 > 0.25) {
    smallBodyScoreC2 = 0.5; // medium
  } else if (bodyRatio2 <= 0.25 && bodyRatio2 > 0.15) {
    smallBodyScoreC2 = 0.75; // strong
  } else if (bodyRatio2 <= 0.15) {
    smallBodyScoreC2 = 1.0; // very strong
  } else {
    smallBodyScoreC2 = 0.25; // weak
  }

  // C) Close position score (lower in body = better)
  let closePosScore = 0.0;
  if (closePosPctInBody > 0.5) {
    closePosScore = 0.0; // invalid or weak (already filtered)
  } else if (closePosPctInBody >= 0.25 && closePosPctInBody <= 0.5) {
    closePosScore = 0.5; // medium
  } else if (closePosPctInBody >= 0 && closePosPctInBody < 0.25) {
    closePosScore = Math.min(1.0, 0.75 + (0.25 - closePosPctInBody) * 1.0); // very strong, cap at 1.0
  }

  // D) Trend context score (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // E) Volume score (C1 > avg; C2 <= avg)
  let volumeScoreC1 = 0.0;
  if (volumeMultiple1 >= 0.8 && volumeMultiple1 < 1.2) {
    volumeScoreC1 = 0.5; // medium
  } else if (volumeMultiple1 >= 1.2 && volumeMultiple1 < 1.8) {
    volumeScoreC1 = 0.75; // strong
  } else if (volumeMultiple1 >= 1.8) {
    volumeScoreC1 = 1.0; // very strong
  } else {
    volumeScoreC1 = 0.25; // weak
  }

  let volumeScoreC2 = 0.0;
  // For C2, lower volume is better (weak attempt at bounce)
  if (volumeMultiple2 <= 1.0 && volumeMultiple2 >= 0.7) {
    volumeScoreC2 = 1.0; // very strong - low volume bounce
  } else if (volumeMultiple2 <= 1.2 && volumeMultiple2 > 1.0) {
    volumeScoreC2 = 0.75; // strong - moderate volume
  } else if (volumeMultiple2 <= 1.5 && volumeMultiple2 > 1.2) {
    volumeScoreC2 = 0.5; // medium
  } else {
    volumeScoreC2 = 0.25; // weak - high volume bounce (unusual)
  }

  // Combined volume score (weighted: C1 strong + C2 weak = good)
  const volumeScore = volumeScoreC1 * 0.6 + volumeScoreC2 * 0.4;

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bearStrengthC1, weight: 0.3 },
    { score: smallBodyScoreC2, weight: 0.15 },
    { score: closePosScore, weight: 0.2 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.5;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "IN_NECK",
    category: "CONTINUATION",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      closePosPctInBody,
      downTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple2,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio2,
      upperWickRatio: parts2.upperShadowRatio,
      lowerWickRatio: parts2.lowerShadowRatio,
      volumeMultiple: volumeMultiple2,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Thrusting Pattern (Two-Candle Pattern)
 * Classification: Continuation, Direction: SHORT (MEDIUM)
 * Bearish continuation where second candle closes into the black body but not above midpoint
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectThrusting(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (C1, C2)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Two candles: C1 = n-1, C2 = n
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBullish2 = c2.close > c2.open;

  // C1 body boundaries and midpoint
  const c1BodyLow = Math.min(c1.open, c1.close);
  const c1BodyHigh = Math.max(c1.open, c1.close);
  const c1Mid = (c1.open + c1.close) / 2;

  // Gap down condition
  const gapDownExists = c2.open < c1.low;

  // C2 close position relative to C1
  const close2AboveLow1 = c2.close > c1.low;
  const close2BelowMid = c2.close < c1Mid;

  // Penetration percentage: (close_2 - low_1) / (C1_mid - low_1)
  const c1MidToLow = c1Mid - c1.low;
  const penetrationPct = c1MidToLow > 0 ? (c2.close - c1.low) / c1MidToLow : 1.0;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: long bearish
  const c1Condition = isBearish1 && bodyRatio1 >= 0.45;

  // B) C2: bullish with gap down at open, body size between 0.25-0.50
  const c2Condition = isBullish2 && gapDownExists && bodyRatio2 >= 0.25 && bodyRatio2 <= 0.5;

  // C) C2 close penetrates into lower half of C1 body but not above midpoint
  const penetrationCondition = close2AboveLow1 && close2BelowMid && penetrationPct <= 1.0;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !penetrationCondition) {
    return {
      index,
      pattern: "THRUSTING",
      category: "CONTINUATION",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        penetrationPct,
        downTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple2,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio2,
        upperWickRatio: parts2.upperShadowRatio,
        lowerWickRatio: parts2.lowerShadowRatio,
        volumeMultiple: volumeMultiple2,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 bearish strength score
  let bearStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.45 && bodyRatio1 < 0.55) {
    bearStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.55 && bodyRatio1 < 0.7) {
    bearStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.7) {
    bearStrengthC1 = 1.0; // very strong
  }

  // B) C2 body size score (within range 0.25-0.50)
  let bodySizeC2Score = 0.0;
  if (bodyRatio2 >= 0.25 && bodyRatio2 < 0.3) {
    bodySizeC2Score = 0.5; // medium (low end of range)
  } else if (bodyRatio2 >= 0.3 && bodyRatio2 < 0.4) {
    bodySizeC2Score = 0.75; // strong (middle range)
  } else if (bodyRatio2 >= 0.4 && bodyRatio2 <= 0.5) {
    bodySizeC2Score = 1.0; // very strong (upper end of range)
  } else {
    bodySizeC2Score = 0.25; // weak (outside ideal range)
  }

  // C) Penetration score
  let penetrationScore = 0.0;
  if (penetrationPct > 1.0) {
    penetrationScore = 0.0; // invalid (overshoot beyond mid)
  } else if (penetrationPct >= 0 && penetrationPct < 0.25) {
    penetrationScore = 0.25; // weak
  } else if (penetrationPct >= 0.25 && penetrationPct < 0.5) {
    penetrationScore = 0.5; // medium
  } else if (penetrationPct >= 0.5 && penetrationPct <= 1.0) {
    penetrationScore = 0.75 + (penetrationPct - 0.5) * 0.5; // strong to very strong, cap at 1.0
  }

  // D) Trend context score (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // E) Volume score for C2 (penalize if very high - indicates stronger counter-trend)
  let volumeScoreC2 = 0.0;
  if (volumeMultiple2 >= 0.8 && volumeMultiple2 < 1.2) {
    volumeScoreC2 = 0.75; // good - moderate volume
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScoreC2 = 0.5; // medium - elevated but ok
  } else if (volumeMultiple2 >= 1.8 && volumeMultiple2 < 2.0) {
    volumeScoreC2 = 0.25; // weak - high volume (may indicate stronger counter-trend)
  } else if (volumeMultiple2 >= 2.0) {
    volumeScoreC2 = 0.0; // very weak - very high volume (strong counter-trend signal)
  } else {
    volumeScoreC2 = 0.5; // medium - low volume
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bearStrengthC1, weight: 0.25 },
    { score: bodySizeC2Score, weight: 0.15 },
    { score: penetrationScore, weight: 0.25 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScoreC2, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "THRUSTING",
    category: "CONTINUATION",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      penetrationPct,
      downTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple2,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio2,
      upperWickRatio: parts2.upperShadowRatio,
      lowerWickRatio: parts2.lowerShadowRatio,
      volumeMultiple: volumeMultiple2,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Matching Low Pattern (Two-Candle Pattern)
 * Classification: Reversal/Support Test, Direction: LONG (WEAK-MEDIUM)
 * Two black candles with very similar lows → potential support
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectMatchingLow(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 2 candles (C1, C2)
  if (!candles || index < 1 || index >= candles.length) {
    return null;
  }

  // Two candles: C1 = n-1, C2 = n
  const c1 = candles[index - 1];
  const c2 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBearishOrDoji2 = c2.close <= c2.open; // bearish or doji-like

  // Low difference percentage
  const minLow = Math.min(c1.low, c2.low);
  const lowDiffPct = minLow > 0 ? (Math.abs(c2.low - c1.low) / minLow) * 100 : 100.0;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 1, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1: bearish
  const c1Condition = isBearish1 && bodyRatio1 >= 0.3;

  // B) C2: bearish or doji-like
  const c2Condition = isBearishOrDoji2 && bodyRatio2 <= 0.5;

  // C) Lows of C1 and C2 nearly equal
  const lowMatchCondition = lowDiffPct <= 0.3;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !lowMatchCondition) {
    return {
      index,
      pattern: "MATCHING_LOW",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        lowDiffPct,
        downTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple2,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio2,
        upperWickRatio: parts2.upperShadowRatio,
        lowerWickRatio: parts2.lowerShadowRatio,
        volumeMultiple: volumeMultiple2,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Trend context score (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // B) C1 bearish strength score
  let bearStrengthC1 = 0.0;
  if (bodyRatio1 >= 0.3 && bodyRatio1 < 0.4) {
    bearStrengthC1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.4 && bodyRatio1 < 0.55) {
    bearStrengthC1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.55) {
    bearStrengthC1 = 1.0; // very strong
  } else {
    bearStrengthC1 = 0.25; // weak
  }

  // C) Low match score
  let lowMatchScore = 0.0;
  if (lowDiffPct > 0.3) {
    lowMatchScore = 0.0; // invalid (already filtered)
  } else if (lowDiffPct >= 0.2 && lowDiffPct <= 0.3) {
    lowMatchScore = 0.25; // weak
  } else if (lowDiffPct >= 0.1 && lowDiffPct < 0.2) {
    lowMatchScore = 0.5; // medium
  } else if (lowDiffPct >= 0.05 && lowDiffPct < 0.1) {
    lowMatchScore = 0.75; // strong
  } else if (lowDiffPct < 0.05) {
    lowMatchScore = 1.0; // very strong
  }

  // D) Volume score for C2
  let volumeScore2 = 0.0;
  // If C2 volume is not extreme, pattern is cleaner
  // Rising volume on C2 may indicate capitulation (can be positive)
  if (volumeMultiple2 >= 0.7 && volumeMultiple2 < 1.2) {
    volumeScore2 = 0.75; // good - moderate volume
  } else if (volumeMultiple2 >= 1.2 && volumeMultiple2 < 1.8) {
    volumeScore2 = 0.5; // medium - elevated (may indicate capitulation)
  } else if (volumeMultiple2 >= 1.8 && volumeMultiple2 < 2.5) {
    volumeScore2 = 0.75; // strong - high volume (capitulation signal)
  } else if (volumeMultiple2 >= 2.5) {
    volumeScore2 = 1.0; // very strong - very high volume (strong capitulation)
  } else {
    volumeScore2 = 0.5; // medium - low volume
  }

  // E) C2 body score (smaller is better for support test)
  let bodyScore2 = 0.0;
  if (bodyRatio2 <= 0.5 && bodyRatio2 > 0.35) {
    bodyScore2 = 0.5; // medium
  } else if (bodyRatio2 <= 0.35 && bodyRatio2 > 0.2) {
    bodyScore2 = 0.75; // strong
  } else if (bodyRatio2 <= 0.2) {
    bodyScore2 = 1.0; // very strong (doji-like or very small)
  } else {
    bodyScore2 = 0.25; // weak
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: trendScore, weight: 0.25 },
    { score: bearStrengthC1, weight: 0.2 },
    { score: lowMatchScore, weight: 0.3 },
    { score: volumeScore2, weight: 0.15 },
    { score: bodyScore2, weight: 0.1 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.5;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "MATCHING_LOW",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      lowDiffPct,
      downTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple2,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio2,
      upperWickRatio: parts2.upperShadowRatio,
      lowerWickRatio: parts2.lowerShadowRatio,
      volumeMultiple: volumeMultiple2,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Stick Sandwich Pattern (Three-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * Bullish reversal: two bullish candles sandwiching a bearish candle with matching closes
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectStickSandwich(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 3 candles (C1, C2, C3)
  if (!candles || index < 2 || index >= candles.length) {
    return null;
  }

  // Three candles: C1 = n-2, C2 = n-1, C3 = n
  const c1 = candles[index - 2];
  const c2 = candles[index - 1];
  const c3 = candles[index];

  // Validate candles
  if (c1.high === c1.low || c2.high === c2.low || c3.high === c3.low) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;

  // Color checks
  const isBullish1 = c1.close > c1.open;
  const isBearish2 = c2.close < c2.open;
  const isBullish3 = c3.close > c3.open;

  // Close match calculation
  const avgClose = (c1.close + c3.close) / 2;
  const closeMatchPct = avgClose > 0 ? (Math.abs(c3.close - c1.close) / avgClose) * 100 : 100.0;

  // Crucial stick sandwich condition: closes of C1 and C3 almost equal and lower than C2 close
  const close1BelowClose2 = c1.close < c2.close;
  const close3BelowClose2 = c3.close < c2.close;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 2, 8);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple3 = calculateVolumeMultiple(c3, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1 bullish
  const c1Condition = isBullish1 && bodyRatio1 >= 0.35;

  // B) C2 bearish
  const c2Condition = isBearish2 && bodyRatio2 >= 0.35;

  // C) C3 bullish
  const c3Condition = isBullish3 && bodyRatio3 >= 0.35;

  // D) Crucial stick sandwich condition
  const sandwichCondition = closeMatchPct <= 0.3 && close1BelowClose2 && close3BelowClose2;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition || !sandwichCondition) {
    return {
      index,
      pattern: "STICK_SANDWICH",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        closeMatchPct,
        downTrendStrengthPct,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple3,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio3,
        upperWickRatio: parts3.upperShadowRatio,
        lowerWickRatio: parts3.lowerShadowRatio,
        volumeMultiple: volumeMultiple3,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) C1 body score
  let bodyScore1 = 0.0;
  if (bodyRatio1 >= 0.35 && bodyRatio1 < 0.45) {
    bodyScore1 = 0.5; // medium
  } else if (bodyRatio1 >= 0.45 && bodyRatio1 < 0.6) {
    bodyScore1 = 0.75; // strong
  } else if (bodyRatio1 >= 0.6) {
    bodyScore1 = 1.0; // very strong
  } else {
    bodyScore1 = 0.25; // weak
  }

  // B) C2 body score
  let bodyScore2 = 0.0;
  if (bodyRatio2 >= 0.35 && bodyRatio2 < 0.45) {
    bodyScore2 = 0.5; // medium
  } else if (bodyRatio2 >= 0.45 && bodyRatio2 < 0.6) {
    bodyScore2 = 0.75; // strong
  } else if (bodyRatio2 >= 0.6) {
    bodyScore2 = 1.0; // very strong
  } else {
    bodyScore2 = 0.25; // weak
  }

  // C) C3 body score
  let bodyScore3 = 0.0;
  if (bodyRatio3 >= 0.35 && bodyRatio3 < 0.45) {
    bodyScore3 = 0.5; // medium
  } else if (bodyRatio3 >= 0.45 && bodyRatio3 < 0.6) {
    bodyScore3 = 0.75; // strong
  } else if (bodyRatio3 >= 0.6) {
    bodyScore3 = 1.0; // very strong
  } else {
    bodyScore3 = 0.25; // weak
  }

  // D) Close match score
  let closeMatchScore = 0.0;
  if (closeMatchPct > 0.3) {
    closeMatchScore = 0.0; // invalid (already filtered)
  } else if (closeMatchPct >= 0.2 && closeMatchPct <= 0.3) {
    closeMatchScore = 0.25; // weak
  } else if (closeMatchPct >= 0.1 && closeMatchPct < 0.2) {
    closeMatchScore = 0.5; // medium
  } else if (closeMatchPct >= 0.05 && closeMatchPct < 0.1) {
    closeMatchScore = 0.75; // strong
  } else if (closeMatchPct < 0.05) {
    closeMatchScore = 1.0; // very strong
  }

  // E) Trend context score (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 2.0 && downTrendStrengthPct < 4.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 4.0 && downTrendStrengthPct < 7.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 7.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 7.0) / 10.0); // strong, cap at 1.0
  }

  // F) Volume score for C3 (ideally > avg and not smaller than C1)
  let volumeScore3 = 0.0;
  if (volumeMultiple3 >= 0.8 && volumeMultiple3 < 1.2) {
    volumeScore3 = 0.5; // medium
  } else if (volumeMultiple3 >= 1.2 && volumeMultiple3 < 1.8) {
    volumeScore3 = 0.75; // strong
  } else if (volumeMultiple3 >= 1.8) {
    volumeScore3 = 1.0; // very strong
  } else {
    // If C3 volume is smaller than C1, penalize
    if (volumeMultiple3 < volumeMultiple1) {
      volumeScore3 = 0.25; // weak - lower than C1
    } else {
      volumeScore3 = 0.5; // medium - low but not worse than C1
    }
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: bodyScore1, weight: 0.15 },
    { score: bodyScore2, weight: 0.1 },
    { score: bodyScore3, weight: 0.15 },
    { score: closeMatchScore, weight: 0.25 },
    { score: trendScore, weight: 0.2 },
    { score: volumeScore3, weight: 0.15 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "STICK_SANDWICH",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      closeMatchPct,
      downTrendStrengthPct,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple3,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio3,
      upperWickRatio: parts3.upperShadowRatio,
      lowerWickRatio: parts3.lowerShadowRatio,
      volumeMultiple: volumeMultiple3,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Ladder Bottom Pattern (Five-Candle Pattern)
 * Classification: Reversal, Direction: LONG
 * 5-candle bullish reversal after downtrend
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectLadderBottom(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 5 candles (C1, C2, C3, C4, C5)
  if (!candles || index < 4 || index >= candles.length) {
    return null;
  }

  // Five candles: C1 = n-4, C2 = n-3, C3 = n-2, C4 = n-1, C5 = n
  const c1 = candles[index - 4];
  const c2 = candles[index - 3];
  const c3 = candles[index - 2];
  const c4 = candles[index - 1];
  const c5 = candles[index];

  // Validate candles
  if (
    c1.high === c1.low ||
    c2.high === c2.low ||
    c3.high === c3.low ||
    c4.high === c4.low ||
    c5.high === c5.low
  ) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);
  const parts4 = getCandleParts(c4);
  const parts5 = getCandleParts(c5);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;
  const bodyRatio4 = parts4.bodyRatio;
  const bodyRatio5 = parts5.bodyRatio;

  // Color checks
  const isBearish1 = c1.close < c1.open;
  const isBearish2 = c2.close < c2.open;
  const isBearish3 = c3.close < c3.open;
  const isBullish5 = c5.close > c5.open;

  // Lower lows check for C1-C3
  const low2BelowLow1 = c2.low < c1.low;
  const low3BelowLow2 = c3.low < c2.low;

  // C5 recovery check
  const close5AboveClose4 = c5.close > c4.close;
  const c3BodyMid = (c3.open + c3.close) / 2;
  const close5AboveC3Mid = c5.close >= c3BodyMid;

  // Calculate downtrend strength (before C1)
  const downTrendStrengthPct = calculateDownTrendStrength(candles, index - 4, 10);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple3 = calculateVolumeMultiple(c3, avgVolume20);
  const volumeMultiple4 = calculateVolumeMultiple(c4, avgVolume20);
  const volumeMultiple5 = calculateVolumeMultiple(c5, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1-C3: three consecutive bearish candles making lower lows
  const c1Condition = isBearish1 && bodyRatio1 >= 0.3;
  const c2Condition = isBearish2 && bodyRatio2 >= 0.3 && low2BelowLow1;
  const c3Condition = isBearish3 && bodyRatio3 >= 0.3 && low3BelowLow2;

  // B) C4: small real body (doji/spinning top)
  const c4Condition = bodyRatio4 <= 0.25;

  // C) C5: strong bullish candle
  const c5Condition = isBullish5 && bodyRatio5 >= 0.4 && close5AboveClose4;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition || !c4Condition || !c5Condition) {
    return {
      index,
      pattern: "LADDER_BOTTOM",
      category: "REVERSAL",
      direction: "LONG",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        bodyRatio4,
        bodyRatio5,
        downTrendStrengthPct,
        stepDownScore: 0,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple3,
        volumeMultiple4,
        volumeMultiple5,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio5,
        upperWickRatio: parts5.upperShadowRatio,
        lowerWickRatio: parts5.lowerShadowRatio,
        volumeMultiple: volumeMultiple5,
        trendStrength: downTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Step down score for C1-C3
  let stepDownScore = 0.0;
  if (low2BelowLow1 && low3BelowLow2) {
    stepDownScore = 1.0; // perfect lower lows sequence
  } else if ((low2BelowLow1 && !low3BelowLow2) || (!low2BelowLow1 && low3BelowLow2)) {
    stepDownScore = 0.5; // two out of three
  } else {
    stepDownScore = 0.25; // weak sequence
  }

  // B) C4 indecision score (smaller body is better)
  let indecisionScoreC4 = 0.0;
  if (bodyRatio4 <= 0.25 && bodyRatio4 > 0.15) {
    indecisionScoreC4 = 0.5; // medium
  } else if (bodyRatio4 <= 0.15 && bodyRatio4 > 0.07) {
    indecisionScoreC4 = 0.75; // strong
  } else if (bodyRatio4 <= 0.07) {
    indecisionScoreC4 = 1.0; // very strong (doji-like)
  } else {
    indecisionScoreC4 = 0.25; // weak
  }

  // C) C5 reversal strength (combination of bodyRatio_5 & penetration into C3 body)
  let reversalScoreC5 = 0.0;

  // Body strength component
  let bodyStrengthC5 = 0.0;
  if (bodyRatio5 >= 0.4 && bodyRatio5 < 0.5) {
    bodyStrengthC5 = 0.5; // medium
  } else if (bodyRatio5 >= 0.5 && bodyRatio5 < 0.65) {
    bodyStrengthC5 = 0.75; // strong
  } else if (bodyRatio5 >= 0.65) {
    bodyStrengthC5 = 1.0; // very strong
  } else {
    bodyStrengthC5 = 0.25; // weak
  }

  // Penetration component (C5 close relative to C3 body)
  let penetrationScore = 0.0;
  if (close5AboveC3Mid) {
    penetrationScore = 1.0; // strong - closes above C3 midpoint
  } else {
    // Calculate how close we are to C3 midpoint
    const c3BodyRange = Math.abs(c3.open - c3.close);
    if (c3BodyRange > 0) {
      const distFromMid = Math.abs(c5.close - c3BodyMid);
      const penetrationPct = 1.0 - Math.min(1.0, distFromMid / c3BodyRange);
      penetrationScore = Math.max(0.25, penetrationPct); // at least 0.25 if close enough
    } else {
      penetrationScore = 0.5; // neutral
    }
  }

  // Combine body strength and penetration
  reversalScoreC5 = bodyStrengthC5 * 0.6 + penetrationScore * 0.4;

  // D) Trend context score (downtrend)
  let trendScore = 0.0;
  if (downTrendStrengthPct >= 3.0 && downTrendStrengthPct < 5.0) {
    trendScore = 0.25; // weak
  } else if (downTrendStrengthPct >= 5.0 && downTrendStrengthPct < 8.0) {
    trendScore = 0.5; // medium
  } else if (downTrendStrengthPct >= 8.0) {
    trendScore = Math.min(1.0, 0.75 + (downTrendStrengthPct - 8.0) / 10.0); // strong, cap at 1.0
  }

  // E) Volume score for C5 (high buying volume)
  let volumeScoreC5 = 0.0;
  if (volumeMultiple5 >= 0.8 && volumeMultiple5 < 1.2) {
    volumeScoreC5 = 0.5; // medium
  } else if (volumeMultiple5 >= 1.2 && volumeMultiple5 < 1.8) {
    volumeScoreC5 = 0.75; // strong
  } else if (volumeMultiple5 >= 1.8) {
    volumeScoreC5 = 1.0; // very strong
  } else {
    volumeScoreC5 = 0.25; // weak
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: trendScore, weight: 0.2 },
    { score: stepDownScore, weight: 0.2 },
    { score: indecisionScoreC4, weight: 0.15 },
    { score: reversalScoreC5, weight: 0.25 },
    { score: volumeScoreC5, weight: 0.2 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "LADDER_BOTTOM",
    category: "REVERSAL",
    direction: "LONG",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      bodyRatio4,
      bodyRatio5,
      downTrendStrengthPct,
      stepDownScore,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple3,
      volumeMultiple4,
      volumeMultiple5,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio5,
      upperWickRatio: parts5.upperShadowRatio,
      lowerWickRatio: parts5.lowerShadowRatio,
      volumeMultiple: volumeMultiple5,
      trendStrength: downTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}

/**
 * Detect Ladder Top Pattern (Five-Candle Pattern)
 * Classification: Reversal, Direction: SHORT
 * 5-candle bearish reversal after uptrend (mirror of Ladder Bottom)
 *
 * Returns CandlePattern object with standardized metrics and scoring
 */
export function detectLadderTop(context: PatternContext): CandlePattern | null {
  const { candles, index } = context;

  // Validate inputs - need at least 5 candles (C1, C2, C3, C4, C5)
  if (!candles || index < 4 || index >= candles.length) {
    return null;
  }

  // Five candles: C1 = n-4, C2 = n-3, C3 = n-2, C4 = n-1, C5 = n
  const c1 = candles[index - 4];
  const c2 = candles[index - 3];
  const c3 = candles[index - 2];
  const c4 = candles[index - 1];
  const c5 = candles[index];

  // Validate candles
  if (
    c1.high === c1.low ||
    c2.high === c2.low ||
    c3.high === c3.low ||
    c4.high === c4.low ||
    c5.high === c5.low
  ) {
    return null; // invalid candles
  }

  // =========================
  // 1. RAW METRICS CALCULATION
  // =========================

  // Candle parts for each candle
  const parts1 = getCandleParts(c1);
  const parts2 = getCandleParts(c2);
  const parts3 = getCandleParts(c3);
  const parts4 = getCandleParts(c4);
  const parts5 = getCandleParts(c5);

  const bodyRatio1 = parts1.bodyRatio;
  const bodyRatio2 = parts2.bodyRatio;
  const bodyRatio3 = parts3.bodyRatio;
  const bodyRatio4 = parts4.bodyRatio;
  const bodyRatio5 = parts5.bodyRatio;

  // Color checks
  const isBullish1 = c1.close > c1.open;
  const isBullish2 = c2.close > c2.open;
  const isBullish3 = c3.close > c3.open;
  const isBearish5 = c5.close < c5.open;

  // Higher highs check for C1-C3
  const high2AboveHigh1 = c2.high > c1.high;
  const high3AboveHigh2 = c3.high > c2.high;

  // C5 breakdown check
  const close5BelowClose4 = c5.close < c4.close;
  const c3BodyMid = (c3.open + c3.close) / 2;
  const close5BelowC3Mid = c5.close <= c3BodyMid;

  // Calculate uptrend strength (before C1)
  const upTrendStrengthPct = calculateUpTrendStrength(candles, index - 4, 10);

  // Volume calculations
  const avgVolume20 = context.volumeAverage ?? calculateAverageVolume(candles, index, 20);
  const volumeMultiple1 = calculateVolumeMultiple(c1, avgVolume20);
  const volumeMultiple2 = calculateVolumeMultiple(c2, avgVolume20);
  const volumeMultiple3 = calculateVolumeMultiple(c3, avgVolume20);
  const volumeMultiple4 = calculateVolumeMultiple(c4, avgVolume20);
  const volumeMultiple5 = calculateVolumeMultiple(c5, avgVolume20);

  // =========================
  // 2. BASIC STRUCTURAL CONDITIONS
  // =========================

  // A) C1-C3: three consecutive bullish candles making higher highs
  const c1Condition = isBullish1 && bodyRatio1 >= 0.3;
  const c2Condition = isBullish2 && bodyRatio2 >= 0.3 && high2AboveHigh1;
  const c3Condition = isBullish3 && bodyRatio3 >= 0.3 && high3AboveHigh2;

  // B) C4: small real body (doji/spinning top)
  const c4Condition = bodyRatio4 <= 0.25;

  // C) C5: strong bearish candle
  const c5Condition = isBearish5 && bodyRatio5 >= 0.4 && close5BelowClose4;

  // If any structural condition fails, return invalid
  if (!c1Condition || !c2Condition || !c3Condition || !c4Condition || !c5Condition) {
    return {
      index,
      pattern: "LADDER_TOP",
      category: "REVERSAL",
      direction: "SHORT",
      isPattern: false,
      strength: 0,
      metrics: {
        bodyRatio1,
        bodyRatio2,
        bodyRatio3,
        bodyRatio4,
        bodyRatio5,
        upTrendStrengthPct,
        stepUpScore: 0,
        volumeMultiple1,
        volumeMultiple2,
        volumeMultiple3,
        volumeMultiple4,
        volumeMultiple5,
        // Include standard interface metrics for compatibility
        bodyRatio: bodyRatio5,
        upperWickRatio: parts5.upperShadowRatio,
        lowerWickRatio: parts5.lowerShadowRatio,
        volumeMultiple: volumeMultiple5,
        trendStrength: upTrendStrengthPct,
        distanceToSRpct: 100.0,
      },
    };
  }

  // =========================
  // 3. QUALITY BAND SCORING
  // =========================

  // A) Step up score for C1-C3
  let stepUpScore = 0.0;
  if (high2AboveHigh1 && high3AboveHigh2) {
    stepUpScore = 1.0; // perfect higher highs sequence
  } else if ((high2AboveHigh1 && !high3AboveHigh2) || (!high2AboveHigh1 && high3AboveHigh2)) {
    stepUpScore = 0.5; // two out of three
  } else {
    stepUpScore = 0.25; // weak sequence
  }

  // B) C4 indecision score (smaller body is better)
  let indecisionScoreC4 = 0.0;
  if (bodyRatio4 <= 0.25 && bodyRatio4 > 0.15) {
    indecisionScoreC4 = 0.5; // medium
  } else if (bodyRatio4 <= 0.15 && bodyRatio4 > 0.07) {
    indecisionScoreC4 = 0.75; // strong
  } else if (bodyRatio4 <= 0.07) {
    indecisionScoreC4 = 1.0; // very strong (doji-like)
  } else {
    indecisionScoreC4 = 0.25; // weak
  }

  // C) C5 reversal strength (combination of bodyRatio_5 & breakdown into C3 body)
  let reversalScoreC5 = 0.0;

  // Body strength component
  let bodyStrengthC5 = 0.0;
  if (bodyRatio5 >= 0.4 && bodyRatio5 < 0.5) {
    bodyStrengthC5 = 0.5; // medium
  } else if (bodyRatio5 >= 0.5 && bodyRatio5 < 0.65) {
    bodyStrengthC5 = 0.75; // strong
  } else if (bodyRatio5 >= 0.65) {
    bodyStrengthC5 = 1.0; // very strong
  } else {
    bodyStrengthC5 = 0.25; // weak
  }

  // Breakdown component (C5 close relative to C3 body)
  let breakdownScore = 0.0;
  if (close5BelowC3Mid) {
    breakdownScore = 1.0; // strong - closes below C3 midpoint
  } else {
    // Calculate how close we are to C3 midpoint
    const c3BodyRange = Math.abs(c3.open - c3.close);
    if (c3BodyRange > 0) {
      const distFromMid = Math.abs(c5.close - c3BodyMid);
      const breakdownPct = 1.0 - Math.min(1.0, distFromMid / c3BodyRange);
      breakdownScore = Math.max(0.25, breakdownPct); // at least 0.25 if close enough
    } else {
      breakdownScore = 0.5; // neutral
    }
  }

  // Combine body strength and breakdown
  reversalScoreC5 = bodyStrengthC5 * 0.6 + breakdownScore * 0.4;

  // D) Trend context score (uptrend)
  let trendScore = 0.0;
  if (upTrendStrengthPct >= 3.0 && upTrendStrengthPct < 5.0) {
    trendScore = 0.25; // weak
  } else if (upTrendStrengthPct >= 5.0 && upTrendStrengthPct < 8.0) {
    trendScore = 0.5; // medium
  } else if (upTrendStrengthPct >= 8.0) {
    trendScore = Math.min(1.0, 0.75 + (upTrendStrengthPct - 8.0) / 10.0); // strong, cap at 1.0
  }

  // E) Volume score for C5 (strong selling volume)
  let volumeScoreC5 = 0.0;
  if (volumeMultiple5 >= 0.8 && volumeMultiple5 < 1.2) {
    volumeScoreC5 = 0.5; // medium
  } else if (volumeMultiple5 >= 1.2 && volumeMultiple5 < 1.8) {
    volumeScoreC5 = 0.75; // strong
  } else if (volumeMultiple5 >= 1.8) {
    volumeScoreC5 = 1.0; // very strong
  } else {
    volumeScoreC5 = 0.25; // weak
  }

  // =========================
  // 4. WEIGHTED STRENGTH CALCULATION
  // =========================
  const strength = calculateWeightedStrength([
    { score: trendScore, weight: 0.2 },
    { score: stepUpScore, weight: 0.2 },
    { score: indecisionScoreC4, weight: 0.15 },
    { score: reversalScoreC5, weight: 0.25 },
    { score: volumeScoreC5, weight: 0.2 },
  ]);

  // =========================
  // 5. THRESHOLD CHECK
  // =========================
  const isPattern = strength >= 0.55;

  // =========================
  // 6. BUILD OUTPUT OBJECT
  // =========================
  return {
    index,
    pattern: "LADDER_TOP",
    category: "REVERSAL",
    direction: "SHORT",
    isPattern,
    strength,
    metrics: {
      bodyRatio1,
      bodyRatio2,
      bodyRatio3,
      bodyRatio4,
      bodyRatio5,
      upTrendStrengthPct,
      stepUpScore,
      volumeMultiple1,
      volumeMultiple2,
      volumeMultiple3,
      volumeMultiple4,
      volumeMultiple5,
      // Include standard interface metrics for compatibility
      bodyRatio: bodyRatio5,
      upperWickRatio: parts5.upperShadowRatio,
      lowerWickRatio: parts5.lowerShadowRatio,
      volumeMultiple: volumeMultiple5,
      trendStrength: upTrendStrengthPct,
      distanceToSRpct: 100.0,
    },
  };
}
