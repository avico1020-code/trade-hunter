// lib/strategies/liquidity-sweep-breakout.ts

// ================================
// Liquidity Sweep Breakout Strategy
// ================================
//
// Strategy type: Breakout after Liquidity Sweep
// Structure: Pivot -> Sweep -> Confirmed Breakout
// Direction-aware: works only with Master direction

import type {
  IndicatorSnapshot,
  IPatternStrategy,
  MasterSymbolInfo,
  PatternDetectionResult,
} from "../scanner/trade-pattern-scanner";
import type { Candle } from "./double-top";

// ============ Type Definitions (using project types) ============

export type Direction = "LONG" | "SHORT";

export interface StrategyContext {
  symbol: string;
  timeframe: string;
  master: MasterSymbolInfo;
  minMasterScore?: number;
  now?: Date;
}

export interface PatternEntry {
  price: number;
  type: "BREAKOUT_ENTRY";
}

export interface PatternStop {
  price: number;
  riskPerShare: number;
}

// Pattern State - what detectPattern() returns
export interface LiquiditySweepPatternState {
  patternFound: boolean;
  direction?: Direction;
  pivotIndex?: number;
  sweepIndex?: number;
  breakoutIndex?: number;
  pivotLevel?: number;
  sweepLevel?: number;
  breakoutLevel?: number;
  structureScore?: number;
  volatilityScore?: number;
  qualityScore?: number;
  atrAtBreakout?: number;
  reason?: string;
}

// Entry Signal - what entry() returns
export interface EntrySignal {
  enter: boolean;
  leg: 1; // This strategy has only one entry leg
  price?: number;
  refIndices?: number[];
  meta?: Record<string, any>;
}

// Exit Signal - what exit() returns
export interface ExitSignal {
  exit: boolean;
  leg: 1;
  reason?: string;
  price?: number;
}

// Stop Levels - what stops() returns
export interface StopLevels {
  initial: number;
  trailing?: number;
}

// Legacy types for backward compatibility
export interface PatternMetadata {
  patternName: string;
  direction: Direction;
  pivotIndex: number;
  sweepIndex: number;
  breakoutIndex: number;
  pivotLevel: number;
  sweepLevel: number;
  breakoutLevel: number;
  structureScore: number;
  volatilityScore: number;
  qualityScore: number;
  atrAtBreakout: number;
}

export interface PatternEntry {
  price: number;
  type: "BREAKOUT_ENTRY";
}

export interface PatternStop {
  price: number;
  riskPerShare: number;
}

export interface PatternSignal {
  symbol: string;
  strategy: string;
  side: Direction;
  timeframe: string;
  entry: PatternEntry;
  stop: PatternStop;
  master: MasterSymbolInfo;
  metadata: PatternMetadata;
}

// ============ Liquidity Sweep Breakout Strategy ============

export class LiquiditySweepBreakoutStrategy {
  public readonly name = "LIQUIDITY_SWEEP_BREAKOUT";

  // Configuration parameters – you can tune these
  private readonly pivotLookback = 7;
  private readonly minBarsBetweenPivotAndBreakout = 3;
  private readonly trendLookback = 15;
  private readonly fastEmaPeriod = 20;
  private readonly slowEmaPeriod = 50;
  private readonly atrPeriod = 14;
  private readonly sweepAtrMultiplier = 0.3; // how deep must the sweep be (in ATR terms)
  private readonly bufferAtrMultiplier = 0.1; // entry/stop buffer in ATR
  private readonly defaultMinMasterScore = 6.5;
  private readonly maxPatternAgeBars = 80; // how far back we allow the pivot

