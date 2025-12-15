import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";

// TTL: 24 hours (in milliseconds)
const TTL_24_HOURS = 24 * 60 * 60 * 1000;

// Helper to calculate expiration time (midnight UTC)
function getNextMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime();
}

// ============================================
// INTERNAL QUERIES (for cache checking)
// ============================================

export const getCachedQuote = internalQuery({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();
    const cached = await ctx.db
      .query("yahooQuotes")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();

    if (cached && cached.expiresAt > now) {
      return cached;
    }
    return null;
  },
});

export const getCachedNews = internalQuery({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();
    const cached = await ctx.db
      .query("yahooNews")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    return cached.length > 0 ? cached : null;
  },
});

export const getCachedHistorical = internalQuery({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();
    const cached = await ctx.db
      .query("yahooHistorical")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .first();

    if (cached && cached.expiresAt > now) {
      return cached;
    }
    return null;
  },
});

// ============================================
// INTERNAL MUTATIONS (for cache storage)
// ============================================

export const storeQuote = internalMutation({
  args: {
    symbol: v.string(),
    price: v.number(),
    change: v.number(),
    changePercent: v.number(),
    volume: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const expiresAt = getNextMidnightUTC();

    // Check if exists and update, otherwise insert
    const existing = await ctx.db
      .query("yahooQuotes")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, expiresAt });
    } else {
      await ctx.db.insert("yahooQuotes", { ...args, expiresAt });
    }
  },
});

export const storeNews = internalMutation({
  args: {
    symbol: v.string(),
    articles: v.array(
      v.object({
        title: v.string(),
        source: v.string(),
        url: v.string(),
        publishedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, { symbol, articles }) => {
    const expiresAt = getNextMidnightUTC();

    // Delete old news for this symbol
    const oldNews = await ctx.db
      .query("yahooNews")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .collect();

    for (const old of oldNews) {
      await ctx.db.delete(old._id);
    }

    // Insert new news
    for (const article of articles) {
      await ctx.db.insert("yahooNews", {
        symbol,
        ...article,
        expiresAt,
      });
    }
  },
});

export const storeHistorical = internalMutation({
  args: {
    symbol: v.string(),
    chartData: v.array(v.number()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const expiresAt = getNextMidnightUTC();

    const existing = await ctx.db
      .query("yahooHistorical")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, expiresAt });
    } else {
      await ctx.db.insert("yahooHistorical", { ...args, expiresAt });
    }
  },
});

// ============================================
// PUBLIC ACTIONS (called from client)
// ============================================

export const fetchQuote = action({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    // Check cache first
    const cached = await ctx.runQuery(internal.yahooFinance.getCachedQuote, { symbol });
    if (cached) {
      return {
        symbol: cached.symbol,
        price: cached.price,
        change: cached.change,
        changePercent: cached.changePercent,
        volume: cached.volume,
        timestamp: cached.timestamp,
      };
    }

    // Fetch from Yahoo Finance using direct HTTP request
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      );

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const result = await response.json();
      const quote = result.chart?.result?.[0];

      if (!quote || !quote.meta) {
        throw new Error(`No data found for symbol: ${symbol}`);
      }

      const meta = quote.meta;
      const currentPrice = meta.regularMarketPrice || 0;
      const previousClose = meta.chartPreviousClose || meta.previousClose || 0;

      // Calculate change and percent
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const data = {
        symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: meta.regularMarketVolume || 0,
        timestamp: Date.now(),
      };

      // Debug log
      console.log(
        `[${symbol}] Price: ${currentPrice}, PrevClose: ${previousClose}, Change: ${change}, Percent: ${changePercent.toFixed(2)}%`
      );

      // Store in cache
      await ctx.runMutation(internal.yahooFinance.storeQuote, data);

      return data;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);

      // Return zero data instead of throwing to prevent UI crashes
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        timestamp: Date.now(),
      };
    }
  },
});

export const fetchMultipleQuotes = action({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, { symbols }) => {
    const results = [];

    for (const symbol of symbols) {
      try {
        // Check cache first
        const cached = await ctx.runQuery(internal.yahooFinance.getCachedQuote, { symbol });
        if (cached) {
          results.push({
            symbol: cached.symbol,
            price: cached.price,
            change: cached.change,
            changePercent: cached.changePercent,
            volume: cached.volume,
            timestamp: cached.timestamp,
          });
          continue;
        }

        // Fetch from Yahoo Finance
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
        );

        if (!response.ok) {
          console.error(`Yahoo Finance API error for ${symbol}: ${response.status}`);
          continue;
        }

        const result = await response.json();
        const quote = result.chart?.result?.[0];

        if (!quote || !quote.meta) {
          console.error(`No data found for symbol: ${symbol}`);
          continue;
        }

        const meta = quote.meta;
        const currentPrice = meta.regularMarketPrice || 0;
        const previousClose = meta.chartPreviousClose || meta.previousClose || 0;

        // Calculate change and percent
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        const data = {
          symbol,
          price: currentPrice,
          change: change,
          changePercent: changePercent,
          volume: meta.regularMarketVolume || 0,
          timestamp: Date.now(),
        };

        // Store in cache
        await ctx.runMutation(internal.yahooFinance.storeQuote, data);
        results.push(data);
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        // Continue with other symbols even if one fails
      }
    }

    return results;
  },
});

