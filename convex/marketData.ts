import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";

const CACHE_TTL = 30 * 1000; // 30 seconds - shorter for more real-time data

/**
 * Query: Get market data from cache
 * If data is older than 30 seconds, triggers a background refresh
 */
export const getMarketData = query({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();

    const cached = await ctx.db
      .query("marketDataCache")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();

    // If no cache or cache expired, return null (client will trigger fetch)
    if (!cached || cached.expiresAt <= now) {
      return null;
    }

    // If cache is older than 30 seconds, mark as stale (but still return it)
    // Client will trigger background refresh
    return cached;
  },
});

/**
 * Query: Get multiple symbols at once
 */
export const getMultipleMarketData = query({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, { symbols }) => {
    const now = Date.now();
    const results: Record<string, any> = {};

    for (const symbol of symbols) {
      const cached = await ctx.db
        .query("marketDataCache")
        .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
        .filter((q) => q.gt(q.field("expiresAt"), now))
        .first();

      if (cached) {
        results[symbol] = cached;
      }
    }

    return results;
  },
});

/**
 * Internal Mutation: Store market data in cache
 */
export const storeMarketData = internalMutation({
  args: {
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.number(),
    volume: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if exists
    const existing = await ctx.db
      .query("marketDataCache")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existing) {
      // Update
      await ctx.db.patch(existing._id, {
        price: args.price,
        change: args.change,
        changePercent: args.changePercent,
        volume: args.volume,
        source: args.source,
        lastUpdate: now,
        expiresAt: now + CACHE_TTL,
      });
    } else {
      // Insert
      await ctx.db.insert("marketDataCache", {
        symbol: args.symbol,
        price: args.price,
        change: args.change,
        changePercent: args.changePercent,
        volume: args.volume,
        source: args.source,
        lastUpdate: now,
        expiresAt: now + CACHE_TTL,
      });
    }
  },
});

/**
 * Public Action: Store market data from client (for IBKR data fetched client-side)
 * Client fetches from Next.js API route, then stores in Convex
 */
export const storeMarketDataFromClient = action({
  args: {
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.number(),
    volume: v.number(),
    source: v.string(),
  },
  handler: async (ctx, { symbol, price, change, changePercent, volume, source }) => {
    await ctx.runMutation(internal.marketData.storeMarketData, {
      symbol,
      price,
      change,
      changePercent,
      volume,
      source,
    });
    return { success: true };
  },
});

/**
 * Internal Action: Fetch from Yahoo Finance only (for fallback when IBKR fails)
 * This can run on Convex server since Yahoo Finance is public
 */
export const fetchAndCacheMarketDataInternal = internalAction({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    try {
      // Only fetch from Yahoo Finance (IBKR is handled client-side)
      console.log(`📰 [Convex] Fetching ${symbol} from Yahoo Finance...`);

      const yahooRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      );

      if (yahooRes.ok) {
        const json = await yahooRes.json();
        const quote = json.chart?.result?.[0];

        if (quote) {
          const meta = quote.meta;
          const currentPrice = meta.regularMarketPrice || 0;
          const previousClose = meta.chartPreviousClose || meta.previousClose || 0;
          const volume = meta.regularMarketVolume || 0;

          if (currentPrice > 0 && previousClose > 0) {
            const change = currentPrice - previousClose;
            const changePercent = (change / previousClose) * 100;

            await ctx.runMutation(internal.marketData.storeMarketData, {
              symbol,
              price: currentPrice,
              change,
              changePercent,
              volume,
              source: "yahoo",
            });

            console.log(
              `📰 [Convex] YAHOO FINANCE SUCCESS for ${symbol}: $${currentPrice.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%) - Volume: ${volume.toLocaleString()}`
            );
            return { success: true, source: "yahoo" };
          }
        }
      }

      throw new Error("Yahoo Finance failed");
    } catch (error) {
      console.error(`❌ [Convex] Error fetching ${symbol} from Yahoo Finance:`, error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Public Action: Fetch and cache market data (for direct client calls)
 */
export const fetchAndCacheMarketData = action({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    return await ctx.runAction(internal.marketData.fetchAndCacheMarketDataInternal, { symbol });
  },
});

/**
 * Action: Refresh multiple symbols
 */
export const refreshMultipleSymbols = action({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, { symbols }) => {
    console.log(`🔄 [Convex] Refreshing ${symbols.length} symbols...`);

    const results = await Promise.all(
      symbols.map((symbol) =>
        ctx.runAction(internal.marketData.fetchAndCacheMarketDataInternal, { symbol })
      )
    );

    const successful = results.filter((r) => r.success).length;
    console.log(`✅ [Convex] Refreshed ${successful}/${symbols.length} symbols`);

    return { successful, total: symbols.length };
  },
});
