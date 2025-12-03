// lib/utilities/candle-patterns.ts
//
// ================================
// Unified Candle Pattern Utilities
// ================================
// Pure, stateless, deterministic candle pattern detection functions
// All functions follow the same signature and return CandlePatternResult
//
// This module provides a shared technical dictionary for all strategies and scanners
// - Read-only
// - Stateless
// - Pure functions
// - Reusable by ALL strategies and scanners

// =========================
// Shared Interfaces
// =========================

export type CandleStrength = "none" | "weak" | "medium" | "strong";

export interface CandleMetrics {
  bodySize: number; // absolute body size
  totalRange: number; // high - low
  upperWick: number;
  lowerWick: number;
  bodyRatio: number; // bodySize / totalRange
  upperWickRatio: number; // upperWick / bodySize (or / totalRange if needed)
  lowerWickRatio: number; // lowerWick / bodySize (or / totalRange if needed)
  volume?: number; // current bar volume
  avgVolume?: number; // optional: average volume if available
  trendContext?: "up" | "down" | "sideways" | "unknown";
}

export interface CandlePatternResult {
  pattern: string; // e.g. "Hammer", "Doji", ...
  match: boolean;
  strength: CandleStrength;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  category:
    | "REVERSAL"
    | "CONTINUATION"
    | "INDECISION"
    | "CONFIRMATION"
    | "STOP_CANDLES"
    | "OTHER";
  metrics: CandleMetrics;
  notes?: string; // optional human-readable description
}

export interface CandleInput {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  avgVolume?: number;
}

export interface PatternContext {
  trend?: "up" | "down" | "sideways";
}

// =========================
// Core Helper Function
// =========================

/**
 * Compute basic CandleMetrics from OHLCV
 * This helper is reused by ALL pattern functions
 */
export function computeCandleMetrics(
  candle: CandleInput,
  context?: PatternContext
): CandleMetrics {
  const bodySize = Math.abs(candle.close - candle.open);
  const totalRange = candle.high - candle.low;
  
  // Upper wick: distance from body top to high
  const bodyTop = Math.max(candle.open, candle.close);
  const upperWick = Math.max(0, candle.high - bodyTop);
  
  // Lower wick: distance from body bottom to low
  const bodyBottom = Math.min(candle.open, candle.close);
  const lowerWick = Math.max(0, bodyBottom - candle.low);

  // Ratios
  const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0;
  const upperWickRatio = bodySize > 0 ? upperWick / bodySize : (totalRange > 0 ? upperWick / totalRange : 0);
  const lowerWickRatio = bodySize > 0 ? lowerWick / bodySize : (totalRange > 0 ? lowerWick / totalRange : 0);

  return {
    bodySize,
    totalRange,
    upperWick,
    lowerWick,
    bodyRatio,
    upperWickRatio,
    lowerWickRatio,
    volume: candle.volume,
    avgVolume: candle.avgVolume,
    trendContext: context?.trend ?? "unknown",
  };
}

// =========================
// Helper: Determine Strength from Bands
// =========================

/**
 * Determine strength based on value ranges
 */
function determineStrength(
  value: number,
  weakMin: number,
  weakMax: number,
  mediumMin: number,
  mediumMax: number,
  strongMin: number,
  strongMax: number
): CandleStrength {
  if (value >= strongMin && value <= strongMax) return "strong";
  if (value >= mediumMin && value <= mediumMax) return "medium";
  if (value >= weakMin && value <= weakMax) return "weak";
  return "none";
}

// =========================
// Pattern Detection Functions
// =========================
// Each function implements EXACT rules from specification
// All follow the same signature: isXXX(candle, context?)

/**
 * Hammer Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * 
 * Rules:
 * - Small body at upper end of range
 * - Lower wick at least 2x body size
 * - Upper wick minimal (less than body size)
 * - Best after downtrend
 */
