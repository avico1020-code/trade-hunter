/**
 * Intraday Bars - Convex Functions
 *
 * Phase 4: Database persistence for intraday bars
 * - Save bars when they close
 * - Load bars for backfill
 * - Cleanup old bars (3-day retention)
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save an intraday bar to the database
 * Called when a bar closes in MarketDataHub
 */
export const saveIntradayBar = mutation({
  args: {
    symbol: v.string(),
    timeframe: v.string(), // "1s" | "5s" | "1m"
    tradingDay: v.string(), // "2025-12-08"
    startTs: v.number(),
    endTs: v.number(),
    open: v.number(),
    high: v.number(),
    low: v.number(),
    close: v.number(),
    volume: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("intradayBars", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Load intraday bars for a specific symbol, timeframe, and trading day
 * Used for intraday backfill in future phases
 */
export const loadIntradayBarsForDay = query({
  args: {
    symbol: v.string(),
    timeframe: v.string(), // "1s" | "5s" | "1m"
    tradingDay: v.string(), // "2025-12-08"
  },
  handler: async (ctx, args) => {
    const bars = await ctx.db
      .query("intradayBars")
      .withIndex("by_symbol_timeframe_day", (q) =>
        q
          .eq("symbol", args.symbol.toUpperCase())
          .eq("timeframe", args.timeframe)
          .eq("tradingDay", args.tradingDay)
      )
      .order("asc") // Ordered by startTs (via index)
      .collect();

    return bars;
  },
});

/**
 * Cleanup old intraday bars - keeps only the last 3 trading days
 * This mutation should be called periodically or when a new trading day is detected
 */
export const cleanupOldIntradayBars = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all bars to find distinct trading days
    const allBars = await ctx.db
      .query("intradayBars")
      .withIndex("by_trading_day")
      .order("asc")
      .collect();

    if (allBars.length === 0) {
      return { deleted: 0, daysDeleted: [] };
    }

    // Extract distinct trading days and sort them (oldest first)
    const distinctDays = Array.from(new Set(allBars.map((bar) => bar.tradingDay))).sort();

    // If we have 3 or fewer days, nothing to clean up
    if (distinctDays.length <= 3) {
      return { deleted: 0, daysDeleted: [] };
    }

    // Determine which days to delete (all except the latest 3)
    const daysToDelete = distinctDays.slice(0, distinctDays.length - 3);

    console.log(
      `[cleanupOldIntradayBars] Found ${distinctDays.length} trading days. ` +
        `Keeping last 3: [${distinctDays.slice(-3).join(", ")}]. ` +
        `Deleting old days: [${daysToDelete.join(", ")}]`
    );

    let totalDeleted = 0;
    const deletedDays: string[] = [];

    // Delete all bars for each old trading day
    for (const day of daysToDelete) {
      const barsToDelete = await ctx.db
        .query("intradayBars")
        .withIndex("by_trading_day", (q) => q.eq("tradingDay", day))
        .collect();

      for (const bar of barsToDelete) {
        await ctx.db.delete(bar._id);
        totalDeleted++;
      }

      deletedDays.push(day);

      console.log(
        `[cleanupOldIntradayBars] Deleted ${barsToDelete.length} bars for trading day ${day}`
      );
    }

    return {
      deleted: totalDeleted,
      daysDeleted: deletedDays,
      keptDays: distinctDays.slice(-3),
    };
  },
});

/**
 * Get all distinct trading days in the database
 * Useful for diagnostics and cleanup scheduling
 */
export const getDistinctTradingDays = query({
  args: {},
  handler: async (ctx) => {
    const allBars = await ctx.db
      .query("intradayBars")
      .withIndex("by_trading_day")
      .order("asc")
      .collect();

    const distinctDays = Array.from(new Set(allBars.map((bar) => bar.tradingDay))).sort();

    // Count bars per day
    const barsPerDay: Record<string, number> = {};
    for (const bar of allBars) {
      barsPerDay[bar.tradingDay] = (barsPerDay[bar.tradingDay] || 0) + 1;
    }

    return {
      days: distinctDays,
      barsPerDay,
      totalBars: allBars.length,
    };
  },
});
