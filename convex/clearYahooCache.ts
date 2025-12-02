// Utility to clear Yahoo Finance cache
import { mutation } from "./_generated/server";

export const clearAllYahooCache = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all cached quotes
    const quotes = await ctx.db.query("yahooQuotes").collect();
    for (const quote of quotes) {
      await ctx.db.delete(quote._id);
    }

    // Delete all cached news
    const news = await ctx.db.query("yahooNews").collect();
    for (const newsItem of news) {
      await ctx.db.delete(newsItem._id);
    }

    // Delete all cached historical data
    const historical = await ctx.db.query("yahooHistorical").collect();
    for (const hist of historical) {
      await ctx.db.delete(hist._id);
    }

    return {
      deletedQuotes: quotes.length,
      deletedNews: news.length,
      deletedHistorical: historical.length,
    };
  },
});

