/**
 * RSI + MACD Strategy Example
 *
 * דוגמה לאסטרטגיה שמשתמשת במאגר האינדיקטורים המרכזי
 *
 * אסטרטגיה זו משלבת:
 * - RSI לזיהוי oversold/overbought
 * - MACD לזיהוי שינוי מומנטום
 * - ATR לחישוב Stop Loss דינמי
 * - Bollinger Bands לסינון volatility
 */

import * as Indicators from "../indicators";
import type {
  IndicatorSnapshot,
  IPatternStrategy,
  PatternDetectionResult,
} from "../scanner/trade-pattern-scanner";
import type { StrategyState } from "./strategy-state";
import type { Candle, EntrySignal, ExitSignal, StopLevels } from "./types";

// ============================================================================
// Configuration
// ============================================================================

export interface RSIMACDConfig {
  // RSI Settings
  rsiPeriod: number; // Default: 14
  rsiOversold: number; // Default: 30
  rsiOverbought: number; // Default: 70

  // MACD Settings
  macdFast: number; // Default: 12
  macdSlow: number; // Default: 26
  macdSignal: number; // Default: 9

  // ATR Settings (for stop loss)
  atrPeriod: number; // Default: 14
  atrMultiplier: number; // Default: 2

  // Bollinger Bands (for volatility filter)
  bbPeriod: number; // Default: 20
  bbStdDev: number; // Default: 2
  minBBWidth: number; // Minimum bandwidth % (0.02 = 2%)

  // Exit Settings
  takeProfitR: number; // Take profit at R multiple (e.g., 3R)
  trailingStopR: number; // Start trailing at R multiple (e.g., 1.5R)
}

export function createDefaultRSIMACDConfig(): RSIMACDConfig {
  return {
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    atrPeriod: 14,
    atrMultiplier: 2,
    bbPeriod: 20,
    bbStdDev: 2,
    minBBWidth: 0.02, // 2%
    takeProfitR: 3,
    trailingStopR: 1.5,
  };
}

// ============================================================================
// Strategy Implementation
// ============================================================================

export class RSIMACDStrategy {
  constructor(private config: RSIMACDConfig) {}

  /**
   * Detect pattern: RSI oversold/overbought + MACD confirmation
   */
  detectPattern(candles: Candle[]): PatternDetectionResult {
    if (candles.length < this.config.macdSlow + this.config.macdSignal + 10) {
      return {
        patternFound: false,
        reason: "not-enough-data",
      };
    }

    const closes = candles.map((c) => c.close);
    const lastCandle = candles[candles.length - 1];

    // Calculate indicators using centralized library
    const rsi = Indicators.RSI(closes, this.config.rsiPeriod);
    const macd = Indicators.MACD(
      closes,
      this.config.macdFast,
      this.config.macdSlow,
      this.config.macdSignal
    );
    const atr = Indicators.ATR(candles, this.config.atrPeriod);
    const bb = Indicators.BollingerBands(closes, this.config.bbPeriod, this.config.bbStdDev);

    // Validation
    if (rsi === null || macd === null || atr === null || bb === null) {
      return {
        patternFound: false,
        reason: "indicators-calculation-failed",
      };
    }

    // Volatility filter: Skip if Bollinger Bands are too narrow (squeeze)
    const bbWidth = (bb.upper - bb.lower) / bb.middle;
    if (bbWidth < this.config.minBBWidth) {
      return {
        patternFound: false,
        reason: "volatility-too-low-bb-squeeze",
      };
    }

    // LONG Pattern: RSI Oversold + MACD Bullish Crossover
    const isOversold = rsi < this.config.rsiOversold;
    const macdBullish = macd.histogram > 0 && macd.macd > macd.signal;

    if (isOversold && macdBullish) {
      return {
        patternFound: true,
        direction: "LONG",
        entryPrice: lastCandle.close,
        stopLoss: lastCandle.close - atr * this.config.atrMultiplier,
        reason: "rsi-oversold-macd-bullish",
        metadata: {
          rsi,
          macd: macd.macd,
          macdSignal: macd.signal,
          macdHistogram: macd.histogram,
          atr,
          bbWidth,
        },
      };
    }

    // SHORT Pattern: RSI Overbought + MACD Bearish Crossover
    const isOverbought = rsi > this.config.rsiOverbought;
    const macdBearish = macd.histogram < 0 && macd.macd < macd.signal;

    if (isOverbought && macdBearish) {
      return {
        patternFound: true,
        direction: "SHORT",
        entryPrice: lastCandle.close,
        stopLoss: lastCandle.close + atr * this.config.atrMultiplier,
        reason: "rsi-overbought-macd-bearish",
        metadata: {
          rsi,
          macd: macd.macd,
          macdSignal: macd.signal,
          macdHistogram: macd.histogram,
          atr,
          bbWidth,
        },
      };
    }

    return {
      patternFound: false,
      reason: "conditions-not-met",
    };
  }

  /**
   * Entry First: Confirm entry conditions
   */
  entryFirst(candles: Candle[], patternState: PatternDetectionResult): EntrySignal {
    if (!patternState.patternFound || !patternState.entryPrice) {
      return { enter: false, leg: 1 };
    }

    // Entry confirmed if pattern detected
    return {
      enter: true,
      leg: 1,
      price: patternState.entryPrice,
      meta: {
        direction: patternState.direction,
        reason: patternState.reason,
        indicators: patternState.metadata,
      },
    };
  }