  // =========================
  // 1) זיהוי תבנית Liquidity Sweep Breakout
  // =========================
  detectPattern(candles: Candle[], context: StrategyContext): LiquiditySweepPatternState {
    if (candles.length < Math.max(this.slowEmaPeriod, this.atrPeriod) + 10) {
      return { patternFound: false, reason: "not-enough-data" };
    }

    const minMasterScore = context.minMasterScore ?? this.defaultMinMasterScore;

    // 1) Master direction & score filter
    if (Math.abs(context.master.masterScore) < minMasterScore) {
      return {
        patternFound: false,
        reason: "master-score-too-low",
      };
    }

    // 2) Pre-calc indicators
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    const fastEma = this.computeEMA(closes, this.fastEmaPeriod);
    const slowEma = this.computeEMA(closes, this.slowEmaPeriod);
    const atr = this.computeATR(highs, lows, closes, this.atrPeriod);

    // 3) Trend filter
    const trend = this.detectTrend(candles, fastEma, slowEma, this.trendLookback);
    if (!trend) {
      return { patternFound: false, reason: "no-trend-detected" };
    }

    // 4) Identify pivots
    const pivots = this.findPivots(candles, this.pivotLookback);

    // 5) Try detect pattern close to the end of the series
    const pattern = this.detectLiquiditySweepBreakoutPattern(
      candles,
      pivots,
      atr,
      trend,
      context.master.direction as Direction
    );

    if (!pattern) {
      return { patternFound: false, reason: "pattern-not-found" };
    }

    // 6) Quality scores
    const breakoutAtr = atr[pattern.breakoutIndex];
    if (!Number.isFinite(breakoutAtr) || breakoutAtr <= 0) {
      return { patternFound: false, reason: "invalid-atr" };
    }

    const structureScore = this.computeStructureScore(pattern, atr);
    const volatilityScore = this.computeVolatilityScore(breakoutAtr, pattern.breakoutLevel);
    const qualityScore = Math.max(0, Math.min(1, 0.6 * structureScore + 0.4 * volatilityScore));

    return {
      patternFound: true,
      direction: pattern.direction,
      pivotIndex: pattern.pivotIndex,
      sweepIndex: pattern.sweepIndex,
      breakoutIndex: pattern.breakoutIndex,
      pivotLevel: pattern.pivotLevel,
      sweepLevel: pattern.sweepLevel,
      breakoutLevel: pattern.breakoutLevel,
      structureScore,
      volatilityScore,
      qualityScore,
      atrAtBreakout: breakoutAtr,
      reason: "liquidity-sweep-breakout-confirmed",
    };
  }

  // =========================
  // 2) תנאי כניסה
  // =========================
  entry(candles: Candle[], state: LiquiditySweepPatternState): EntrySignal {
    if (!state.patternFound || state.breakoutIndex == null) {
      return { enter: false, leg: 1 };
    }

    // Entry happens when breakout is confirmed (price closed above/below breakout level)
    const lastCandle = candles[candles.length - 1];
    if (!lastCandle) {
      return { enter: false, leg: 1 };
    }

    // Check if we're still in breakout mode (price above breakout for LONG, below for SHORT)
    const isBreakoutValid =
      state.direction === "LONG"
        ? lastCandle.close > state.breakoutLevel!
        : lastCandle.close < state.breakoutLevel!;

    if (!isBreakoutValid) {
      return { enter: false, leg: 1 };
    }

    // Entry price is current close + buffer
    const atr = state.atrAtBreakout || 0;
    const entryPrice =
      state.direction === "LONG"
        ? lastCandle.close + atr * this.bufferAtrMultiplier
        : lastCandle.close - atr * this.bufferAtrMultiplier;

    return {
      enter: true,
      leg: 1,
      price: entryPrice,
      refIndices: [state.pivotIndex!, state.sweepIndex!, state.breakoutIndex!],
      meta: {
        direction: state.direction,
        breakoutLevel: state.breakoutLevel,
      },
    };
  }

  // =========================
  // 3) תנאי יציאה
  // =========================
  exit(candles: Candle[], state: LiquiditySweepPatternState, entryPrice: number): ExitSignal {
    if (!state.patternFound) {
      return { exit: false, leg: 1 };
    }

    const lastCandle = candles[candles.length - 1];
    if (!lastCandle) {
      return { exit: false, leg: 1 };
    }

    // Exit if price reverses back through the sweep level (pattern invalidation)
    if (state.direction === "LONG" && lastCandle.close < state.sweepLevel!) {
      return {
        exit: true,
        leg: 1,
        reason: "pattern-invalidated-below-sweep",
        price: lastCandle.close,
      };
    }

    if (state.direction === "SHORT" && lastCandle.close > state.sweepLevel!) {
      return {
        exit: true,
        leg: 1,
        reason: "pattern-invalidated-above-sweep",
        price: lastCandle.close,
      };
    }

    // Optional: Exit on reaching target (e.g., 2R or 3R)
    // This can be added based on strategy requirements

    return { exit: false, leg: 1 };
  }

