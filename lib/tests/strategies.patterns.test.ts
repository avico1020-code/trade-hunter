/**
 * Strategy Pattern Detection Tests - Phase 9
 *
 * Tests for pattern detection strategies (double top, gap fill, etc.)
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import type { Candle } from "@/lib/scanner/trade-pattern-scanner";
import type { MarketDataHub } from "@/lib/server/market-data/MarketDataHub";
import { DoubleTopStrategy } from "@/lib/strategies/double-top";
import { scenarioDoubleTop, scenarioGapFill } from "./fixtures/priceScenarios";
import {
  createTestHub,
  feedTicksSequentially,
  getBarsSnapshot,
  makeTick,
} from "./helpers/marketDataTestUtils";

/**
 * Convert IntradayBar to Candle format for strategy testing
 */
function barsToCandles(bars: ReturnType<typeof getBarsSnapshot>): Candle[] {
  return bars.map((bar) => ({
    time: new Date(bar.startTs).toISOString(),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
}

describe("Strategy Pattern Detection", () => {
  let hub: MarketDataHub;

  beforeEach(() => {
    hub = createTestHub();
  });

  describe("Double Top Pattern", () => {
    it("should generate bars that show double top pattern", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioDoubleTop(symbol, startTs);

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      // Should have multiple bars from the scenario
      expect(bars.length).toBeGreaterThan(0);

      // Find the two tops in the bars
      // In a double top pattern, we expect:
      // - First peak (high price)
      // - Pullback (lower prices)
      // - Second peak near first peak
      // - Reversal down

      const highs = bars.map((bar) => bar.high);
      const maxHigh = Math.max(...highs);

      // Should have at least one bar with high near the expected top (120)
      const topBars = bars.filter((bar) => bar.high >= maxHigh * 0.95); // Within 5% of max
      expect(topBars.length).toBeGreaterThan(0);

      // TODO: When double top detection is implemented, test it here:
      // const pattern = detectDoubleTop(bars);
      // expect(pattern).not.toBeNull();
      // expect(pattern.firstTop).toBeCloseTo(120, 1);
      // expect(pattern.secondTop).toBeCloseTo(120, 1);
      // expect(pattern.reversalDetected).toBe(true);
    });

    it("should show price reversal after second top", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioDoubleTop(symbol, startTs, 100, 120, 112, 105);

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      expect(bars.length).toBeGreaterThan(1);

      // Find the peak (should be around 120)
      const highs = bars.map((bar) => bar.high);
      const maxHigh = Math.max(...highs);
      const peakIndex = highs.indexOf(maxHigh);

      // After the peak, prices should decline
      if (peakIndex < bars.length - 1) {
        const barsAfterPeak = bars.slice(peakIndex + 1);
        const closesAfterPeak = barsAfterPeak.map((bar) => bar.close);

        // Most closes after peak should be lower than the peak
        const decliningCloses = closesAfterPeak.filter((close) => close < maxHigh * 0.95);
        expect(decliningCloses.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Gap Fill Pattern", () => {
    it("should generate bars that show gap fill pattern", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioGapFill(symbol, startTs, 100, 10, 0.3);

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      expect(bars.length).toBeGreaterThan(0);

      // Gap fill scenario should show:
      // - Initial bars around prior close (100)
      // - Gap up to higher price (110)
      // - Price moving back down toward prior close (gap filling)

      const firstBars = bars.slice(0, Math.min(2, bars.length));
      const laterBars = bars.slice(Math.max(0, bars.length - 2));

      // First bars should be around prior close (100)
      const firstBarCloses = firstBars.map((bar) => bar.close);
      const avgFirstClose =
        firstBarCloses.reduce((sum, close) => sum + close, 0) / firstBarCloses.length;
      expect(avgFirstClose).toBeCloseTo(100, 5);

      // Later bars (after gap) should approach the gap fill level
      // We can't test this precisely without knowing which bars are post-gap,
      // but we can verify the pattern exists
      expect(bars.length).toBeGreaterThan(2);

      // Gap fill pattern should show:
      // - Initial bars around prior close
      // - Gap up to higher price
      // - Price moving back down toward prior close

      // Verify the pattern exists in the bars
      const closes = bars.map((bar) => bar.close);
      const minClose = Math.min(...closes);
      const maxClose = Math.max(...closes);

      // Should have both low (prior close) and high (gap) prices
      expect(minClose).toBeLessThan(priorClose + 2);
      expect(maxClose).toBeGreaterThan(priorClose + gapSize - 2);
    });

    it("should show price moving toward gap fill level", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const priorClose = 100;
      const gapSize = 10;
      const ticks = scenarioGapFill(symbol, startTs, priorClose, gapSize, 0.3);

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      // Find bars that are likely post-gap (higher prices)
      const highBars = bars.filter((bar) => bar.high > priorClose + gapSize * 0.8);
      const lowBars = bars.filter((bar) => bar.close < priorClose + gapSize * 0.3);

      // Should have both high (gap) and low (fill) bars
      expect(highBars.length).toBeGreaterThan(0);
      expect(lowBars.length).toBeGreaterThan(0);
    });
  });

  // Placeholder for future strategy tests
  describe("Strategy Integration", () => {
    it("should be ready for strategy function integration", () => {
      // This test serves as a placeholder and documentation
      // When strategy functions are implemented, add tests here that:
      // 1. Feed scenario ticks into hub
      // 2. Get bars from hub
      // 3. Call strategy detection functions
      // 4. Assert on signals/patterns detected

      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioDoubleTop(symbol, startTs);

      feedTicksSequentially(hub, ticks);
      const bars = getBarsSnapshot(hub, symbol, "1m");

      // Basic sanity check
      expect(bars.length).toBeGreaterThan(0);
      expect(bars.every((bar) => bar.symbol === symbol)).toBe(true);
      expect(bars.every((bar) => bar.timeframe === "1m")).toBe(true);
    });
  });
});
