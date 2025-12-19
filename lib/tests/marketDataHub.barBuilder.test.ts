/**
 * MarketDataHub Bar Builder Tests - Phase 9
 * 
 * Tests for bar construction from ticks
 */

import { MarketDataHub } from "@/lib/server/market-data/MarketDataHub";
import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  createTestHub,
  feedTicksSequentially,
  getBarsSnapshot,
  assertBar,
  makeTick,
} from "./helpers/marketDataTestUtils";
import { scenarioSimpleUptrend, scenarioSimpleDowntrend } from "./fixtures/priceScenarios";

describe("MarketDataHub Bar Builder", () => {
  let hub: MarketDataHub;

  beforeEach(() => {
    hub = createTestHub();
  });

  describe("1-second bars", () => {
    it("should build 1s bars from ticks spaced 1 second apart", () => {
      const symbol = "TEST";
      const startTs = 1000000000000; // Fixed timestamp for determinism
      const ticks = [
        makeTick(symbol, 100.0, startTs, 100),
        makeTick(symbol, 100.5, startTs + 1000, 150),
        makeTick(symbol, 101.0, startTs + 2000, 200),
      ];

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1s");

      expect(bars.length).toBe(3);

      // First bar
      assertBar(
        bars[0],
        {
          symbol,
          timeframe: "1s",
          open: 100.0,
          high: 100.0,
          low: 100.0,
          close: 100.0,
          volume: 100,
        },
        expect
      );

      // Second bar
      assertBar(
        bars[1],
        {
          symbol,
          timeframe: "1s",
          open: 100.5,
          high: 100.5,
          low: 100.5,
          close: 100.5,
          volume: 150,
        },
        expect
      );

      // Third bar
      assertBar(
        bars[2],
        {
          symbol,
          timeframe: "1s",
          open: 101.0,
          high: 101.0,
          low: 101.0,
          close: 101.0,
          volume: 200,
        },
        expect
      );
    });

    it("should aggregate multiple ticks within the same 1s bar", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const barStart = Math.floor(startTs / 1000) * 1000; // Round down to second

      // Multiple ticks within the same second
      const ticks = [
        makeTick(symbol, 100.0, barStart, 100),
        makeTick(symbol, 100.5, barStart + 100, 150),
        makeTick(symbol, 99.5, barStart + 200, 200), // Low
        makeTick(symbol, 101.0, barStart + 300, 100), // High
        makeTick(symbol, 100.8, barStart + 400, 50), // Close
      ];

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1s");

      expect(bars.length).toBe(1);

      // Bar should aggregate all ticks
      assertBar(
        bars[0],
        {
          symbol,
          timeframe: "1s",
          open: 100.0,
          high: 101.0,
          low: 99.5,
          close: 100.8,
          volume: 600, // Sum of all sizes
        },
        expect
      );
    });
  });

  describe("1-minute bars", () => {
    it("should aggregate 60 ticks into a 1m bar", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioSimpleUptrend(symbol, startTs, 60, 100, 0.1);

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      expect(bars.length).toBeGreaterThan(0);

      const firstBar = bars[0];

      // First tick price should be open
      expect(firstBar.open).toBeCloseTo(ticks[0].price, 5);

      // Last tick in the first minute should be close
      expect(firstBar.close).toBeCloseTo(ticks[59].price, 5);

      // High should be the highest price in the minute
      expect(firstBar.high).toBeCloseTo(ticks[59].price, 5); // In uptrend, last is highest

      // Low should be the lowest price in the minute
      expect(firstBar.low).toBeCloseTo(ticks[0].price, 5); // In uptrend, first is lowest

      // Volume should be sum of all tick sizes
      const expectedVolume = ticks.slice(0, 60).reduce((sum, tick) => sum + (tick.size || 0), 0);
      expect(firstBar.volume).toBeCloseTo(expectedVolume, 5);
    });

    it("should create multiple 1m bars for longer tick sequences", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioSimpleUptrend(symbol, startTs, 120, 100, 0.1); // 2 minutes of ticks

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      // Should have at least 2 bars (120 seconds / 60 seconds per bar)
      expect(bars.length).toBeGreaterThanOrEqual(2);

      // First bar should end around tick 59
      expect(bars[0].close).toBeCloseTo(ticks[59].price, 5);

      // Second bar should start around tick 60
      if (bars.length > 1) {
        expect(bars[1].open).toBeCloseTo(ticks[60].price, 5);
      }
    });
  });

  describe("5-second bars", () => {
    it("should aggregate ticks into 5s bars", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioSimpleUptrend(symbol, startTs, 20, 100, 0.1); // 20 seconds

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "5s");

      // 20 seconds / 5 seconds per bar = 4 bars
      expect(bars.length).toBe(4);

      // First bar should have first 5 ticks
      assertBar(
        bars[0],
        {
          symbol,
          timeframe: "5s",
          open: 100.0,
          close: 100.4, // tick[4].price
        },
        expect
      );
    });
  });

  describe("uptrend scenario", () => {
    it("should show increasing closes in 1m bars for uptrend", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioSimpleUptrend(symbol, startTs, 120, 100, 0.1); // 2 minutes

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      expect(bars.length).toBeGreaterThanOrEqual(2);

      // In an uptrend, each bar's close should be higher than the previous bar's close
      for (let i = 1; i < bars.length; i++) {
        expect(bars[i].close).toBeGreaterThan(bars[i - 1].close);
      }
    });
  });

  describe("downtrend scenario", () => {
    it("should show decreasing closes in 1m bars for downtrend", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const ticks = scenarioSimpleDowntrend(symbol, startTs, 120, 100, 0.1); // 2 minutes

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      expect(bars.length).toBeGreaterThanOrEqual(2);

      // In a downtrend, each bar's close should be lower than the previous bar's close
      for (let i = 1; i < bars.length; i++) {
        expect(bars[i].close).toBeLessThan(bars[i - 1].close);
      }
    });
  });

  describe("bar OHLCV correctness", () => {
    it("should correctly track high and low within a bar", () => {
      const symbol = "TEST";
      const startTs = 1000000000000;
      const barStart = Math.floor(startTs / (60 * 1000)) * (60 * 1000); // Round to minute

      // Ticks that form a 1m bar with specific high/low
      const ticks = [
        makeTick(symbol, 100.0, barStart, 100), // Open
        makeTick(symbol, 102.0, barStart + 10000, 150), // High
        makeTick(symbol, 98.0, barStart + 30000, 200), // Low
        makeTick(symbol, 101.0, barStart + 50000, 100), // Close
      ];

      feedTicksSequentially(hub, ticks);

      const bars = getBarsSnapshot(hub, symbol, "1m");

      expect(bars.length).toBe(1);

      assertBar(
        bars[0],
        {
          open: 100.0,
          high: 102.0,
          low: 98.0,
          close: 101.0,
          volume: 550, // Sum of sizes
        },
        expect
      );
    });
  });
});