  // =========================
  // 4) חישוב סטופים
  // =========================
  stops(candles: Candle[], state: LiquiditySweepPatternState): StopLevels | null {
    if (!state.patternFound || state.breakoutIndex == null) {
      return null;
    }

    const atr = state.atrAtBreakout || 0;
    if (!Number.isFinite(atr) || atr <= 0) {
      return null;
    }

    // Stop is placed below the lower of pivot/sweep for LONG, above the higher for SHORT
    const initialStopPrice =
      state.direction === "LONG"
        ? Math.min(state.sweepLevel!, state.pivotLevel!) - atr * this.bufferAtrMultiplier
        : Math.max(state.sweepLevel!, state.pivotLevel!) + atr * this.bufferAtrMultiplier;

    return {
      initial: initialStopPrice,
      // Trailing stop can be added here if needed
      trailing: undefined,
    };
  }

  // =========================
  // Legacy detect() method for backward compatibility
  // =========================
  detect(candles: Candle[], context: StrategyContext): PatternSignal | null {
    if (candles.length < Math.max(this.slowEmaPeriod, this.atrPeriod) + 10) {
      return null;
    }

    const minMasterScore = context.minMasterScore ?? this.defaultMinMasterScore;

    // 1) Master direction & score filter
    if (Math.abs(context.master.masterScore) < minMasterScore) {
      return null;
    }

    // 2) Pre-calc indicators
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    const fastEma = this.computeEMA(closes, this.fastEmaPeriod);
    const slowEma = this.computeEMA(closes, this.slowEmaPeriod);
    const atr = this.computeATR(highs, lows, closes, this.atrPeriod);

    // 3) Trend filter
    const trend = this.detectTrend(candles, fastEma, slowEma, this.trendLookback);
    if (!trend) return null;

    // 4) Identify pivots
    const pivots = this.findPivots(candles, this.pivotLookback);

    // 5) Try detect pattern close to the end of the series
    const pattern = this.detectLiquiditySweepBreakoutPattern(
      candles,
      pivots,
      atr,
      trend,
      context.master.direction as Direction
    );

    if (!pattern) {
      return null;
    }

    // 6) Build entry & stop
    const breakoutAtr = atr[pattern.breakoutIndex];
    if (!Number.isFinite(breakoutAtr) || breakoutAtr <= 0) {
      return null;
    }

    const entryPrice =
      pattern.direction === "LONG"
        ? pattern.breakoutLevel + breakoutAtr * this.bufferAtrMultiplier
        : pattern.breakoutLevel - breakoutAtr * this.bufferAtrMultiplier;

    const stopPrice =
      pattern.direction === "LONG"
        ? Math.min(pattern.sweepLevel, pattern.pivotLevel) - breakoutAtr * this.bufferAtrMultiplier
        : Math.max(pattern.sweepLevel, pattern.pivotLevel) + breakoutAtr * this.bufferAtrMultiplier;

    const riskPerShare = Math.abs(entryPrice - stopPrice);
    if (!Number.isFinite(riskPerShare) || riskPerShare <= 0) {
      return null;
    }

    // 7) Quality score (simple heuristic; you can enhance)
    const structureScore = this.computeStructureScore(pattern, atr);
    const volatilityScore = this.computeVolatilityScore(breakoutAtr, pattern.breakoutLevel);
    const qualityScore = Math.max(0, Math.min(1, 0.6 * structureScore + 0.4 * volatilityScore));

    // 8) Build final PatternSignal
    const metadata: PatternMetadata = {
      patternName: this.name,
      direction: pattern.direction,
      pivotIndex: pattern.pivotIndex,
      sweepIndex: pattern.sweepIndex,
      breakoutIndex: pattern.breakoutIndex,
      pivotLevel: pattern.pivotLevel,
      sweepLevel: pattern.sweepLevel,
      breakoutLevel: pattern.breakoutLevel,
      structureScore,
      volatilityScore,
      qualityScore,
      atrAtBreakout: breakoutAtr,
    };

    const signal: PatternSignal = {
      symbol: context.symbol,
      strategy: this.name,
      side: pattern.direction,
      timeframe: context.timeframe,
      entry: {
        type: "BREAKOUT_ENTRY",
        price: entryPrice,
      },
      stop: {
        price: stopPrice,
        riskPerShare,
      },
      master: context.master,
      metadata,
    };

    return signal;
  }

  // --------- Internal helpers ---------

