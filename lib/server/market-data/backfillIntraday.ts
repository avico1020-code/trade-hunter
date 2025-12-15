/**
 * Intraday Backfill - Phase 5
 *
 * Backfills intraday bars from Convex into MarketDataHub on server startup
 * This allows the algorithm to resume with full intraday history from the start of the day
 */

import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "../convex/client";
import { getMarketDataHub } from "./MarketDataHub";
import type { IntradayBar, Timeframe } from "./types";

const TIMEFRAMES: Timeframe[] = ["1s", "5s", "1m"];

// Phase 7: Backfill status tracking
const backfillStatus = {
  hasRun: false,
  lastRunTs: null as number | null,
  lastError: null as null | { message: string; ts: number },
  symbolsLoaded: 0,
  barsLoaded: 0,
};

/**
 * Run intraday backfill for the current trading day
 * Loads all bars from Convex and injects them into MarketDataHub
 *
 * This should be called once on server startup, before streaming starts
 */
export async function runIntradayBackfillForToday(): Promise<void> {
  if (backfillStatus.hasRun) {
    console.log(`[Intraday Backfill] ⏭️  Backfill already completed, skipping...`);
    return;
  }

  const startTime = Date.now();
  console.log(
    `[Intraday Backfill] 🚀 Starting intraday backfill for today at ${new Date(startTime).toISOString()}...`
  );

  // Phase 7: Reset status before starting
  backfillStatus.lastError = null;
  backfillStatus.symbolsLoaded = 0;
  backfillStatus.barsLoaded = 0;

  const hub = getMarketDataHub();
  const convex = getConvexServerClient();

  try {
    // 1. Determine today's trading day string
    const now = Date.now();
    const tradingDay = hub.getTradingDayForTs(now);
    console.log(`[Intraday Backfill] 📅 Current trading day: ${tradingDay}`);

    // 2. Load active symbols from Convex
    let symbols: string[] = [];
    try {
      symbols = await convex.query(api.symbols.getActiveSymbols, {});
      console.log(
        `[Intraday Backfill] 📊 Found ${symbols.length} active symbols: ${symbols.join(", ")}`
      );
    } catch (err) {
      console.warn(
        `[Intraday Backfill] ⚠️  Failed to load active symbols, trying alternative method:`,
        err
      );

      // Fallback: Get symbols that have bars for today
      try {
        symbols = await convex.query(api.symbols.getSymbolsWithBarsToday, { tradingDay });
        console.log(
          `[Intraday Backfill] 📊 Found ${symbols.length} symbols with bars today: ${symbols.join(", ")}`
        );
      } catch (fallbackErr) {
        console.error(
          `[Intraday Backfill] ❌ Failed to load symbols via fallback method:`,
          fallbackErr
        );
        // Continue with empty symbols array - backfill will be skipped
      }
    }

    if (symbols.length === 0) {
      console.log(`[Intraday Backfill] ⚠️  No active symbols found, skipping backfill`);
      // Phase 7: Mark as run even if no symbols
      backfillStatus.hasRun = true;
      backfillStatus.lastRunTs = Date.now();
      return;
    }

    // 3. For each symbol and timeframe, load bars from Convex and feed into the hub
    let totalBarsLoaded = 0;

    for (const symbol of symbols) {
      const symbolKey = symbol.toUpperCase();

      for (const timeframe of TIMEFRAMES) {
        try {
          const bars = await convex.query(api.intradayBars.loadIntradayBarsForDay, {
            symbol: symbolKey,
            timeframe,
            tradingDay,
          });

          if (bars.length > 0) {
            // Load each bar into MarketDataHub
            for (const bar of bars) {
              const intradayBar: IntradayBar = {
                symbol: bar.symbol.toUpperCase(),
                timeframe: bar.timeframe as Timeframe,
                startTs: bar.startTs,
                endTs: bar.endTs,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
              };

              hub.loadHistoricalBar(intradayBar);
              totalBarsLoaded++;
            }

            console.log(
              `[Intraday Backfill] ✅ Loaded ${bars.length} ${timeframe} bars for ${symbolKey}`
            );
          }
        } catch (err) {
          console.error(
            `[Intraday Backfill] ❌ Failed to load bars for ${symbolKey} ${timeframe}:`,
            err
          );
          // Continue with other symbols/timeframes even if one fails
        }
      }
    }

    // Phase 7: Update status on success
    backfillStatus.hasRun = true;
    backfillStatus.lastRunTs = Date.now();
    backfillStatus.symbolsLoaded = symbols.length;
    backfillStatus.barsLoaded = totalBarsLoaded;

    console.log(
      `[Intraday Backfill] ✅ Backfill completed at ${new Date(backfillStatus.lastRunTs).toISOString()}! ` +
        `Loaded ${totalBarsLoaded} bars for ${symbols.length} symbols across ${TIMEFRAMES.length} timeframes`
    );
  } catch (err) {
    // Phase 7: Track error
    const errorTs = Date.now();
    const errorMessage = err instanceof Error ? err.message : String(err);
    backfillStatus.lastError = { message: errorMessage, ts: errorTs };
    backfillStatus.hasRun = true; // Mark as run to prevent retries
    backfillStatus.lastRunTs = errorTs; // Still record when it ran (even if failed)

    console.error(
      `[Intraday Backfill] ❌ Backfill failed at ${new Date(errorTs).toISOString()}:`,
      errorMessage
    );
    // Don't throw - backfill failure shouldn't prevent server startup
    // The system can still operate with empty history
  }
}

/**
 * Get backfill status (Phase 7)
 */
export function getBackfillStatus() {
  return { ...backfillStatus }; // Return copy to prevent external mutation
}

/**
 * Reset the backfill flag (useful for testing)
 */
export function resetBackfillFlag(): void {
  backfillStatus.hasRun = false;
  backfillStatus.lastRunTs = null;
  backfillStatus.lastError = null;
  backfillStatus.symbolsLoaded = 0;
  backfillStatus.barsLoaded = 0;
}