export function isHammer(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);
  
  // Invalid candle
  if (metrics.totalRange <= 0) {
    return {
      pattern: "Hammer",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const { bodyRatio, lowerWickRatio, upperWickRatio, bodySize, lowerWick } = metrics;

  // Core conditions
  const hasSmallBody = bodyRatio < 0.33; // body less than 33% of range
  const hasLongLowerWick = lowerWickRatio >= 2.0; // lower wick at least 2x body
  const hasMinimalUpperWick = upperWickRatio < 1.0; // upper wick less than body

  // Base match
  const baseMatch = hasSmallBody && hasLongLowerWick && hasMinimalUpperWick;

  if (!baseMatch) {
    return {
      pattern: "Hammer",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  // Strength determination
  let strength: CandleStrength = "weak";
  
  // Strong: lower wick 3x+ body, body < 20%, upper wick < 0.5x body, after downtrend
  if (
    lowerWickRatio >= 3.0 &&
    bodyRatio < 0.20 &&
    upperWickRatio < 0.5 &&
    context?.trend === "down"
  ) {
    strength = "strong";
  }
  // Medium: lower wick 2.5x+ body, body < 25%, minimal upper wick
  else if (lowerWickRatio >= 2.5 && bodyRatio < 0.25 && upperWickRatio < 0.7) {
    strength = "medium";
  }
  // Weak: meets minimum criteria
  else {
    strength = "weak";
  }

  const notes = context?.trend === "down"
    ? "Hammer after downtrend with strong lower wick"
    : "Hammer pattern detected";

  return {
    pattern: "Hammer",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes,
  };
}

/**
 * Inverted Hammer Pattern Detection
 * Category: REVERSAL
 * Direction: LONG (potential reversal after downtrend)
 * 
 * Rules:
 * - Small body at lower end of range
 * - Upper wick at least 2x body size
 * - Lower wick minimal
 * - Best after downtrend
 */
export function isInvertedHammer(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "InvertedHammer",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const { bodyRatio, lowerWickRatio, upperWickRatio } = metrics;

  const hasSmallBody = bodyRatio < 0.33;
  const hasLongUpperWick = upperWickRatio >= 2.0;
  const hasMinimalLowerWick = lowerWickRatio < 1.0;

  const baseMatch = hasSmallBody && hasLongUpperWick && hasMinimalLowerWick;

  if (!baseMatch) {
    return {
      pattern: "InvertedHammer",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (upperWickRatio >= 3.0 && bodyRatio < 0.20 && lowerWickRatio < 0.5 && context?.trend === "down") {
    strength = "strong";
  } else if (upperWickRatio >= 2.5 && bodyRatio < 0.25 && lowerWickRatio < 0.7) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "InvertedHammer",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Inverted hammer after downtrend" : "Inverted hammer pattern",
  };
}

/**
 * Shooting Star Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * 
 * Rules:
 * - Small body at lower end of range
 * - Upper wick at least 2x body size
 * - Lower wick minimal
 * - Best after uptrend
 */
export function isShootingStar(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "ShootingStar",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const { bodyRatio, lowerWickRatio, upperWickRatio } = metrics;

  const hasSmallBody = bodyRatio < 0.33;
  const hasLongUpperWick = upperWickRatio >= 2.0;
  const hasMinimalLowerWick = lowerWickRatio < 1.0;

  const baseMatch = hasSmallBody && hasLongUpperWick && hasMinimalLowerWick;

  if (!baseMatch) {
    return {
      pattern: "ShootingStar",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (upperWickRatio >= 3.0 && bodyRatio < 0.20 && lowerWickRatio < 0.5 && context?.trend === "up") {
    strength = "strong";
  } else if (upperWickRatio >= 2.5 && bodyRatio < 0.25 && lowerWickRatio < 0.7) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "ShootingStar",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Shooting star after uptrend" : "Shooting star pattern",
  };
}

/**
 * Doji Pattern Detection
 * Category: INDECISION
 * Direction: NEUTRAL
 * 
 * Rules:
 * - Body very small (less than 5% of range)
 * - Open and close nearly equal
 */
export function isDoji(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "Doji",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  const { bodyRatio } = metrics;

  // Doji: body less than 5% of range
  const isDojiPattern = bodyRatio < 0.05;

  if (!isDojiPattern) {
    return {
      pattern: "Doji",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  // Strength based on body size
  let strength: CandleStrength = "weak";
  if (bodyRatio < 0.01) {
    strength = "strong"; // Perfect doji (open == close)
  } else if (bodyRatio < 0.03) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "Doji",
    match: true,
    strength,
    direction: "NEUTRAL",
    category: "INDECISION",
    metrics,
    notes: "Doji pattern - market indecision",
  };
}

/**
 * Long-Legged Doji Pattern Detection
 * Category: INDECISION
 * Direction: NEUTRAL
 * 
 * Rules:
 * - Very small body (doji-like)
 * - Both upper and lower wicks are long (at least 2x body each)
 */
export function isLongLeggedDoji(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "LongLeggedDoji",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  const { bodyRatio, upperWickRatio, lowerWickRatio } = metrics;

  const isSmallBody = bodyRatio < 0.05;
  const hasLongUpperWick = upperWickRatio >= 2.0;
  const hasLongLowerWick = lowerWickRatio >= 2.0;

  const baseMatch = isSmallBody && hasLongUpperWick && hasLongLowerWick;

  if (!baseMatch) {
    return {
      pattern: "LongLeggedDoji",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (bodyRatio < 0.01 && upperWickRatio >= 3.0 && lowerWickRatio >= 3.0) {
    strength = "strong";
  } else if (bodyRatio < 0.03 && upperWickRatio >= 2.5 && lowerWickRatio >= 2.5) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "LongLeggedDoji",
    match: true,
    strength,
    direction: "NEUTRAL",
    category: "INDECISION",
    metrics,
    notes: "Long-legged doji - high volatility indecision",
  };
}

/**
 * Dragonfly Doji Pattern Detection
 * Category: REVERSAL (potentially bullish)
 * Direction: LONG
 * 
 * Rules:
 * - Very small body at top of range
 * - Long lower wick (at least 2x total range)
 * - No or minimal upper wick
 */
export function isDragonflyDoji(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "DragonflyDoji",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const { bodyRatio, lowerWick, totalRange, upperWick } = metrics;

  // Lower wick ratio relative to total range
  const lowerWickToRange = lowerWick / totalRange;
  const upperWickToRange = upperWick / totalRange;

  const isSmallBody = bodyRatio < 0.05;
  const hasLongLowerWick = lowerWickToRange >= 0.66; // Lower wick at least 66% of range
  const hasMinimalUpperWick = upperWickToRange < 0.10; // Upper wick less than 10% of range

  const baseMatch = isSmallBody && hasLongLowerWick && hasMinimalUpperWick;

  if (!baseMatch) {
    return {
      pattern: "DragonflyDoji",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (bodyRatio < 0.01 && lowerWickToRange >= 0.75 && upperWickToRange < 0.05 && context?.trend === "down") {
    strength = "strong";
  } else if (bodyRatio < 0.03 && lowerWickToRange >= 0.70 && upperWickToRange < 0.08) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "DragonflyDoji",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Dragonfly doji after downtrend - bullish reversal signal" : "Dragonfly doji pattern",
  };
}

/**
 * Gravestone Doji Pattern Detection
 * Category: REVERSAL (potentially bearish)
 * Direction: SHORT
 * 
 * Rules:
 * - Very small body at bottom of range
 * - Long upper wick (at least 2x total range)
 * - No or minimal lower wick
 */
export function isGravestoneDoji(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "GravestoneDoji",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const { bodyRatio, upperWick, totalRange, lowerWick } = metrics;

  const upperWickToRange = upperWick / totalRange;
  const lowerWickToRange = lowerWick / totalRange;

  const isSmallBody = bodyRatio < 0.05;
  const hasLongUpperWick = upperWickToRange >= 0.66;
  const hasMinimalLowerWick = lowerWickToRange < 0.10;

  const baseMatch = isSmallBody && hasLongUpperWick && hasMinimalLowerWick;

  if (!baseMatch) {
    return {
      pattern: "GravestoneDoji",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (bodyRatio < 0.01 && upperWickToRange >= 0.75 && lowerWickToRange < 0.05 && context?.trend === "up") {
    strength = "strong";
  } else if (bodyRatio < 0.03 && upperWickToRange >= 0.70 && lowerWickToRange < 0.08) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "GravestoneDoji",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Gravestone doji after uptrend - bearish reversal signal" : "Gravestone doji pattern",
  };
}

// =========================
// Aggregation Helpers
// =========================

/**
 * Detect all patterns that match for a given candle
 * Returns array of all CandlePatternResult where match === true
 * 
 * Note: This function only checks single-candle patterns.
 * For multi-candle patterns (Engulfing, Morning Star, etc.),
 * call those functions directly with the required candles.
 */
export function detectAllPatterns(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput,
  candles?: CandleInput[]
): CandlePatternResult[] {
  const results: CandlePatternResult[] = [
    // Single-candle patterns
    isHammer(candle, context),
    isInvertedHammer(candle, context),
    isShootingStar(candle, context),
    isDoji(candle, context),
    isLongLeggedDoji(candle, context),
    isDragonflyDoji(candle, context),
    isGravestoneDoji(candle, context),
    isSpinningTop(candle, context),
    isBullishMarubozu(candle, context),
    isBearishMarubozu(candle, context),
    isBullishPinBar(candle, context),
    isBearishPinBar(candle, context),
    isHighWaveCandle(candle, context),
    isBullishBeltHold(candle, context),
    isBearishBeltHold(candle, context),
    isBullishHammerLike(candle, context),
    isBearishShootingStarLike(candle, context),
  ];

  // Two-candle patterns (if previous candle provided)
  if (previousCandle) {
    results.push(
      isBullishEngulfing(candle, context, previousCandle),
      isBearishEngulfing(candle, context, previousCandle),
      isPiercingPattern(candle, context, previousCandle),
      isDarkCloudCover(candle, context, previousCandle),
      isBullishHarami(candle, context, previousCandle),
      isBearishHarami(candle, context, previousCandle),
      isBullishHaramiCross(candle, context, previousCandle),
      isBearishHaramiCross(candle, context, previousCandle),
      isBullishKicker(candle, context, previousCandle),
      isBearishKicker(candle, context, previousCandle),
      isInsideBar(candle, context, previousCandle),
      isOutsideBar(candle, context, previousCandle),
      isTweezerTop(candle, context, previousCandle),
      isTweezerBottom(candle, context, previousCandle)
    );
  }

  // Three-candle patterns (if candles array provided)
  if (candles && candles.length >= 3) {
    results.push(
      isMorningStar(candle, context, candles),
      isEveningStar(candle, context, candles),
      isThreeWhiteSoldiers(candle, context, candles),
      isThreeBlackCrows(candle, context, candles),
      isAbandonedBabyTop(candle, context, candles),
      isAbandonedBabyBottom(candle, context, candles),
      isUniqueThreeRiverBottom(candle, context, candles)
    );
  }

  // Five-candle patterns (if candles array provided)
  if (candles && candles.length >= 5) {
    results.push(
      isRisingThreeMethods(candle, context, candles),
      isFallingThreeMethods(candle, context, candles),
      isBullishBreakaway(candle, context, candles),
      isBearishBreakaway(candle, context, candles),
      isMatHold(candle, context, candles)
    );
  }

  // Add single-candle pattern with context check
  results.push(isHangingMan(candle, context));

  return results.filter((r) => r.match === true);
}

/**
 * Bullish Engulfing Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous candle (for comparison)
 */
export function isBullishEngulfing(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "BullishEngulfing",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const prevMetrics = computeCandleMetrics(previousCandle, context);

  // Current candle must be bullish
  const isBullish = candle.close > candle.open;
  // Previous candle must be bearish
  const prevIsBearish = previousCandle.close < previousCandle.open;

  // Current body must completely engulf previous body
  const engulfs = candle.open < previousCandle.close && candle.close > previousCandle.open;

  const baseMatch = isBullish && prevIsBearish && engulfs;

  if (!baseMatch) {
    return {
      pattern: "BullishEngulfing",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  // Strength based on body size and volume
  const bodySizeRatio = metrics.bodySize / prevMetrics.bodySize;
  const hasVolume = metrics.volume && metrics.avgVolume && metrics.volume > metrics.avgVolume * 1.5;

  let strength: CandleStrength = "weak";
  if (bodySizeRatio >= 2.0 && hasVolume && context?.trend === "down") {
    strength = "strong";
  } else if (bodySizeRatio >= 1.5) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BullishEngulfing",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Bullish engulfing after downtrend" : "Bullish engulfing pattern",
  };
}

/**
 * Bearish Engulfing Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous candle (for comparison)
 */
export function isBearishEngulfing(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "BearishEngulfing",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const prevMetrics = computeCandleMetrics(previousCandle, context);

  const isBearish = candle.close < candle.open;
  const prevIsBullish = previousCandle.close > previousCandle.open;
  const engulfs = candle.open > previousCandle.close && candle.close < previousCandle.open;

  const baseMatch = isBearish && prevIsBullish && engulfs;

  if (!baseMatch) {
    return {
      pattern: "BearishEngulfing",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const bodySizeRatio = metrics.bodySize / prevMetrics.bodySize;
  const hasVolume = metrics.volume && metrics.avgVolume && metrics.volume > metrics.avgVolume * 1.5;

  let strength: CandleStrength = "weak";
  if (bodySizeRatio >= 2.0 && hasVolume && context?.trend === "up") {
    strength = "strong";
  } else if (bodySizeRatio >= 1.5) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BearishEngulfing",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Bearish engulfing after uptrend" : "Bearish engulfing pattern",
  };
}

/**
 * Morning Star Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous 2 candles (3-candle pattern)
 */
export function isMorningStar(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 3 || metrics.totalRange <= 0) {
    return {
      pattern: "MorningStar",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const [first, second, third] = candles.slice(-3);
  const firstMetrics = computeCandleMetrics(first, context);
  const secondMetrics = computeCandleMetrics(second, context);

  // First candle: bearish
  const firstBearish = first.close < first.open;
  // Second candle: small body (star), gap down from first
  const secondSmallBody = secondMetrics.bodyRatio < 0.33;
  const gapDown = second.open < first.close;
  // Third candle: bullish, closes into first candle's body
  const thirdBullish = third.close > third.open;
  const closesIntoFirst = third.close > (first.open + first.close) / 2;

  const baseMatch = firstBearish && secondSmallBody && gapDown && thirdBullish && closesIntoFirst;

  if (!baseMatch) {
    return {
      pattern: "MorningStar",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  const secondBodyVerySmall = secondMetrics.bodyRatio < 0.15;
  const thirdStrong = metrics.bodyRatio > 0.66;

  if (secondBodyVerySmall && thirdStrong && context?.trend === "down") {
    strength = "strong";
  } else if (secondMetrics.bodyRatio < 0.25 && metrics.bodyRatio > 0.50) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "MorningStar",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Morning star after downtrend" : "Morning star pattern",
  };
}

/**
 * Evening Star Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous 2 candles (3-candle pattern)
 */
export function isEveningStar(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 3 || metrics.totalRange <= 0) {
    return {
      pattern: "EveningStar",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const [first, second, third] = candles.slice(-3);
  const firstMetrics = computeCandleMetrics(first, context);
  const secondMetrics = computeCandleMetrics(second, context);

  const firstBullish = first.close > first.open;
  const secondSmallBody = secondMetrics.bodyRatio < 0.33;
  const gapUp = second.open > first.close;
  const thirdBearish = third.close < third.open;
  const closesIntoFirst = third.close < (first.open + first.close) / 2;

  const baseMatch = firstBullish && secondSmallBody && gapUp && thirdBearish && closesIntoFirst;

  if (!baseMatch) {
    return {
      pattern: "EveningStar",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  const secondBodyVerySmall = secondMetrics.bodyRatio < 0.15;
  const thirdStrong = metrics.bodyRatio > 0.66;

  if (secondBodyVerySmall && thirdStrong && context?.trend === "up") {
    strength = "strong";
  } else if (secondMetrics.bodyRatio < 0.25 && metrics.bodyRatio > 0.50) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "EveningStar",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Evening star after uptrend" : "Evening star pattern",
  };
}

/**
 * Piercing Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous candle
 */
export function isPiercingPattern(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "PiercingPattern",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const prevIsBearish = previousCandle.close < previousCandle.open;
  const currentIsBullish = candle.close > candle.open;
  
  // Opens below previous close
  const opensBelow = candle.open < previousCandle.close;
  // Closes above midpoint of previous body
  const prevMidpoint = (previousCandle.open + previousCandle.close) / 2;
  const closesAboveMidpoint = candle.close > prevMidpoint;
  // But doesn't close above previous open
  const doesntCloseAboveOpen = candle.close < previousCandle.open;

  const baseMatch = prevIsBearish && currentIsBullish && opensBelow && closesAboveMidpoint && doesntCloseAboveOpen;

  if (!baseMatch) {
    return {
      pattern: "PiercingPattern",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const penetration = (candle.close - prevMidpoint) / (previousCandle.open - previousCandle.close);

  let strength: CandleStrength = "weak";
  if (penetration >= 0.6 && context?.trend === "down") {
    strength = "strong";
  } else if (penetration >= 0.5) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "PiercingPattern",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Piercing pattern after downtrend" : "Piercing pattern",
  };
}

/**
 * Dark Cloud Cover Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous candle
 */
export function isDarkCloudCover(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "DarkCloudCover",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const prevIsBullish = previousCandle.close > previousCandle.open;
  const currentIsBearish = candle.close < candle.open;

  const opensAbove = candle.open > previousCandle.close;
  const prevMidpoint = (previousCandle.open + previousCandle.close) / 2;
  const closesBelowMidpoint = candle.close < prevMidpoint;
  const doesntCloseBelowOpen = candle.close > previousCandle.open;

  const baseMatch = prevIsBullish && currentIsBearish && opensAbove && closesBelowMidpoint && doesntCloseBelowOpen;

  if (!baseMatch) {
    return {
      pattern: "DarkCloudCover",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const penetration = (prevMidpoint - candle.close) / (previousCandle.close - previousCandle.open);

  let strength: CandleStrength = "weak";
  if (penetration >= 0.6 && context?.trend === "up") {
    strength = "strong";
  } else if (penetration >= 0.5) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "DarkCloudCover",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Dark cloud cover after uptrend" : "Dark cloud cover pattern",
  };
}

/**
 * Bullish Harami Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous candle
 */
export function isBullishHarami(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "BullishHarami",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const prevMetrics = computeCandleMetrics(previousCandle, context);

  const prevIsBearish = previousCandle.close < previousCandle.open;
  const currentIsBullish = candle.close > candle.open;

  // Current body is completely inside previous body
  const bodyInside = candle.open > previousCandle.close && candle.close < previousCandle.open;
  const prevBodySize = prevMetrics.bodySize;
  const currentBodySize = metrics.bodySize;
  const bodyRatio = currentBodySize / prevBodySize;

  const baseMatch = prevIsBearish && currentIsBullish && bodyInside;

  if (!baseMatch) {
    return {
      pattern: "BullishHarami",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (bodyRatio < 0.5 && context?.trend === "down") {
    strength = "strong";
  } else if (bodyRatio < 0.66) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BullishHarami",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Bullish harami after downtrend" : "Bullish harami pattern",
  };
}

/**
 * Bearish Harami Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous candle
 */
export function isBearishHarami(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "BearishHarami",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const prevMetrics = computeCandleMetrics(previousCandle, context);

  const prevIsBullish = previousCandle.close > previousCandle.open;
  const currentIsBearish = candle.close < candle.open;

  const bodyInside = candle.open < previousCandle.close && candle.close > previousCandle.open;
  const prevBodySize = prevMetrics.bodySize;
  const currentBodySize = metrics.bodySize;
  const bodyRatio = currentBodySize / prevBodySize;

  const baseMatch = prevIsBullish && currentIsBearish && bodyInside;

  if (!baseMatch) {
    return {
      pattern: "BearishHarami",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (bodyRatio < 0.5 && context?.trend === "up") {
    strength = "strong";
  } else if (bodyRatio < 0.66) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BearishHarami",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Bearish harami after uptrend" : "Bearish harami pattern",
  };
}

/**
 * Bullish Marubozu Pattern Detection
 * Category: CONTINUATION or REVERSAL
 * Direction: LONG
 * 
 * Rules:
 * - No wicks (or very minimal)
 * - Strong bullish body
 */
export function isBullishMarubozu(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "BullishMarubozu",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  const isBullish = candle.close > candle.open;
  const minimalWicks = metrics.upperWickRatio < 0.05 && metrics.lowerWickRatio < 0.05;
  const strongBody = metrics.bodyRatio > 0.90;

  const baseMatch = isBullish && minimalWicks && strongBody;

  if (!baseMatch) {
    return {
      pattern: "BullishMarubozu",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.95 && metrics.totalRange > 0) {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.92) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BullishMarubozu",
    match: true,
    strength,
    direction: "LONG",
    category: context?.trend === "up" ? "CONTINUATION" : "REVERSAL",
    metrics,
    notes: "Bullish marubozu - strong bullish candle with no wicks",
  };
}

/**
 * Bearish Marubozu Pattern Detection
 * Category: CONTINUATION or REVERSAL
 * Direction: SHORT
 */
export function isBearishMarubozu(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "BearishMarubozu",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "CONTINUATION",
      metrics,
    };
  }

  const isBearish = candle.close < candle.open;
  const minimalWicks = metrics.upperWickRatio < 0.05 && metrics.lowerWickRatio < 0.05;
  const strongBody = metrics.bodyRatio > 0.90;

  const baseMatch = isBearish && minimalWicks && strongBody;

  if (!baseMatch) {
    return {
      pattern: "BearishMarubozu",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.95) {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.92) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BearishMarubozu",
    match: true,
    strength,
    direction: "SHORT",
    category: context?.trend === "down" ? "CONTINUATION" : "REVERSAL",
    metrics,
    notes: "Bearish marubozu - strong bearish candle with no wicks",
  };
}

/**
 * Spinning Top Pattern Detection
 * Category: INDECISION
 * Direction: NEUTRAL
 * 
 * Rules:
 * - Small body
 * - Long wicks on both sides
 */
export function isSpinningTop(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "SpinningTop",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  const smallBody = metrics.bodyRatio < 0.33;
  const longUpperWick = metrics.upperWickRatio >= 1.5;
  const longLowerWick = metrics.lowerWickRatio >= 1.5;

  const baseMatch = smallBody && longUpperWick && longLowerWick;

  if (!baseMatch) {
    return {
      pattern: "SpinningTop",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio < 0.20 && metrics.upperWickRatio >= 2.0 && metrics.lowerWickRatio >= 2.0) {
    strength = "strong";
  } else if (metrics.bodyRatio < 0.25 && metrics.upperWickRatio >= 1.75 && metrics.lowerWickRatio >= 1.75) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "SpinningTop",
    match: true,
    strength,
    direction: "NEUTRAL",
    category: "INDECISION",
    metrics,
    notes: "Spinning top - indecision pattern",
  };
}

/**
 * Inside Bar Pattern Detection
 * Category: INDECISION or CONFIRMATION
 * Direction: NEUTRAL
 * Requires: previous candle
 */
export function isInsideBar(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "InsideBar",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  // Current candle completely inside previous candle's range
  const highInside = candle.high < previousCandle.high;
  const lowInside = candle.low > previousCandle.low;

  const baseMatch = highInside && lowInside;

  if (!baseMatch) {
    return {
      pattern: "InsideBar",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  // Strength based on how small the inside bar is relative to previous
  const rangeRatio = metrics.totalRange / (previousCandle.high - previousCandle.low);

  let strength: CandleStrength = "weak";
  if (rangeRatio < 0.5) {
    strength = "strong";
  } else if (rangeRatio < 0.66) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "InsideBar",
    match: true,
    strength,
    direction: "NEUTRAL",
    category: "INDECISION",
    metrics,
    notes: "Inside bar - consolidation pattern",
  };
}

/**
 * Outside Bar Pattern Detection
 * Category: REVERSAL or CONTINUATION
 * Direction: Depends on direction of body
 * Requires: previous candle
 */
export function isOutsideBar(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "OutsideBar",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "REVERSAL",
      metrics,
    };
  }

  // Current candle completely engulfs previous candle's range
  const highOutside = candle.high > previousCandle.high;
  const lowOutside = candle.low < previousCandle.low;

  const baseMatch = highOutside && lowOutside;

  if (!baseMatch) {
    return {
      pattern: "OutsideBar",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "REVERSAL",
      metrics,
    };
  }

  const direction: "LONG" | "SHORT" | "NEUTRAL" = candle.close > candle.open ? "LONG" : candle.close < candle.open ? "SHORT" : "NEUTRAL";
  const category = direction === "NEUTRAL" ? "INDECISION" : "REVERSAL";

  const rangeRatio = metrics.totalRange / (previousCandle.high - previousCandle.low);

  let strength: CandleStrength = "weak";
  if (rangeRatio >= 2.0) {
    strength = "strong";
  } else if (rangeRatio >= 1.5) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "OutsideBar",
    match: true,
    strength,
    direction,
    category,
    metrics,
    notes: `Outside bar - ${direction === "LONG" ? "bullish" : direction === "SHORT" ? "bearish" : "neutral"} engulfing pattern`,
  };
}

/**
 * Bullish Pin Bar Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * 
 * Rules:
 * - Small body
 * - Very long lower wick
 * - Minimal upper wick
 */
export function isBullishPinBar(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "BullishPinBar",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const smallBody = metrics.bodyRatio < 0.40;
  const longLowerWick = metrics.lowerWickRatio >= 2.5;
  const minimalUpperWick = metrics.upperWickRatio < 0.5;

  const baseMatch = smallBody && longLowerWick && minimalUpperWick;

  if (!baseMatch) {
    return {
      pattern: "BullishPinBar",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const lowerWickToRange = metrics.lowerWick / metrics.totalRange;

  let strength: CandleStrength = "weak";
  if (lowerWickToRange >= 0.70 && metrics.bodyRatio < 0.25 && context?.trend === "down") {
    strength = "strong";
  } else if (lowerWickToRange >= 0.60 && metrics.bodyRatio < 0.33) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BullishPinBar",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Bullish pin bar after downtrend" : "Bullish pin bar pattern",
  };
}

/**
 * Bearish Pin Bar Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 */
export function isBearishPinBar(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "BearishPinBar",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const smallBody = metrics.bodyRatio < 0.40;
  const longUpperWick = metrics.upperWickRatio >= 2.5;
  const minimalLowerWick = metrics.lowerWickRatio < 0.5;

  const baseMatch = smallBody && longUpperWick && minimalLowerWick;

  if (!baseMatch) {
    return {
      pattern: "BearishPinBar",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const upperWickToRange = metrics.upperWick / metrics.totalRange;

  let strength: CandleStrength = "weak";
  if (upperWickToRange >= 0.70 && metrics.bodyRatio < 0.25 && context?.trend === "up") {
    strength = "strong";
  } else if (upperWickToRange >= 0.60 && metrics.bodyRatio < 0.33) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BearishPinBar",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Bearish pin bar after uptrend" : "Bearish pin bar pattern",
  };
}

/**
 * High Wave Candle Pattern Detection
 * Category: INDECISION
 * Direction: NEUTRAL
 * 
 * Rules:
 * - Small body
 * - Long wicks on both sides (at least 1.5x body each)
 */
export function isHighWaveCandle(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "HighWaveCandle",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  const smallBody = metrics.bodyRatio < 0.40;
  const longUpperWick = metrics.upperWickRatio >= 1.5;
  const longLowerWick = metrics.lowerWickRatio >= 1.5;

  const baseMatch = smallBody && longUpperWick && longLowerWick;

  if (!baseMatch) {
    return {
      pattern: "HighWaveCandle",
      match: false,
      strength: "none",
      direction: "NEUTRAL",
      category: "INDECISION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio < 0.25 && metrics.upperWickRatio >= 2.5 && metrics.lowerWickRatio >= 2.5) {
    strength = "strong";
  } else if (metrics.bodyRatio < 0.30 && metrics.upperWickRatio >= 2.0 && metrics.lowerWickRatio >= 2.0) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "HighWaveCandle",
    match: true,
    strength,
    direction: "NEUTRAL",
    category: "INDECISION",
    metrics,
    notes: "High wave candle - high volatility indecision",
  };
}

/**
 * Bullish Kicker Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous candle
 */
export function isBullishKicker(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "BullishKicker",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const prevIsBearish = previousCandle.close < previousCandle.open;
  const currentIsBullish = candle.close > candle.open;

  // Gap up from previous close
  const gapUp = candle.open > previousCandle.close;

  const baseMatch = prevIsBearish && currentIsBullish && gapUp;

  if (!baseMatch) {
    return {
      pattern: "BullishKicker",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const gapSize = (candle.open - previousCandle.close) / previousCandle.close;
  const strongBody = metrics.bodyRatio > 0.70;

  let strength: CandleStrength = "weak";
  if (gapSize > 0.02 && strongBody && context?.trend === "down") {
    strength = "strong";
  } else if (gapSize > 0.01 && strongBody) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BullishKicker",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Bullish kicker after downtrend" : "Bullish kicker pattern",
  };
}

/**
 * Bearish Kicker Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous candle
 */
export function isBearishKicker(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "BearishKicker",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const prevIsBullish = previousCandle.close > previousCandle.open;
  const currentIsBearish = candle.close < candle.open;

  const gapDown = candle.open < previousCandle.close;

  const baseMatch = prevIsBullish && currentIsBearish && gapDown;

  if (!baseMatch) {
    return {
      pattern: "BearishKicker",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const gapSize = (previousCandle.close - candle.open) / previousCandle.close;
  const strongBody = metrics.bodyRatio > 0.70;

  let strength: CandleStrength = "weak";
  if (gapSize > 0.02 && strongBody && context?.trend === "up") {
    strength = "strong";
  } else if (gapSize > 0.01 && strongBody) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BearishKicker",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Bearish kicker after uptrend" : "Bearish kicker pattern",
  };
}

/**
 * Three White Soldiers Pattern Detection
 * Category: CONTINUATION
 * Direction: LONG
 * Requires: previous 2 candles (3-candle pattern)
 */
export function isThreeWhiteSoldiers(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 3) {
    return {
      pattern: "ThreeWhiteSoldiers",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  const [first, second, third] = candles.slice(-3);

  const allBullish =
    first.close > first.open && second.close > second.open && third.close > third.open;

  const allStrongBodies =
    computeCandleMetrics(first).bodyRatio > 0.60 &&
    computeCandleMetrics(second).bodyRatio > 0.60 &&
    metrics.bodyRatio > 0.60;

  const consecutiveHigher = second.close > first.close && third.close > second.close;

  const baseMatch = allBullish && allStrongBodies && consecutiveHigher;

  if (!baseMatch) {
    return {
      pattern: "ThreeWhiteSoldiers",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  const avgBodyRatio = (computeCandleMetrics(first).bodyRatio + computeCandleMetrics(second).bodyRatio + metrics.bodyRatio) / 3;

  if (avgBodyRatio > 0.75 && context?.trend === "up") {
    strength = "strong";
  } else if (avgBodyRatio > 0.66) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "ThreeWhiteSoldiers",
    match: true,
    strength,
    direction: "LONG",
    category: "CONTINUATION",
    metrics,
    notes: context?.trend === "up" ? "Three white soldiers - strong bullish continuation" : "Three white soldiers pattern",
  };
}

/**
 * Three Black Crows Pattern Detection
 * Category: CONTINUATION
 * Direction: SHORT
 * Requires: previous 2 candles (3-candle pattern)
 */
export function isThreeBlackCrows(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 3) {
    return {
      pattern: "ThreeBlackCrows",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "CONTINUATION",
      metrics,
    };
  }

  const [first, second, third] = candles.slice(-3);

  const allBearish =
    first.close < first.open && second.close < second.open && third.close < third.open;

  const allStrongBodies =
    computeCandleMetrics(first).bodyRatio > 0.60 &&
    computeCandleMetrics(second).bodyRatio > 0.60 &&
    metrics.bodyRatio > 0.60;

  const consecutiveLower = second.close < first.close && third.close < second.close;

  const baseMatch = allBearish && allStrongBodies && consecutiveLower;

  if (!baseMatch) {
    return {
      pattern: "ThreeBlackCrows",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  const avgBodyRatio = (computeCandleMetrics(first).bodyRatio + computeCandleMetrics(second).bodyRatio + metrics.bodyRatio) / 3;

  if (avgBodyRatio > 0.75 && context?.trend === "down") {
    strength = "strong";
  } else if (avgBodyRatio > 0.66) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "ThreeBlackCrows",
    match: true,
    strength,
    direction: "SHORT",
    category: "CONTINUATION",
    metrics,
    notes: context?.trend === "down" ? "Three black crows - strong bearish continuation" : "Three black crows pattern",
  };
}

/**
 * Tweezer Top Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous candle
 */
export function isTweezerTop(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "TweezerTop",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  // Both candles reach similar highs
  const highDifference = Math.abs(candle.high - previousCandle.high) / Math.max(candle.high, previousCandle.high);
  const similarHighs = highDifference < 0.002; // Within 0.2%

  const baseMatch = similarHighs;

  if (!baseMatch) {
    return {
      pattern: "TweezerTop",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (highDifference < 0.001 && context?.trend === "up") {
    strength = "strong";
  } else if (highDifference < 0.0015) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "TweezerTop",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Tweezer top after uptrend - resistance rejection" : "Tweezer top pattern",
  };
}

/**
 * Tweezer Bottom Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous candle
 */
export function isTweezerBottom(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!previousCandle || metrics.totalRange <= 0) {
    return {
      pattern: "TweezerBottom",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const lowDifference = Math.abs(candle.low - previousCandle.low) / Math.max(candle.low, previousCandle.low);
  const similarLows = lowDifference < 0.002;

  const baseMatch = similarLows;

  if (!baseMatch) {
    return {
      pattern: "TweezerBottom",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (lowDifference < 0.001 && context?.trend === "down") {
    strength = "strong";
  } else if (lowDifference < 0.0015) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "TweezerBottom",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Tweezer bottom after downtrend - support bounce" : "Tweezer bottom pattern",
  };
}

/**
 * Bullish Belt Hold Pattern Detection
 * Category: CONTINUATION or REVERSAL
 * Direction: LONG
 * 
 * Rules:
 * - Opens at low, closes near high
 * - Long bullish body with minimal upper wick
 */
export function isBullishBeltHold(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "BullishBeltHold",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  const isBullish = candle.close > candle.open;
  const opensAtLow = Math.abs(candle.open - candle.low) / metrics.totalRange < 0.05;
  const closesNearHigh = Math.abs(candle.high - candle.close) / metrics.totalRange < 0.10;
  const strongBody = metrics.bodyRatio > 0.75;

  const baseMatch = isBullish && opensAtLow && closesNearHigh && strongBody;

  if (!baseMatch) {
    return {
      pattern: "BullishBeltHold",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.85 && opensAtLow && closesNearHigh) {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.80) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BullishBeltHold",
    match: true,
    strength,
    direction: "LONG",
    category: context?.trend === "up" ? "CONTINUATION" : "REVERSAL",
    metrics,
    notes: "Bullish belt hold - strong bullish momentum from open",
  };
}

/**
 * Bearish Belt Hold Pattern Detection
 * Category: CONTINUATION or REVERSAL
 * Direction: SHORT
 */
export function isBearishBeltHold(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "BearishBeltHold",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "CONTINUATION",
      metrics,
    };
  }

  const isBearish = candle.close < candle.open;
  const opensAtHigh = Math.abs(candle.high - candle.open) / metrics.totalRange < 0.05;
  const closesNearLow = Math.abs(candle.close - candle.low) / metrics.totalRange < 0.10;
  const strongBody = metrics.bodyRatio > 0.75;

  const baseMatch = isBearish && opensAtHigh && closesNearLow && strongBody;

  if (!baseMatch) {
    return {
      pattern: "BearishBeltHold",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.85 && opensAtHigh && closesNearLow) {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.80) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BearishBeltHold",
    match: true,
    strength,
    direction: "SHORT",
    category: context?.trend === "down" ? "CONTINUATION" : "REVERSAL",
    metrics,
    notes: "Bearish belt hold - strong bearish momentum from open",
  };
}

/**
 * Bullish Hammer-Like Pattern Detection
 * Similar to hammer but more flexible body/wick ratios
 * Category: REVERSAL
 * Direction: LONG
 */
export function isBullishHammerLike(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "BullishHammerLike",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const { bodyRatio, lowerWickRatio, upperWickRatio } = metrics;

  const hasSmallBody = bodyRatio < 0.40;
  const hasLongLowerWick = lowerWickRatio >= 1.5; // More flexible than hammer
  const hasMinimalUpperWick = upperWickRatio < 1.2;

  const baseMatch = hasSmallBody && hasLongLowerWick && hasMinimalUpperWick;

  if (!baseMatch) {
    return {
      pattern: "BullishHammerLike",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (lowerWickRatio >= 2.5 && bodyRatio < 0.25 && context?.trend === "down") {
    strength = "strong";
  } else if (lowerWickRatio >= 2.0 && bodyRatio < 0.30) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BullishHammerLike",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Bullish hammer-like after downtrend" : "Bullish hammer-like pattern",
  };
}

/**
 * Bearish Shooting Star-Like Pattern Detection
 * Similar to shooting star but more flexible
 * Category: REVERSAL
 * Direction: SHORT
 */
export function isBearishShootingStarLike(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (metrics.totalRange <= 0) {
    return {
      pattern: "BearishShootingStarLike",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const { bodyRatio, lowerWickRatio, upperWickRatio } = metrics;

  const hasSmallBody = bodyRatio < 0.40;
  const hasLongUpperWick = upperWickRatio >= 1.5;
  const hasMinimalLowerWick = lowerWickRatio < 1.2;

  const baseMatch = hasSmallBody && hasLongUpperWick && hasMinimalLowerWick;

  if (!baseMatch) {
    return {
      pattern: "BearishShootingStarLike",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (upperWickRatio >= 2.5 && bodyRatio < 0.25 && context?.trend === "up") {
    strength = "strong";
  } else if (upperWickRatio >= 2.0 && bodyRatio < 0.30) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BearishShootingStarLike",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Bearish shooting star-like after uptrend" : "Bearish shooting star-like pattern",
  };
}

/**
 * Hanging Man Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Similar to hammer but appears after uptrend
 */
export function isHangingMan(
  candle: CandleInput,
  context?: PatternContext
): CandlePatternResult {
  // Same structure as hammer but different context expectations
  const hammerResult = isHammer(candle, context);

  if (!hammerResult.match) {
    return {
      pattern: "HangingMan",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics: hammerResult.metrics,
    };
  }

  // Hanging man is stronger after uptrend
  const strength: CandleStrength = context?.trend === "up" ? "strong" : context?.trend === "down" ? "weak" : hammerResult.strength;

  return {
    pattern: "HangingMan",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics: hammerResult.metrics,
    notes: context?.trend === "up" ? "Hanging man after uptrend - bearish reversal signal" : "Hanging man pattern",
  };
}

/**
 * Bullish Harami Cross Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous candle (harami where second candle is a doji)
 */
export function isBullishHaramiCross(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  if (!previousCandle) {
    return {
      pattern: "BullishHaramiCross",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics: computeCandleMetrics(candle, context),
    };
  }

  const haramiResult = isBullishHarami(candle, context, previousCandle);
  const dojiResult = isDoji(candle, context);

  const baseMatch = haramiResult.match && dojiResult.match;

  if (!baseMatch) {
    return {
      pattern: "BullishHaramiCross",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics: haramiResult.metrics,
    };
  }

  // Harami cross is typically stronger than regular harami
  const strength: CandleStrength = haramiResult.strength === "strong" ? "strong" : haramiResult.strength === "medium" ? "medium" : "weak";

  return {
    pattern: "BullishHaramiCross",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics: haramiResult.metrics,
    notes: context?.trend === "down" ? "Bullish harami cross after downtrend" : "Bullish harami cross pattern",
  };
}

/**
 * Bearish Harami Cross Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous candle
 */
export function isBearishHaramiCross(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput
): CandlePatternResult {
  if (!previousCandle) {
    return {
      pattern: "BearishHaramiCross",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics: computeCandleMetrics(candle, context),
    };
  }

  const haramiResult = isBearishHarami(candle, context, previousCandle);
  const dojiResult = isDoji(candle, context);

  const baseMatch = haramiResult.match && dojiResult.match;

  if (!baseMatch) {
    return {
      pattern: "BearishHaramiCross",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics: haramiResult.metrics,
    };
  }

  const strength: CandleStrength = haramiResult.strength === "strong" ? "strong" : haramiResult.strength === "medium" ? "medium" : "weak";

  return {
    pattern: "BearishHaramiCross",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics: haramiResult.metrics,
    notes: context?.trend === "up" ? "Bearish harami cross after uptrend" : "Bearish harami cross pattern",
  };
}

/**
 * Rising Three Methods Pattern Detection
 * Category: CONTINUATION
 * Direction: LONG
 * Requires: previous 4 candles (5-candle pattern)
 */
export function isRisingThreeMethods(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 5) {
    return {
      pattern: "RisingThreeMethods",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  const [first, second, third, fourth, fifth] = candles.slice(-5);

  // First candle: strong bullish
  const firstBullish = first.close > first.open;
  const firstStrong = computeCandleMetrics(first).bodyRatio > 0.60;

  // Three middle candles: small bearish or neutral, inside first candle's range
  const middleInside = second.high < first.high && second.low > first.low &&
                       third.high < first.high && third.low > first.low &&
                       fourth.high < first.high && fourth.low > first.low;

  // Fifth candle: strong bullish, closes above first close
  const fifthBullish = fifth.close > fifth.open;
  const fifthStrong = metrics.bodyRatio > 0.60;
  const closesAbove = fifth.close > first.close;

  const baseMatch = firstBullish && firstStrong && middleInside && fifthBullish && fifthStrong && closesAbove;

  if (!baseMatch) {
    return {
      pattern: "RisingThreeMethods",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.75 && context?.trend === "up") {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.66) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "RisingThreeMethods",
    match: true,
    strength,
    direction: "LONG",
    category: "CONTINUATION",
    metrics,
    notes: context?.trend === "up" ? "Rising three methods - bullish continuation" : "Rising three methods pattern",
  };
}

/**
 * Falling Three Methods Pattern Detection
 * Category: CONTINUATION
 * Direction: SHORT
 * Requires: previous 4 candles (5-candle pattern)
 */
export function isFallingThreeMethods(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 5) {
    return {
      pattern: "FallingThreeMethods",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "CONTINUATION",
      metrics,
    };
  }

  const [first, second, third, fourth, fifth] = candles.slice(-5);

  const firstBearish = first.close < first.open;
  const firstStrong = computeCandleMetrics(first).bodyRatio > 0.60;

  const middleInside = second.high < first.high && second.low > first.low &&
                       third.high < first.high && third.low > first.low &&
                       fourth.high < first.high && fourth.low > first.low;

  const fifthBearish = fifth.close < fifth.open;
  const fifthStrong = metrics.bodyRatio > 0.60;
  const closesBelow = fifth.close < first.close;

  const baseMatch = firstBearish && firstStrong && middleInside && fifthBearish && fifthStrong && closesBelow;

  if (!baseMatch) {
    return {
      pattern: "FallingThreeMethods",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.75 && context?.trend === "down") {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.66) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "FallingThreeMethods",
    match: true,
    strength,
    direction: "SHORT",
    category: "CONTINUATION",
    metrics,
    notes: context?.trend === "down" ? "Falling three methods - bearish continuation" : "Falling three methods pattern",
  };
}

/**
 * Bullish Breakaway Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous 4 candles (5-candle pattern)
 */
export function isBullishBreakaway(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 5) {
    return {
      pattern: "BullishBreakaway",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const [first, second, third, fourth, fifth] = candles.slice(-5);

  // First candle: bearish
  const firstBearish = first.close < first.open;

  // Second, third, fourth: continue bearish trend with gaps
  const secondBearish = second.close < second.open;
  const thirdBearish = third.close < third.open;
  const fourthBearish = fourth.close < fourth.open;

  // Gaps between candles
  const gap1 = second.open < first.close;
  const gap2 = third.open < second.close;
  const gap3 = fourth.open < third.close;

  // Fifth candle: bullish, gap up, closes into first candle's body
  const fifthBullish = fifth.close > fifth.open;
  const gapUp = fifth.open > fourth.close;
  const closesIntoFirst = fifth.close > first.open;

  const baseMatch = firstBearish && secondBearish && thirdBearish && fourthBearish &&
                    gap1 && gap2 && gap3 && fifthBullish && gapUp && closesIntoFirst;

  if (!baseMatch) {
    return {
      pattern: "BullishBreakaway",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.70 && context?.trend === "down") {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.60) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BullishBreakaway",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Bullish breakaway after downtrend" : "Bullish breakaway pattern",
  };
}

/**
 * Bearish Breakaway Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous 4 candles (5-candle pattern)
 */
export function isBearishBreakaway(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 5) {
    return {
      pattern: "BearishBreakaway",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const [first, second, third, fourth, fifth] = candles.slice(-5);

  const firstBullish = first.close > first.open;
  const secondBullish = second.close > second.open;
  const thirdBullish = third.close > third.open;
  const fourthBullish = fourth.close > fourth.open;

  const gap1 = second.open > first.close;
  const gap2 = third.open > second.close;
  const gap3 = fourth.open > third.close;

  const fifthBearish = fifth.close < fifth.open;
  const gapDown = fifth.open < fourth.close;
  const closesIntoFirst = fifth.close < first.open;

  const baseMatch = firstBullish && secondBullish && thirdBullish && fourthBullish &&
                    gap1 && gap2 && gap3 && fifthBearish && gapDown && closesIntoFirst;

  if (!baseMatch) {
    return {
      pattern: "BearishBreakaway",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.70 && context?.trend === "up") {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.60) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "BearishBreakaway",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Bearish breakaway after uptrend" : "Bearish breakaway pattern",
  };
}

/**
 * Abandoned Baby Top Pattern Detection
 * Category: REVERSAL
 * Direction: SHORT
 * Requires: previous 2 candles (3-candle pattern with gaps)
 */
export function isAbandonedBabyTop(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 3) {
    return {
      pattern: "AbandonedBabyTop",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  const [first, second, third] = candles.slice(-3);
  const secondMetrics = computeCandleMetrics(second, context);

  const firstBullish = first.close > first.open;
  const secondSmallBody = secondMetrics.bodyRatio < 0.05; // Doji-like
  const thirdBearish = third.close < third.open;

  // Gaps
  const gapUp = second.open > first.close && second.close > first.close;
  const gapDown = third.open < second.close && third.close < second.close;

  const baseMatch = firstBullish && secondSmallBody && gapUp && gapDown && thirdBearish;

  if (!baseMatch) {
    return {
      pattern: "AbandonedBabyTop",
      match: false,
      strength: "none",
      direction: "SHORT",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (secondMetrics.bodyRatio < 0.01 && metrics.bodyRatio > 0.60 && context?.trend === "up") {
    strength = "strong";
  } else if (secondMetrics.bodyRatio < 0.03 && metrics.bodyRatio > 0.50) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "AbandonedBabyTop",
    match: true,
    strength,
    direction: "SHORT",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "up" ? "Abandoned baby top after uptrend" : "Abandoned baby top pattern",
  };
}

/**
 * Abandoned Baby Bottom Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous 2 candles (3-candle pattern with gaps)
 */
export function isAbandonedBabyBottom(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 3) {
    return {
      pattern: "AbandonedBabyBottom",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const [first, second, third] = candles.slice(-3);
  const secondMetrics = computeCandleMetrics(second, context);

  const firstBearish = first.close < first.open;
  const secondSmallBody = secondMetrics.bodyRatio < 0.05;
  const thirdBullish = third.close > third.open;

  const gapDown = second.open < first.close && second.close < first.close;
  const gapUp = third.open > second.close && third.close > second.close;

  const baseMatch = firstBearish && secondSmallBody && gapDown && gapUp && thirdBullish;

  if (!baseMatch) {
    return {
      pattern: "AbandonedBabyBottom",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (secondMetrics.bodyRatio < 0.01 && metrics.bodyRatio > 0.60 && context?.trend === "down") {
    strength = "strong";
  } else if (secondMetrics.bodyRatio < 0.03 && metrics.bodyRatio > 0.50) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "AbandonedBabyBottom",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Abandoned baby bottom after downtrend" : "Abandoned baby bottom pattern",
  };
}

/**
 * Mat Hold Pattern Detection
 * Category: CONTINUATION
 * Direction: LONG
 * Requires: previous 4 candles (5-candle pattern)
 */
export function isMatHold(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 5) {
    return {
      pattern: "MatHold",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  const [first, second, third, fourth, fifth] = candles.slice(-5);

  const firstBullish = first.close > first.open;
  const firstStrong = computeCandleMetrics(first).bodyRatio > 0.60;

  // Middle three: small bodies, mostly inside first range
  const middleConsolidation = computeCandleMetrics(second).bodyRatio < 0.50 &&
                              computeCandleMetrics(third).bodyRatio < 0.50 &&
                              computeCandleMetrics(fourth).bodyRatio < 0.50;

  // Fifth: strong bullish, closes above first close
  const fifthBullish = fifth.close > fifth.open;
  const fifthStrong = metrics.bodyRatio > 0.60;
  const closesAbove = fifth.close > first.close;

  const baseMatch = firstBullish && firstStrong && middleConsolidation && fifthBullish && fifthStrong && closesAbove;

  if (!baseMatch) {
    return {
      pattern: "MatHold",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "CONTINUATION",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (metrics.bodyRatio > 0.75 && context?.trend === "up") {
    strength = "strong";
  } else if (metrics.bodyRatio > 0.66) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "MatHold",
    match: true,
    strength,
    direction: "LONG",
    category: "CONTINUATION",
    metrics,
    notes: context?.trend === "up" ? "Mat hold - bullish continuation" : "Mat hold pattern",
  };
}

/**
 * Unique Three River Bottom Pattern Detection
 * Category: REVERSAL
 * Direction: LONG
 * Requires: previous 2 candles (3-candle pattern)
 */
export function isUniqueThreeRiverBottom(
  candle: CandleInput,
  context?: PatternContext,
  candles?: CandleInput[]
): CandlePatternResult {
  const metrics = computeCandleMetrics(candle, context);

  if (!candles || candles.length < 3) {
    return {
      pattern: "UniqueThreeRiverBottom",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  const [first, second, third] = candles.slice(-3);
  const firstMetrics = computeCandleMetrics(first, context);
  const secondMetrics = computeCandleMetrics(second, context);

  // First: long bearish
  const firstBearish = first.close < first.open;
  const firstLong = firstMetrics.bodyRatio > 0.60;

  // Second: small body (doji or spinning top), new low
  const secondSmall = secondMetrics.bodyRatio < 0.33;
  const newLow = second.low < first.low;

  // Third: small bullish, inside second
  const thirdBullish = third.close > third.open;
  const thirdSmall = metrics.bodyRatio < 0.40;
  const insideSecond = third.high < second.high && third.low > second.low;

  const baseMatch = firstBearish && firstLong && secondSmall && newLow && thirdBullish && thirdSmall && insideSecond;

  if (!baseMatch) {
    return {
      pattern: "UniqueThreeRiverBottom",
      match: false,
      strength: "none",
      direction: "LONG",
      category: "REVERSAL",
      metrics,
    };
  }

  let strength: CandleStrength = "weak";
  if (secondMetrics.bodyRatio < 0.15 && metrics.bodyRatio < 0.30 && context?.trend === "down") {
    strength = "strong";
  } else if (secondMetrics.bodyRatio < 0.25 && metrics.bodyRatio < 0.35) {
    strength = "medium";
  } else {
    strength = "weak";
  }

  return {
    pattern: "UniqueThreeRiverBottom",
    match: true,
    strength,
    direction: "LONG",
    category: "REVERSAL",
    metrics,
    notes: context?.trend === "down" ? "Unique three river bottom after downtrend" : "Unique three river bottom pattern",
  };
}

/**
 * Find the best matching pattern (strongest strength)
 * Returns the pattern with highest strength, or null if none match
 */
export function bestMatchingPattern(
  candle: CandleInput,
  context?: PatternContext,
  previousCandle?: CandleInput,
  candles?: CandleInput[]
): CandlePatternResult | null {
  const allPatterns = detectAllPatterns(candle, context, previousCandle, candles);

  if (allPatterns.length === 0) {
    return null;
  }

  // Strength priority: strong > medium > weak
  const strengthOrder: Record<CandleStrength, number> = {
    none: 0,
    weak: 1,
    medium: 2,
    strong: 3,
  };

  return allPatterns.reduce((best, current) => {
    if (strengthOrder[current.strength] > strengthOrder[best.strength]) {
      return current;
    }
    return best;
  }, allPatterns[0]);
}


