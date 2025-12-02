// Convex Actions for IBKR TWS Socket API
// These actions call Next.js API routes which connect to TWS via Socket

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Next.js API base URL (for local development)
const NEXTJS_API_URL = process.env.NEXTJS_URL || "http://localhost:3000";

/**
 * Connect to TWS/IB Gateway
 */
export const connect = action({
  args: {},
  handler: async () => {
    try {
      const response = await fetch(`${NEXTJS_API_URL}/api/ibkr-tws/connect`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect");
      }

      return data;
    } catch (error) {
      console.error("TWS connection error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to connect to TWS"
      );
    }
  },
});

/**
 * Get market data for a single symbol (with caching and rate limiting)
 */
export const getMarketData = action({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    try {
      // Check cache first
      const cached = await ctx.runQuery(internal.ibkrCache.getCachedMarketData, {
        symbol,
      });

      if (cached) {
        console.log(`Cache hit for ${symbol}`);
        return {
          symbol: cached.symbol,
          price: cached.price,
          change: cached.change,
          changePercent: cached.changePercent,
          volume: cached.volume,
          bid: cached.bid,
          ask: cached.ask,
          high: cached.high,
          low: cached.low,
          open: cached.open,
          close: cached.close,
        };
      }

      // Check rate limit
      const rateLimitCheck = await ctx.runQuery(internal.ibkrCache.checkRateLimit, {
        endpoint: "marketData",
      });

      if (!rateLimitCheck.allowed) {
        throw new Error(
          `Rate limit exceeded. Please wait ${Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)} seconds.`
        );
      }

      // Record API call
      await ctx.runMutation(internal.ibkrCache.recordApiCall, {
        endpoint: "marketData",
      });

      // Fetch from API
      const response = await fetch(
        `${NEXTJS_API_URL}/api/ibkr-tws/market-data?symbol=${encodeURIComponent(symbol)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get market data");
      }

      // Store in cache
      await ctx.runMutation(internal.ibkrCache.storeMarketData, {
        symbol: data.symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume,
        bid: data.bid,
        ask: data.ask,
        high: data.high,
        low: data.low,
        open: data.open,
        close: data.close,
      });

      return data;
    } catch (error) {
      console.error(`Market data error for ${symbol}:`, error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to get market data"
      );
    }
  },
});

/**
 * Get market data for multiple symbols
 */
export const getMultipleMarketData = action({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, { symbols }) => {
    try {
      const response = await fetch(`${NEXTJS_API_URL}/api/ibkr-tws/market-data-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbols }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get batch market data");
      }

      return data;
    } catch (error) {
      console.error(`Batch market data error for symbols: ${symbols.join(", ")}`, error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to get batch market data"
      );
    }
  },
});

/**
 * Get historical data for charting (with caching and rate limiting)
 */
export const getHistoricalData = action({
  args: {
    symbol: v.string(),
    duration: v.optional(v.string()),
    barSize: v.optional(v.string()),
  },
  handler: async (ctx, { symbol, duration, barSize }) => {
    try {
      // Check cache first
      const cached = await ctx.runQuery(internal.ibkrCache.getCachedHistoricalData, {
        symbol,
      });

      if (cached) {
        console.log(`Cache hit for historical data: ${symbol}`);
        return {
          symbol: cached.symbol,
          chartData: cached.chartData,
        };
      }

      // Check rate limit
      const rateLimitCheck = await ctx.runQuery(internal.ibkrCache.checkRateLimit, {
        endpoint: "historicalData",
      });

      if (!rateLimitCheck.allowed) {
        throw new Error(
          `Historical data rate limit exceeded. Please wait ${Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000)} seconds.`
        );
      }

      // Record API call
      await ctx.runMutation(internal.ibkrCache.recordApiCall, {
        endpoint: "historicalData",
      });

      // Fetch from API
      const params = new URLSearchParams({ symbol });
      if (duration) params.append("duration", duration);
      if (barSize) params.append("barSize", barSize);

      const response = await fetch(
        `${NEXTJS_API_URL}/api/ibkr-tws/historical-data?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get historical data");
      }

      // Store in cache
      await ctx.runMutation(internal.ibkrCache.storeHistoricalData, {
        symbol: data.symbol,
        chartData: data.chartData,
      });

      return data;
    } catch (error) {
      console.error(`Historical data error for ${symbol}:`, error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to get historical data"
      );
    }
  },
});

