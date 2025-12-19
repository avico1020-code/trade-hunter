/**
 * Simulation Data Loader - Phase 8
 *
 * Pluggable interface for loading historical/synthetic ticks for simulation
 *
 * Currently stubbed - can be extended to load from:
 * - Convex stored historical bars/ticks
 * - External API that provides historical data
 * - Local CSV/JSON files in the repo
 */

import type { SimulationTick } from "./SimulationController";

export interface SimulationDataOptions {
  datasetId: string; // e.g. "AAPL_2025-01-10"
  symbols?: string[]; // filter by symbols if needed
}

/**
 * Load simulation data from a configured source
 *
 * @param opts Options for loading simulation data
 * @returns Array of simulation ticks
 */
export async function loadSimulationData(opts: SimulationDataOptions): Promise<SimulationTick[]> {
  console.log(
    `[Simulation Data Loader] Loading dataset: "${opts.datasetId}" ` +
      `${opts.symbols ? `for symbols: ${opts.symbols.join(", ")}` : ""}`
  );

  // TODO: Implement real data loading from:
  // - Convex: Query intradayBars table and convert to ticks
  // - Files: Read from data/simulation/*.json or *.csv
  // - External API: Fetch from historical data provider

  // For now, return stubbed data as an example
  // This demonstrates the expected format
  const stubbedTicks: SimulationTick[] = generateStubTicks(opts);

  console.log(
    `[Simulation Data Loader] ✅ Loaded ${stubbedTicks.length} ticks from dataset "${opts.datasetId}"`
  );

  return stubbedTicks;
}

/**
 * Generate stub ticks for testing (Phase 8)
 * Replace this with real data loading logic later
 */
function generateStubTicks(opts: SimulationDataOptions): SimulationTick[] {
  const symbols = opts.symbols ?? ["AAPL", "SPY"];
  const ticks: SimulationTick[] = [];

  // Generate some sample ticks for each symbol
  // Start from a base timestamp (e.g., today 9:30 AM ET)
  const baseDate = new Date();
  baseDate.setHours(9, 30, 0, 0); // Market open
  const baseTs = baseDate.getTime();

  for (const symbol of symbols) {
    const basePrice = symbol === "AAPL" ? 190.0 : symbol === "SPY" ? 500.0 : 100.0;

    // Generate 100 ticks per symbol, 1 second apart
    for (let i = 0; i < 100; i++) {
      const tickTs = baseTs + i * 1000; // 1 second intervals

      // Simulate price movement with some randomness
      const priceChange = (Math.random() - 0.5) * 0.5; // ±0.25
      const price = basePrice + priceChange * (i / 10); // Gradual drift

      ticks.push({
        symbol,
        price: Math.round(price * 100) / 100, // Round to 2 decimals
        size: Math.floor(Math.random() * 1000) + 100, // Random volume
        ts: tickTs,
      });
    }
  }

  // Sort all ticks by timestamp
  return ticks.sort((a, b) => a.ts - b.ts);
}
