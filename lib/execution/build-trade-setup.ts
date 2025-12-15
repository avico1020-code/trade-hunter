// lib/execution/build-trade-setup.ts

/**
 * Execution Engine - Build Trade Setup Module
 *
 * This module transforms PatternFoundEvent (from TradePatternScanner) into
 * a ready-to-execute TradeSetup object.
 *
 * This is the "bridge" layer between:
 * PatternScanner → ExecutionEngine
 */

import type { PatternDetectionResult, PatternFoundEvent } from "../scanner/trade-pattern-scanner";
import type { Candle } from "../strategies/double-top";

// ============ 1) TradeSetup Interface ============

/**
 * Normalized trading setup object ready for execution.
 * This is what the Execution Engine will use to place orders.
 */
export interface TradeSetup {
  symbol: string;
  strategyName: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  meta?: {
    // Additional metadata for logging/debugging
    masterScore?: number;
    masterDirection?: string;
    patternReason?: string;
    detectedAt?: string;
    [key: string]: any;
  };
}

// ============ 2) Main Translation Function ============

/**
 * Converts a PatternFoundEvent into a TradeSetup object.
 *
 * @param event - The pattern detection event from TradePatternScanner
 * @param candles - Historical candle data needed for price calculations
 * @returns TradeSetup object if valid, null if invalid/missing data
 */
export function buildTradeSetupFromPattern(
  event: PatternFoundEvent,
  candles: Candle[]
): TradeSetup | null {
  // Validate inputs
  if (!event || !candles || candles.length === 0) {
    return null;
  }

  // Router: dispatch to strategy-specific builder
  switch (event.strategyName) {
    case "DOUBLE_TOP":
      return buildDoubleTopSetup(event, candles);

    case "DOUBLE_BOTTOM":
      // TODO: Implement when needed
      return null;

    case "GAP_UP":
      // TODO: Implement when needed
      return null;

    case "GAP_DOWN":
      // TODO: Implement when needed
      return null;

    case "REVERSAL":
      // TODO: Implement when needed
      return null;

    default:
      // Unknown strategy - cannot build setup
      return null;
  }
}

// ============ 3) Strategy-Specific Builders ============

/**
 * Builds a TradeSetup for DOUBLE_TOP strategy.
 *
 * Rules:
 * - Direction: SHORT (always)
 * - Entry price: last candle close
 * - Stop loss: the "secondPeakIdx" high
 * - Take profit: None for now
 *
 * @param event - PatternFoundEvent from scanner
 * @param candles - Historical candle data
 * @returns TradeSetup or null if required data is missing
 */
function buildDoubleTopSetup(event: PatternFoundEvent, candles: Candle[]): TradeSetup | null {
  const { patternState, symbol, master } = event;

  // Validate pattern state
  if (!patternState?.patternFound) {
    return null;
  }

  // Extract required fields from patternState
  // PatternState for Double Top contains:
  // - secondPeakIdx: number (index of second peak)
  // - firstPeakIdx: number (index of first peak)
  // - neckline: number (trough low between peaks)
  // - reason: string (pattern confirmation reason)

  const secondPeakIdx = patternState.secondPeakIdx as number | undefined;

  // Validate required fields
  if (
    secondPeakIdx === undefined ||
    secondPeakIdx === null ||
    secondPeakIdx < 0 ||
    secondPeakIdx >= candles.length
  ) {
    // Missing or invalid secondPeakIdx - cannot calculate stop loss
    return null;
  }

  // Get last candle for entry price
  const lastCandle = candles[candles.length - 1];
  if (!lastCandle || typeof lastCandle.close !== "number") {
    return null;
  }

  // Get stop loss from second peak high
  const secondPeakCandle = candles[secondPeakIdx];
  if (!secondPeakCandle || typeof secondPeakCandle.high !== "number") {
    return null;
  }

  // Build TradeSetup
  const setup: TradeSetup = {
    symbol,
    strategyName: "DOUBLE_TOP",
    side: "SHORT", // Double Top is always SHORT
    entryPrice: lastCandle.close,
    stopLoss: secondPeakCandle.high,
    // takeProfit: undefined (none for now as per requirements)
    meta: {
      masterScore: master?.masterScore,
      masterDirection: master?.direction,
      patternReason: patternState.reason as string | undefined,
      detectedAt: event.detectedAt,
      firstPeakIdx: patternState.firstPeakIdx as number | undefined,
      secondPeakIdx: secondPeakIdx,
      troughIdx: patternState.troughIdx as number | undefined,
      neckline: patternState.neckline as number | undefined,
      confirmCount: patternState.confirmCount as number | undefined,
      earlyHeadsUp: patternState.earlyHeadsUp as boolean | undefined,
    },
  };

  // Final validation: ensure entry and stop are valid numbers
  if (
    !isFinite(setup.entryPrice) ||
    !isFinite(setup.stopLoss) ||
    setup.entryPrice <= 0 ||
    setup.stopLoss <= 0
  ) {
    return null;
  }

  // For SHORT: stop loss should be above entry (validation)
  if (setup.stopLoss <= setup.entryPrice) {
    // Invalid setup: stop loss should be above entry for SHORT
    // This could indicate invalid data or pattern detection issue
    return null;
  }

  return setup;
}
