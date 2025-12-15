// Public queries for client-side usage

import { v } from "convex/values";
import { query } from "./_generated/server";

// Get cached quote from DB (for real-time display)
export const getQuote = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();
    const cached = await ctx.db
      .query("yahooQuotes")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();

    if (cached && cached.expiresAt > now) {
      return {
        symbol: cached.symbol,
        price: cached.price,
        change: cached.change,
        changePercent: cached.changePercent,
        volume: cached.volume,
        timestamp: cached.timestamp,
      };
    }

    return null;
  },
});

// Get multiple quotes
export const getMultipleQuotes = query({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, { symbols }) => {
    const now = Date.now();
    const results = [];

    for (const symbol of symbols) {
      const cached = await ctx.db
        .query("yahooQuotes")
        .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
        .first();

      if (cached && cached.expiresAt > now) {
        results.push({
          symbol: cached.symbol,
          price: cached.price,
          change: cached.change,
          changePercent: cached.changePercent,
          volume: cached.volume,
          timestamp: cached.timestamp,
        });
      }
    }

    return results;
  },
});

// Get news for a symbol
export const getNews = query({
  args: { symbol: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { symbol, limit = 20 }) => {
    const now = Date.now();
    const cached = await ctx.db
      .query("yahooNews")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .order("desc")
      .take(limit);

    return cached.map((item) => ({
      title: item.title,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
    }));
  },
});

// Get historical data for chart
export const getHistoricalData = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();
    const cached = await ctx.db
      .query("yahooHistorical")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();

    if (cached && cached.expiresAt > now) {
      return {
        symbol: cached.symbol,
        chartData: cached.chartData,
        timestamp: cached.timestamp,
      };
    }

    return null;
  },
});