  /**
   * Detect overall trend: "LONG", "SHORT" or null
   * Based on last N candles being above/below both EMAs.
   */
  private detectTrend(
    candles: Candle[],
    fastEma: number[],
    slowEma: number[],
    lookback: number
  ): Direction | null {
    const n = candles.length;
    if (n < lookback + 1) return null;

    let above = true;
    let below = true;
    for (let i = n - lookback; i < n; i++) {
      const c = candles[i].close;
      const fe = fastEma[i];
      const se = slowEma[i];
      if (!Number.isFinite(fe) || !Number.isFinite(se)) {
        return null;
      }
      if (!(c > fe && c > se)) above = false;
      if (!(c < fe && c < se)) below = false;
    }

    if (above && !below) return "LONG";
    if (below && !above) return "SHORT";
    return null;
  }

  /**
   * Pivot detection: local highs/lows.
   */
  private findPivots(
    candles: Candle[],
    lookback: number
  ): Array<{ index: number; type: "HIGH" | "LOW"; price: number }> {
    const pivots: Array<{ index: number; type: "HIGH" | "LOW"; price: number }> = [];

    for (let i = lookback; i < candles.length - lookback; i++) {
      const high = candles[i].high;
      const low = candles[i].low;

      let isHigh = true;
      let isLow = true;

      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j === i) continue;
        if (candles[j].high >= high) isHigh = false;
        if (candles[j].low <= low) isLow = false;
        if (!isHigh && !isLow) break;
      }