  /**
   * Entry Second: This strategy only has one entry
   */
  entrySecond(candles: Candle[], patternState: PatternDetectionResult): EntrySignal {
    return { enter: false, leg: 2 };
  }

  /**
   * Exit First: Take profit at target R or if pattern invalidated
   */
  exitFirst(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState: StrategyState
  ): ExitSignal {
    if (!patternState.patternFound || !currentState.entryPrice) {
      return { exit: false, leg: 1 };
    }

    const lastCandle = candles[candles.length - 1];
    const entryPrice = currentState.entryPrice;
    const stopLoss = patternState.stopLoss || currentState.stopLoss;
    const direction = patternState.direction || "LONG";

    if (!stopLoss) {
      return { exit: false, leg: 1 };
    }

    const riskPerShare = Math.abs(entryPrice - stopLoss);

    // Calculate current profit in R terms
    let profitPerShare: number;
    if (direction === "LONG") {
      profitPerShare = lastCandle.close - entryPrice;
    } else {
      profitPerShare = entryPrice - lastCandle.close;
    }

    const currentR = profitPerShare / riskPerShare;

    // Exit at take profit target
    if (currentR >= this.config.takeProfitR) {
      return {
        exit: true,
        leg: 1,
        reason: `take-profit-${this.config.takeProfitR}R`,
        price: lastCandle.close,
      };
    }

    // Exit if RSI crosses back (pattern invalidation)
    const closes = candles.map((c) => c.close);
    const rsi = Indicators.RSI(closes, this.config.rsiPeriod);

    if (rsi !== null) {
      // For LONG: exit if RSI goes back overbought
      if (direction === "LONG" && rsi > this.config.rsiOverbought) {
        return {
          exit: true,
          leg: 1,
          reason: "rsi-overbought-exit",
          price: lastCandle.close,
        };
      }

      // For SHORT: exit if RSI goes back oversold
      if (direction === "SHORT" && rsi < this.config.rsiOversold) {
        return {
          exit: true,
          leg: 1,
          reason: "rsi-oversold-exit",
          price: lastCandle.close,
        };
      }
    }

    return { exit: false, leg: 1 };
  }

  /**
   * Exit Second: Not used in this strategy
   */
  exitSecond(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState: StrategyState
  ): ExitSignal {
    return { exit: false, leg: 2 };
  }

  /**
   * Stops for Entry 1: Initial + Trailing
   */
  stopsForEntry1(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): StopLevels | null {
    if (!patternState.stopLoss) {
      return null;
    }

    const initial = patternState.stopLoss;

    // Calculate trailing stop if position is profitable enough
    if (currentState?.entryPrice) {
      const lastCandle = candles[candles.length - 1];
      const entryPrice = currentState.entryPrice;
      const direction = patternState.direction || "LONG";
      const riskPerShare = Math.abs(entryPrice - initial);

      let profitPerShare: number;
      if (direction === "LONG") {
        profitPerShare = lastCandle.close - entryPrice;
      } else {
        profitPerShare = entryPrice - lastCandle.close;
      }

      const currentR = profitPerShare / riskPerShare;

      // Start trailing stop at configured R level
      if (currentR >= this.config.trailingStopR) {
        // Move stop to breakeven + half the profit
        const trailingStop =
          direction === "LONG"
            ? entryPrice + profitPerShare * 0.5
            : entryPrice - profitPerShare * 0.5;

        return {
          initial,
          trailing: trailingStop,
        };
      }
    }

    return {
      initial,
      trailing: undefined,
    };
  }

  /**
   * Stops for Entry 2: Not used
   */
  stopsForEntry2(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): StopLevels | null {
    return null;
  }
}

// ============================================================================
// Pattern Strategy Adapter (for IPatternStrategy interface)
// ============================================================================

export class RSIMACDPatternStrategy implements IPatternStrategy {
  name = "RSI_MACD";
  direction: "LONG" | "SHORT" | "BOTH" = "BOTH";

  constructor(private impl: RSIMACDStrategy) {}

  detectPattern(candles: Candle[], indicators?: IndicatorSnapshot): PatternDetectionResult {
    return this.impl.detectPattern(candles);
  }

  entryFirst(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): EntrySignal {
    return this.impl.entryFirst(candles, patternState);
  }

  entrySecond(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): EntrySignal {
    return this.impl.entrySecond(candles, patternState);
  }

  exitFirst(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState: StrategyState
  ): ExitSignal {
    return this.impl.exitFirst(candles, patternState, currentState);
  }

  exitSecond(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState: StrategyState
  ): ExitSignal {
    return this.impl.exitSecond(candles, patternState, currentState);
  }

  stopsForEntry1(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): StopLevels | null {
    return this.impl.stopsForEntry1(candles, patternState, currentState);
  }

  stopsForEntry2(
    candles: Candle[],
    patternState: PatternDetectionResult,
    currentState?: StrategyState
  ): StopLevels | null {
    return this.impl.stopsForEntry2(candles, patternState, currentState);
  }
}
