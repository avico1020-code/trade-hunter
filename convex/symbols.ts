/**
 * Symbols - Convex Functions
 * 
 * Provides queries for active symbols used in market data backfill
 */

import { query } from "./_generated/server";

/**
 * Get all unique symbols from the active stocks lists
 * This is used for backfilling intraday bars on server startup
 * 
 * For server-side usage, this can aggregate symbols from all users or
 * use a specific user context. For Phase 5, we'll use all symbols that
 * exist in any active list.
 */
export const getActiveSymbols = query({
  args: {},
  handler: async (ctx) => {
    // Get all stocks from all active lists
    // This aggregates symbols across all users' active lists
    const allStocks = await ctx.db
      .query("listStocks")
      .collect();

    // Extract unique symbols (case-insensitive)
    const uniqueSymbols = new Set<string>();
    for (const stock of allStocks) {
      uniqueSymbols.add(stock.symbol.toUpperCase());
    }

    return Array.from(uniqueSymbols).sort();
  },
});

/**
 * Alternative: Get symbols that have intraday bars for today
 * This can be used if we want to only backfill symbols that already have data
 */
export const getSymbolsWithBarsToday = query({
  args: {
    tradingDay: v.string(),
  },
  handler: async (ctx, { tradingDay }) => {
    const bars = await ctx.db
      .query("intradayBars")
      .withIndex("by_trading_day", (q) => q.eq("tradingDay", tradingDay))
      .collect();

    const uniqueSymbols = new Set<string>();
    for (const bar of bars) {
      uniqueSymbols.add(bar.symbol.toUpperCase());
    }

    return Array.from(uniqueSymbols).sort();
  },
});