      if (isHigh) {
        pivots.push({ index: i, type: "HIGH", price: high });
      } else if (isLow) {
        pivots.push({ index: i, type: "LOW", price: low });
      }
    }

    return pivots;
  }

  /**
   * Detect a single best liquidity sweep -> breakout pattern
   * near the end of the candles array, honoring master direction.
   */
  private detectLiquiditySweepBreakoutPattern(
    candles: Candle[],
    pivots: Array<{ index: number; type: "HIGH" | "LOW"; price: number }>,
    atr: number[],
    trendDirection: Direction,
    masterDirection: Direction
  ): {
    direction: Direction;
    pivotIndex: number;
    sweepIndex: number;
    breakoutIndex: number;
    pivotLevel: number;
    sweepLevel: number;
    breakoutLevel: number;
  } | null {
    const lastIndex = candles.length - 1;
    const mainDirection: Direction =
      masterDirection === trendDirection ? masterDirection : trendDirection;

    const candidates: Array<{
      direction: Direction;
      pivotIndex: number;
      sweepIndex: number;
      breakoutIndex: number;
      pivotLevel: number;
      sweepLevel: number;
      breakoutLevel: number;
    }> = [];

    for (const pivot of pivots) {
      // Ignore very old pivots
      if (lastIndex - pivot.index > this.maxPatternAgeBars) continue;

      if (mainDirection === "LONG" && pivot.type === "LOW") {
        const candidate = this.detectLongPatternFromPivot(candles, pivot, atr);
        if (candidate) candidates.push(candidate);
      } else if (mainDirection === "SHORT" && pivot.type === "HIGH") {
        const candidate = this.detectShortPatternFromPivot(candles, pivot, atr);
        if (candidate) candidates.push(candidate);
      }
    }

    if (candidates.length === 0) return null;

    // Choose the most recent breakout
    candidates.sort((a, b) => a.breakoutIndex - b.breakoutIndex);
    return candidates[candidates.length - 1];
  }

  private detectLongPatternFromPivot(
    candles: Candle[],
    pivot: { index: number; type: "HIGH" | "LOW"; price: number },
    atr: number[]
  ): {
    direction: Direction;
    pivotIndex: number;
    sweepIndex: number;
    breakoutIndex: number;
    pivotLevel: number;
    sweepLevel: number;
    breakoutLevel: number;
  } | null {
    const pivotIndex = pivot.index;
    const pivotLow = pivot.price;

    // 1) Sweep: price must take out the pivotLow by some ATR fraction
    let sweepIndex: number | null = null;
    let sweepLow = Number.POSITIVE_INFINITY;

    for (let i = pivotIndex + 1; i < candles.length; i++) {
      const barLow = candles[i].low;
      const barAtr = atr[i];
      if (!Number.isFinite(barAtr)) continue;

      const requiredLow = pivotLow - barAtr * this.sweepAtrMultiplier;
      if (barLow < requiredLow) {
        sweepIndex = i;
        sweepLow = barLow;
        break;
      }
    }

    if (sweepIndex == null) return null;

    // 2) Breakout: close above high of sweep or above recent high after sweep
    const minBreakoutIndex = sweepIndex + this.minBarsBetweenPivotAndBreakout;
    let breakoutIndex: number | null = null;
    let breakoutLevel = Number.NaN;

    // define reference high (you can also use max high between pivot and sweep)
    let refHigh = candles[pivotIndex].high;
    for (let i = pivotIndex; i <= sweepIndex; i++) {
      refHigh = Math.max(refHigh, candles[i].high);
    }

    for (let i = minBreakoutIndex; i < candles.length; i++) {
      if (candles[i].close > refHigh) {
        breakoutIndex = i;
        breakoutLevel = candles[i].close;
      }
    }

    if (breakoutIndex == null) return null;

    return {
      direction: "LONG",
      pivotIndex,
      sweepIndex,
      breakoutIndex,
      pivotLevel: pivotLow,
      sweepLevel: sweepLow,
      breakoutLevel,
    };
  }

  private detectShortPatternFromPivot(
    candles: Candle[],
    pivot: { index: number; type: "HIGH" | "LOW"; price: number },
    atr: number[]
  ): {
    direction: Direction;
    pivotIndex: number;
    sweepIndex: number;
    breakoutIndex: number;
    pivotLevel: number;
    sweepLevel: number;
    breakoutLevel: number;
  } | null {
    const pivotIndex = pivot.index;
    const pivotHigh = pivot.price;

    // 1) Sweep: price must take out the pivotHigh by some ATR fraction
    let sweepIndex: number | null = null;
    let sweepHigh = Number.NEGATIVE_INFINITY;

    for (let i = pivotIndex + 1; i < candles.length; i++) {
      const barHigh = candles[i].high;
      const barAtr = atr[i];
      if (!Number.isFinite(barAtr)) continue;

      const requiredHigh = pivotHigh + barAtr * this.sweepAtrMultiplier;
      if (barHigh > requiredHigh) {
        sweepIndex = i;
        sweepHigh = barHigh;
        break;
      }
    }

    if (sweepIndex == null) return null;

    // 2) Breakout: close below low of sweep or below recent low after sweep
    const minBreakoutIndex = sweepIndex + this.minBarsBetweenPivotAndBreakout;
    let breakoutIndex: number | null = null;
    let breakoutLevel = Number.NaN;

    let refLow = candles[pivotIndex].low;
    for (let i = pivotIndex; i <= sweepIndex; i++) {
      refLow = Math.min(refLow, candles[i].low);
    }

    for (let i = minBreakoutIndex; i < candles.length; i++) {
      if (candles[i].close < refLow) {
        breakoutIndex = i;
        breakoutLevel = candles[i].close;
      }
    }

    if (breakoutIndex == null) return null;

    return {
      direction: "SHORT",
      pivotIndex,
      sweepIndex,
      breakoutIndex,
      pivotLevel: pivotHigh,
      sweepLevel: sweepHigh,
      breakoutLevel,
    };
  }

  // --------- Indicator Utilities ---------
  // Using centralized indicators library

  private computeEMA(values: number[], period: number): number[] {
    // Use centralized EMA calculation
    const Indicators = require("../indicators");
    return Indicators.EMAArray(values, period);
  }

  private computeATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    // Use centralized ATR calculation
    const Indicators = require("../indicators");

    // Convert to Candle format for ATR calculation
    const candles: Candle[] = [];
    for (let i = 0; i < highs.length; i++) {
      candles.push({
        time: "", // Not needed for ATR
        open: closes[i], // Not needed for ATR
        high: highs[i],
        low: lows[i],
        close: closes[i],
        volume: 0, // Not needed for ATR
      });
    }

    return Indicators.ATRArray(candles, period);
  }

  // --------- Quality scoring helpers ---------

  private computeStructureScore(
    pattern: {
      pivotIndex: number;
      sweepIndex: number;
      breakoutIndex: number;
    },
    atr: number[]
  ): number {
    const distanceBars = pattern.breakoutIndex - pattern.pivotIndex;
    if (distanceBars <= 0) return 0.1;

    // Punish patterns that take too long or too short to form
    let score = 1;

    if (distanceBars < 5) score *= 0.6;
    if (distanceBars > 40) score *= 0.7;

    // ATR stability (rough heuristic)
    const idx = pattern.breakoutIndex;
    const a = atr[idx];
    if (!Number.isFinite(a) || a <= 0) return 0.3;

    return Math.max(0, Math.min(1, score));
  }

  private computeVolatilityScore(atrValue: number, price: number): number {
    if (!Number.isFinite(atrValue) || !Number.isFinite(price) || price <= 0) {
      return 0.3;
    }
    const atrPct = atrValue / price;

    // Ideal range (for intraday breakout) somewhere between 0.3% and 2%
    if (atrPct < 0.003) return 0.3; // too quiet
    if (atrPct > 0.03) return 0.4; // too wild

    // Nice window → higher score
    if (atrPct >= 0.003 && atrPct <= 0.02) return 0.9;
    return 0.7;
  }
}

