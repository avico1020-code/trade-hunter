/**
 * Market Data Hub - Persistence Layer
 *
 * Phase 4: Wires MarketDataHub bar-close events to Convex database persistence
 * Phase 5: Also handles intraday backfill on startup
 *
 * This module registers a global listener for bar-close events and persists
 * them to Convex. It runs on server startup and operates asynchronously.
 */

import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "../convex/client";
import { runIntradayBackfillForToday } from "./backfillIntraday";
import { getMarketDataHub } from "./MarketDataHub";
import type { IntradayBar } from "./types";

/**
 * Initialize persistence for MarketDataHub
 *
 * Phase 4: Registers listeners for bar-close events and saves them to Convex
 * Phase 5: Also runs intraday backfill from Convex
 *
 * This should be called once on server startup
 */
export async function initializeMarketDataPersistence(): Promise<void> {
  const hub = getMarketDataHub();
  const convex = getConvexServerClient();

  console.log(`[Market Data Persistence] Initializing Convex persistence layer...`);

  // Phase 5: Run backfill first to restore in-memory state
  console.log(`[Market Data Persistence] Phase 5: Running intraday backfill...`);
  await runIntradayBackfillForToday();
  console.log(`[Market Data Persistence] Phase 5: Backfill completed`);

  // Register listener for all bar-close events
  hub.onBarClose(null, null, async (bar: IntradayBar) => {
    try {
      // Derive trading day from bar.startTs
      // Use the same logic as MarketDataHub.getTradingDayForTs
      const tradingDay = getTradingDayForTs(bar.startTs);

      // Save bar to Convex (fire-and-forget async, doesn't block)
      await convex.mutation(api.intradayBars.saveIntradayBar, {
        symbol: bar.symbol,
        timeframe: bar.timeframe,
        tradingDay,
        startTs: bar.startTs,
        endTs: bar.endTs,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      });

      // Log success (optional, can be removed in production if too verbose)
      // console.log(`[Market Data Persistence] ✅ Saved bar: ${bar.symbol} ${bar.timeframe} @ ${tradingDay}`);
    } catch (err) {
      // Phase 7: Enhanced error logging for observability
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        `[Market Data Persistence] ❌ Failed to persist bar for ${bar.symbol} ${bar.timeframe} ` +
          `at ${new Date().toISOString()}: ${errorMessage}`,
        err
      );
      // Don't throw - persistence failures shouldn't affect real-time processing
    }
  });

  console.log(
    `[Market Data Persistence] ✅ Persistence layer initialized and listening for bar-close events`
  );
}

/**
 * Get trading day string for a timestamp (matches MarketDataHub logic)
 * Uses New York timezone (EST/EDT) for trading day calculation
 *
 * @param ts Unix timestamp in milliseconds
 * @returns Trading day string in format "YYYY-MM-DD"
 */
function getTradingDayForTs(ts: number): string {
  // Convert to New York time (EST/EDT)
  const date = new Date(ts);
  const nyDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));

  const year = nyDate.getFullYear();
  const month = String(nyDate.getMonth() + 1).padStart(2, "0");
  const day = String(nyDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Trigger cleanup of old intraday bars (keeps only last 3 trading days)
 * Can be called periodically or when a new trading day is detected
 */
export async function cleanupOldIntradayBars(): Promise<void> {
  try {
    const convex = getConvexServerClient();
    const result = await convex.mutation(api.intradayBars.cleanupOldIntradayBars, {});

    if (result.deleted > 0) {
      console.log(
        `[Market Data Persistence] 🧹 Cleanup completed: Deleted ${result.deleted} bars ` +
          `from ${result.daysDeleted.length} old trading days: [${result.daysDeleted.join(", ")}]`
      );
    } else {
      console.log(
        `[Market Data Persistence] ✅ Cleanup: No old bars to delete (keeping ${result.keptDays?.length || 0} days)`
      );
    }
  } catch (err) {
    console.error(`[Market Data Persistence] ❌ Failed to cleanup old bars:`, err);
  }
}
