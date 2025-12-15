/**
 * Price Scenarios - Phase 9
 *
 * Test fixtures representing common market patterns
 * Returns arrays of MarketTick for use in tests
 */

import type { MarketTick } from "@/lib/server/market-data/types";

/**
 * Simple uptrend scenario
 * Price steadily increases over time
 *
 * @param symbol Stock symbol
 * @param startTs Starting timestamp (unix ms)
 * @param durationSeconds Number of seconds to simulate (default: 60)
 * @param startPrice Starting price (default: 100)
 * @param priceIncrement Price change per second (default: 0.1)
 * @returns Array of ticks representing an uptrend
 */
export function scenarioSimpleUptrend(
  symbol: string,
  startTs: number,
  durationSeconds: number = 60,
  startPrice: number = 100,
  priceIncrement: number = 0.1
): MarketTick[] {
  const ticks: MarketTick[] = [];
  let ts = startTs;
  let price = startPrice;

  for (let i = 0; i < durationSeconds; i++) {
    ticks.push({ symbol, price, ts, size: 100 });
    price += priceIncrement; // steadily increasing
    ts += 1000; // 1 second apart
  }

  return ticks;
}

/**
 * Simple downtrend scenario
 * Price steadily decreases over time
 *
 * @param symbol Stock symbol
 * @param startTs Starting timestamp (unix ms)
 * @param durationSeconds Number of seconds to simulate (default: 60)
 * @param startPrice Starting price (default: 100)
 * @param priceDecrement Price change per second (default: 0.1)
 * @returns Array of ticks representing a downtrend
 */
export function scenarioSimpleDowntrend(
  symbol: string,
  startTs: number,
  durationSeconds: number = 60,
  startPrice: number = 100,
  priceDecrement: number = 0.1
): MarketTick[] {
  const ticks: MarketTick[] = [];
  let ts = startTs;
  let price = startPrice;

  for (let i = 0; i < durationSeconds; i++) {
    ticks.push({ symbol, price, ts, size: 100 });
    price -= priceDecrement; // steadily decreasing
    ts += 1000; // 1 second apart
  }

  return ticks;
}

/**
 * Gap fill scenario
 *
 * Day 1: Price closes around a certain level (e.g., 100)
 * Day 2: Opens with a gap up (e.g., 110)
 * Then: Price moves back down to fill the gap toward the prior close
 *
 * @param symbol Stock symbol
 * @param startTs Starting timestamp (unix ms)
 * @param priorClose Price at which prior day closed (default: 100)
 * @param gapSize Size of the gap (default: 10)
 * @param fillSpeed How fast the gap fills (price change per tick) (default: 0.3)
 * @returns Array of ticks representing a gap fill pattern
 */
export function scenarioGapFill(
  symbol: string,
  startTs: number,
  priorClose: number = 100,
  gapSize: number = 10,
  fillSpeed: number = 0.3
): MarketTick[] {
  const ticks: MarketTick[] = [];
  let ts = startTs;

  // Day 1 close around priorClose
  for (let i = 0; i < 10; i++) {
    const price = priorClose + (Math.random() - 0.5) * 0.2; // Small variation
    ticks.push({ symbol, price, ts, size: 100 });
    ts += 1000;
  }

  // Jump forward to "next day" (overnight gap)
  // Use a larger time jump to simulate next trading day
  ts += 60 * 60 * 1000; // +1 hour as a stand-in for overnight

  // Day 2 opens with gap up
  let price = priorClose + gapSize; // Gap up

  // Price moves down to fill gap toward priorClose
  const fillTicks = 30;
  for (let i = 0; i < fillTicks; i++) {
    ticks.push({ symbol, price, ts, size: 100 });
    price -= fillSpeed;
    // Stop when we reach or go below priorClose
    if (price <= priorClose) {
      price = priorClose;
      // Add a few more ticks at the fill level
      for (let j = 0; j < 5; j++) {
        ts += 1000;
        ticks.push({ symbol, price: priorClose, ts, size: 100 });
      }
      break;
    }
    ts += 1000;
  }

  return ticks;
}

/**
 * Double top / reversal scenario
 *
 * Phase 1: Uptrend to first top (e.g., ~120)
 * Phase 2: Pullback (e.g., to ~112)
 * Phase 3: Second top near same level as first (~120)
 * Phase 4: Reversal down (e.g., to ~105)
 *
 * @param symbol Stock symbol
 * @param startTs Starting timestamp (unix ms)
 * @param startPrice Starting price (default: 100)
 * @param topPrice Price at which tops form (default: 120)
 * @param pullbackPrice Price during pullback (default: 112)
 * @param finalPrice Final price after reversal (default: 105)
 * @returns Array of ticks representing a double top pattern
 */
export function scenarioDoubleTop(
  symbol: string,
  startTs: number,
  startPrice: number = 100,
  topPrice: number = 120,
  pullbackPrice: number = 112,
  finalPrice: number = 105
): MarketTick[] {
  const ticks: MarketTick[] = [];
  let ts = startTs;
  let price = startPrice;

  // Phase 1: Uptrend to first top
  const uptrendTicks = 40;
  const priceIncrement = (topPrice - startPrice) / uptrendTicks;
  for (let i = 0; i < uptrendTicks; i++) {
    price += priceIncrement;
    ticks.push({ symbol, price, ts, size: 100 });
    ts += 1000;
  }

  // Phase 2: Pullback
  const pullbackTicks = 15;
  const pullbackDecrement = (topPrice - pullbackPrice) / pullbackTicks;
  for (let i = 0; i < pullbackTicks; i++) {
    price -= pullbackDecrement;
    ticks.push({ symbol, price, ts, size: 100 });
    ts += 1000;
  }

  // Phase 3: Second top near same level
  const secondUptrendTicks = 15;
  const secondIncrement = (topPrice - pullbackPrice) / secondUptrendTicks;
  for (let i = 0; i < secondUptrendTicks; i++) {
    price += secondIncrement;
    ticks.push({ symbol, price, ts, size: 100 });
    ts += 1000;
  }

  // Phase 4: Reversal down
  const reversalTicks = 30;
  const reversalDecrement = (topPrice - finalPrice) / reversalTicks;
  for (let i = 0; i < reversalTicks; i++) {
    price -= reversalDecrement;
    ticks.push({ symbol, price, ts, size: 100 });
    ts += 1000;
  }

  return ticks;
}

/**
 * Flat / choppy market scenario
 * Price moves sideways with volatility but no clear trend
 *
 * @param symbol Stock symbol
 * @param startTs Starting timestamp (unix ms)
 * @param basePrice Base price around which price oscillates (default: 100)
 * @param volatility Price variation range (default: 2.0)
 * @param durationSeconds Number of seconds to simulate (default: 60)
 * @returns Array of ticks representing a choppy/flat market
 */
export function scenarioChoppyMarket(
  symbol: string,
  startTs: number,
  basePrice: number = 100,
  volatility: number = 2.0,
  durationSeconds: number = 60
): MarketTick[] {
  const ticks: MarketTick[] = [];
  let ts = startTs;
  let price = basePrice;

  for (let i = 0; i < durationSeconds; i++) {
    // Random walk around basePrice with mean reversion
    const randomChange = (Math.random() - 0.5) * volatility;
    const meanReversion = (basePrice - price) * 0.1; // Pull back toward base
    price += randomChange + meanReversion;

    ticks.push({ symbol, price, ts, size: Math.floor(Math.random() * 500) + 100 });
    ts += 1000;
  }

  return ticks;
}