// =========================
// Adapter: LiquiditySweepBreakoutPatternStrategy
// מממש IPatternStrategy עבור הסורק + מנוע הביצוע
// =========================

export class LiquiditySweepBreakoutPatternStrategy implements IPatternStrategy {
  name = "LIQUIDITY_SWEEP_BREAKOUT";
  direction: "LONG" | "SHORT" | "BOTH" = "BOTH"; // Supports both directions

  // Store master info per symbol for thread-safe access
  private masterInfoMap: Map<string, MasterSymbolInfo> = new Map();
  private currentTimeframe = "5m"; // Default, should be provided by scanner config

  constructor(private impl: LiquiditySweepBreakoutStrategy) {}

  /**
   * Called by scanner wrapper to set context before detectPattern is called
   * This allows the adapter to access master info during pattern detection
   */
  setContextForSymbol(symbol: string, masterInfo: MasterSymbolInfo, timeframe?: string): void {
    this.masterInfoMap.set(symbol, masterInfo);
    if (timeframe) this.currentTimeframe = timeframe;
  }

  /**
   * Clear context for a symbol (cleanup)
   */
  clearContextForSymbol(symbol: string): void {
    this.masterInfoMap.delete(symbol);
  }

  detectPattern(candles: Candle[], indicators?: IndicatorSnapshot): PatternDetectionResult {
    // Extract symbol from candles (first candle or last)
    if (candles.length === 0) {
      return {
        patternFound: false,
        reason: "no-candles",
      };
    }

    // Try to get master info from map
    // The scanner should call setContextForSymbol before detectPattern
    let masterInfo: MasterSymbolInfo | null = null;

    if (this.masterInfoMap.size === 1) {
      // Most common case: single symbol being scanned
      masterInfo = Array.from(this.masterInfoMap.values())[0];
    } else if (this.masterInfoMap.size > 1) {
      // Multiple symbols - use first available
      const candidates = Array.from(this.masterInfoMap.values());
      masterInfo = candidates[0];
    }

    // If no master info available, return no pattern
    if (!masterInfo) {
      return {
        patternFound: false,
        reason: "no-master-context-available",
      };
    }

    // Build StrategyContext from available info
    const context: StrategyContext = {
      symbol: masterInfo.symbol,
      timeframe: this.currentTimeframe,
      master: masterInfo,
      minMasterScore: undefined, // Use strategy default
      now: new Date(),
    };

    // Use the new modular structure: detectPattern -> entry -> stops
    const state = this.impl.detectPattern(candles, context);

    if (!state.patternFound) {
      return {
        patternFound: false,
        reason: state.reason || "pattern-not-found",
      };
    }

    // Get entry signal
    const entrySignal = this.impl.entry(candles, state);
    if (!entrySignal.enter || !entrySignal.price) {
      return {
        patternFound: false,
        reason: "entry-conditions-not-met",
      };
    }

    // Get stop levels
    const stopLevels = this.impl.stops(candles, state);
    if (!stopLevels) {
      return {
        patternFound: false,
        reason: "stop-calculation-failed",
      };
    }

    const riskPerShare = Math.abs(entrySignal.price - stopLevels.initial);

    // Convert to PatternDetectionResult (same structure as DoubleTop)
    const result: PatternDetectionResult = {
      patternFound: true,
      reason: state.reason || "liquidity-sweep-breakout-detected",
      entryPrice: entrySignal.price,
      stopLoss: stopLevels.initial,
      metadata: {
        patternName: this.name,
        direction: state.direction!,
        pivotIndex: state.pivotIndex!,
        sweepIndex: state.sweepIndex!,
        breakoutIndex: state.breakoutIndex!,
        pivotLevel: state.pivotLevel!,
        sweepLevel: state.sweepLevel!,
        breakoutLevel: state.breakoutLevel!,
        structureScore: state.structureScore!,
        volatilityScore: state.volatilityScore!,
        qualityScore: state.qualityScore!,
        atrAtBreakout: state.atrAtBreakout!,
        side: state.direction!,
        riskPerShare,
      },
    };

    return result;
  }
}
