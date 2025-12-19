// Combined news from multiple sources (Yahoo Finance + Finviz)
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Fetch and combine market news from all sources
export const fetchCombinedMarketNews = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 40 }) => {
    try {
      // Fetch from both sources in parallel
      const [yahooNews, finvizNews] = await Promise.all([
        ctx.runAction(internal.yahooFinance.fetchMarketNews, { limit: 30 }),
        ctx.runAction(internal.finvizNews.fetchMarketNews, { limit: 30 }),
      ]);

      // Combine and sort by publishedAt (newest first)
      const combined = [...yahooNews, ...finvizNews].sort(
        (a, b) => b.publishedAt - a.publishedAt
      );

      return combined.slice(0, limit);
    } catch (error) {
      console.error("Error fetching combined market news:", error);
      // Return empty array instead of throwing
      return [];
    }
  },
});

// Fetch and combine stock news from all sources
export const fetchCombinedStockNews = action({
  args: { symbol: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { symbol, limit = 30 }) => {
    try {
      // Fetch from both sources in parallel
      const [yahooNews, finvizNews] = await Promise.all([
        ctx.runAction(internal.yahooFinance.fetchNews, { symbol, limit: 20 }),
        ctx.runAction(internal.finvizNews.fetchStockNews, { symbol, limit: 20 }),
      ]);

      // Combine and sort by publishedAt (newest first)
      const combined = [...yahooNews, ...finvizNews].sort(
        (a, b) => b.publishedAt - a.publishedAt
      );

      // Remove duplicates based on title similarity
      const unique = [];
      const seenTitles = new Set();

      for (const article of combined) {
        const normalizedTitle = article.title.toLowerCase().trim();
        if (!seenTitles.has(normalizedTitle)) {
          seenTitles.add(normalizedTitle);
          unique.push(article);
        }
      }

      return unique.slice(0, limit);
    } catch (error) {
      console.error(`Error fetching combined news for ${symbol}:`, error);
      // Return empty array instead of throwing
      return [];
    }
  },
});