export const fetchNews = internalAction({
  args: { symbol: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { symbol, limit = 20 }) => {
    // Check cache first
    const cached = await ctx.runQuery(internal.yahooFinance.getCachedNews, { symbol });
    if (cached && cached.length > 0) {
      return cached
        .map((item) => ({
          symbol: item.symbol,
          title: item.title,
          source: item.source,
          url: item.url,
          publishedAt: item.publishedAt,
        }))
        .slice(0, limit);
    }

    // Fetch from Yahoo Finance News API
    try {
      const response = await fetch(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol}&quotesCount=0&newsCount=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Yahoo Finance News API error: ${response.status}`);
      }

      const result = await response.json();
      const news = result.news || [];

      const articles = news.slice(0, limit).map((item: any) => ({
        title: item.title || "",
        source: item.publisher || "Unknown",
        url: item.link || "",
        publishedAt: item.providerPublishTime ? item.providerPublishTime * 1000 : Date.now(),
      }));

      // Store in cache
      if (articles.length > 0) {
        await ctx.runMutation(internal.yahooFinance.storeNews, { symbol, articles });
      }

      return articles.map((a: any) => ({ symbol, ...a }));
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return [];
    }
  },
});

export const fetchMarketNews = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 30 }) => {
    const symbol = "general";

    // Check cache
    const cached = await ctx.runQuery(internal.yahooFinance.getCachedNews, { symbol });
    if (cached && cached.length > 0) {
      return cached
        .map((item) => ({
          title: item.title,
          source: item.source,
          url: item.url,
          publishedAt: item.publishedAt,
        }))
        .slice(0, limit);
    }

    // Fetch trending symbols and their news
    try {
      // Get trending symbols
      const trendingResponse = await fetch(
        "https://query1.finance.yahoo.com/v1/finance/trending/US"
      );

      if (!trendingResponse.ok) {
        throw new Error(`Yahoo Finance Trending API error: ${trendingResponse.status}`);
      }

      const trendingResult = await trendingResponse.json();
      const tickers = trendingResult.finance?.result?.[0]?.quotes || [];
      const topTickers = tickers.slice(0, 10).map((q: any) => q.symbol);

      const allNews = [];

      // Fetch news for each trending ticker
      for (const ticker of topTickers) {
        try {
          const newsResponse = await fetch(
            `https://query2.finance.yahoo.com/v1/finance/search?q=${ticker}&quotesCount=0&newsCount=3`
          );

          if (newsResponse.ok) {
            const newsResult = await newsResponse.json();
            const news = newsResult.news || [];
            allNews.push(...news.slice(0, 3));
          }
        } catch (error) {
          console.error(`Error fetching news for ${ticker}:`, error);
        }
      }

      const articles = allNews.slice(0, limit).map((item: any) => ({
        title: item.title || "",
        source: item.publisher || "Unknown",
        url: item.link || "",
        publishedAt: item.providerPublishTime ? item.providerPublishTime * 1000 : Date.now(),
      }));

      // Store in cache
      if (articles.length > 0) {
        await ctx.runMutation(internal.yahooFinance.storeNews, { symbol, articles });
      }

      return articles;
    } catch (error) {
      console.error("Error fetching market news:", error);
      return [];
    }
  },
});

export const fetchHistoricalData = action({
  args: { symbol: v.string(), period: v.optional(v.string()) },
  handler: async (ctx, { symbol, period = "1d" }) => {
    // Check cache
    const cached = await ctx.runQuery(internal.yahooFinance.getCachedHistorical, { symbol });
    if (cached) {
      return {
        symbol: cached.symbol,
        chartData: cached.chartData,
        timestamp: cached.timestamp,
      };
    }

    // Fetch from Yahoo Finance
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=15m&range=1d`
      );

      if (!response.ok) {
        throw new Error(`Yahoo Finance Chart API error: ${response.status}`);
      }

      const result = await response.json();
      const quote = result.chart?.result?.[0];

      if (!quote || !quote.indicators?.quote?.[0]) {
        // Return empty data instead of throwing
        return { symbol, chartData: [], timestamp: Date.now() };
      }

      const closes = quote.indicators.quote[0].close || [];
      const chartData = closes
        .filter((price: number | null) => price !== null && price > 0)
        .slice(-20); // Last 20 points for sparkline

      const data = {
        symbol,
        chartData,
        timestamp: Date.now(),
      };

      // Store in cache
      await ctx.runMutation(internal.yahooFinance.storeHistorical, data);

      return data;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      // Return empty data instead of throwing
      return { symbol, chartData: [], timestamp: Date.now() };
    }
  },
});

// Cleanup expired cache entries (can be called manually or scheduled)
export const cleanupExpiredCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Cleanup quotes
    const expiredQuotes = await ctx.db
      .query("yahooQuotes")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const quote of expiredQuotes) {
      await ctx.db.delete(quote._id);
    }

    // Cleanup news
    const expiredNews = await ctx.db
      .query("yahooNews")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const news of expiredNews) {
      await ctx.db.delete(news._id);
    }

    // Cleanup historical
    const expiredHistorical = await ctx.db
      .query("yahooHistorical")
      .withIndex("by_expires")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const historical of expiredHistorical) {
      await ctx.db.delete(historical._id);
    }

    return {
      deletedQuotes: expiredQuotes.length,
      deletedNews: expiredNews.length,
      deletedHistorical: expiredHistorical.length,
    };
  },
});
