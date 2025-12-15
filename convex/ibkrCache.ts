// IBKR Cache and Rate Limiting Management

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Cache TTL (Time To Live)
const MARKET_DATA_TTL = 5 * 60 * 1000; // 5 minutes
const HISTORICAL_DATA_TTL = 60 * 60 * 1000; // 1 hour

// Rate Limits (IBKR API limits)
const RATE_LIMITS = {
  marketData: {
    maxRequests: 100,
    windowMs: 1000, // 100 requests per second
  },
  historicalData: {
    maxRequests: 60,
    windowMs: 10 * 60 * 1000, // 60 requests per 10 minutes
  },
};

/**
 * Check if we're within rate limits for a specific endpoint
 */
export const checkRateLimit = query({
  args: {
    endpoint: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { endpoint, userId }) => {
    const limit = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS];
    if (!limit) {
      return { allowed: true, remainingRequests: 999 };
    }

    const now = Date.now();
    const windowStart = now - limit.windowMs;

    // Count requests in current window
    let query = ctx.db
      .query("ibkrRateLimits")
      .withIndex("by_endpoint_and_time", (q) =>
        q.eq("endpoint", endpoint).gt("timestamp", windowStart)
      );

    if (userId) {
      // Filter by user if specified
      query = query.filter((q) => q.eq(q.field("userId"), userId));
    }

    const recentRequests = await query.collect();
    const requestCount = recentRequests.length;

    return {
      allowed: requestCount < limit.maxRequests,
      remainingRequests: Math.max(0, limit.maxRequests - requestCount),
      resetAt: windowStart + limit.windowMs,
    };
  },
});

/**
 * Record an API call for rate limiting
 */
export const recordApiCall = internalMutation({
  args: {
    endpoint: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { endpoint, userId }) => {
    await ctx.db.insert("ibkrRateLimits", {
      endpoint,
      timestamp: Date.now(),
      userId,
    });
  },
});

/**
 * Clean up old rate limit records (for housekeeping)
 */
export const cleanupRateLimits = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - 10 * 60 * 1000; // Keep last 10 minutes

    const oldRecords = await ctx.db
      .query("ibkrRateLimits")
      .filter((q) => q.lt(q.field("timestamp"), cutoff))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { deleted: oldRecords.length };
  },
});

/**
 * Get cached market data for a symbol
 */
export const getCachedMarketData = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();
    return await ctx.db
      .query("ibkrMarketData")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .first();
  },
});

/**
 * Store market data in cache
 */
export const storeMarketData = internalMutation({
  args: {
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.number(),
    volume: v.number(),
    bid: v.number(),
    ask: v.number(),
    high: v.number(),
    low: v.number(),
    open: v.number(),
    close: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + MARKET_DATA_TTL;

    // Check if exists
    const existing = await ctx.db
      .query("ibkrMarketData")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...args,
        timestamp: now,
        expiresAt,
      });
      return existing._id;
    }

    // Insert new
    return await ctx.db.insert("ibkrMarketData", {
      ...args,
      timestamp: now,
      expiresAt,
    });
  },
});

/**
 * Get cached historical data for a symbol
 */
export const getCachedHistoricalData = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();
    return await ctx.db
      .query("ibkrHistoricalData")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .first();
  },
});

/**
 * Store historical data in cache
 */
export const storeHistoricalData = internalMutation({
  args: {
    symbol: v.string(),
    chartData: v.array(v.number()),
  },
  handler: async (ctx, { symbol, chartData }) => {
    const now = Date.now();
    const expiresAt = now + HISTORICAL_DATA_TTL;

    // Check if exists
    const existing = await ctx.db
      .query("ibkrHistoricalData")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        chartData,
        timestamp: now,
        expiresAt,
      });
      return existing._id;
    }

    // Insert new
    return await ctx.db.insert("ibkrHistoricalData", {
      symbol,
      chartData,
      timestamp: now,
      expiresAt,
    });
  },
});

/**
 * Clean up expired cache entries
 */
export const cleanupExpiredCache = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Clean market data
    const expiredMarketData = await ctx.db
      .query("ibkrMarketData")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const record of expiredMarketData) {
      await ctx.db.delete(record._id);
    }

    // Clean historical data
    const expiredHistoricalData = await ctx.db
      .query("ibkrHistoricalData")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const record of expiredHistoricalData) {
      await ctx.db.delete(record._id);
    }

    return {
      deletedMarketData: expiredMarketData.length,
      deletedHistoricalData: expiredHistoricalData.length,
    };
  },
});
