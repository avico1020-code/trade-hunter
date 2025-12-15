/**
 * Market Data Test Utilities - Phase 9
 *
 * Helper functions for testing MarketDataHub and related components
 */

import { MarketDataHub } from "@/lib/server/market-data/MarketDataHub";
import type { IntradayBar, MarketTick, Timeframe } from "@/lib/server/market-data/types";

/**
 * Create a clean MarketDataHub instance for testing
 * Resets all state to ensure tests start from a clean slate
 *
 * @returns Clean MarketDataHub instance
 */
export function createTestHub(): MarketDataHub {
  const hub = MarketDataHub.getInstance();
  hub.resetForTests();
  return hub;
}

/**
 * Create a synthetic market tick for testing
 *
 * @param symbol Stock symbol (e.g., "AAPL")
 * @param price Price of the tick
 * @param ts Timestamp in milliseconds (unix ms)
 * @param size Volume/size of the tick (default: 100)
 * @returns MarketTick object
 */
export function makeTick(
  symbol: string,
  price: number,
  ts: number,
  size: number = 100
): MarketTick {
  return { symbol, price, ts, size };
}

/**
 * Feed ticks sequentially into MarketDataHub
 *
 * @param hub MarketDataHub instance
 * @param ticks Array of ticks to feed
 */
export function feedTicksSequentially(hub: MarketDataHub, ticks: MarketTick[]): void {
  for (const tick of ticks) {
    // Convert MarketTick to Tick format for setLastTick
    hub.setLastTick(tick.symbol, {
      symbol: tick.symbol,
      timestamp: tick.ts,
      price: tick.price,
      last: tick.price,
      volume: tick.size,
      lastSize: tick.size,
    });
  }
}

/**
 * Get a snapshot of bars for a symbol and timeframe
 *
 * @param hub MarketDataHub instance
 * @param symbol Stock symbol
 * @param timeframe Bar timeframe
 * @returns Array of intraday bars
 */
export function getBarsSnapshot(
  hub: MarketDataHub,
  symbol: string,
  timeframe: Timeframe
): IntradayBar[] {
  return hub.getBars(symbol, timeframe);
}

/**
 * Assert that a bar matches expected values
 * Useful for test assertions
 *
 * @param bar The bar to check
 * @param expected Expected values (all optional, only checks provided fields)
 */
export function assertBar(
  bar: IntradayBar,
  expected: {
    symbol?: string;
    timeframe?: Timeframe;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  }
): void {
  if (expected.symbol !== undefined) {
    expect(bar.symbol).toBe(expected.symbol);
  }
  if (expected.timeframe !== undefined) {
    expect(bar.timeframe).toBe(expected.timeframe);
  }
  if (expected.open !== undefined) {
    expect(bar.open).toBeCloseTo(expected.open, 5);
  }
  if (expected.high !== undefined) {
    expect(bar.high).toBeCloseTo(expected.high, 5);
  }
  if (expected.low !== undefined) {
    expect(bar.low).toBeCloseTo(expected.low, 5);
  }
  if (expected.close !== undefined) {
    expect(bar.close).toBeCloseTo(expected.close, 5);
  }
  if (expected.volume !== undefined) {
    expect(bar.volume).toBeCloseTo(expected.volume, 5);
  }
}

// Note: This file uses Jest expect() which will be available in test files
// We need to import expect in actual test files, not here
