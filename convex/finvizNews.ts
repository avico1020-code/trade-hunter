import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

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

export const getCachedFinvizNews = internalQuery({
  args: { symbol: v.string() },
  handler: async (ctx, { symbol }) => {
    const now = Date.now();
    const cached = await ctx.db
      .query("finvizNews")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .filter((q) => q.gt(q.field("expiresAt"), now))
      .collect();

    return cached.length > 0 ? cached : null;
  },
});

// ============================================
// INTERNAL MUTATIONS (for cache storage)
// ============================================

export const storeFinvizNews = internalMutation({
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
      .query("finvizNews")
      .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
      .collect();

    for (const old of oldNews) {
      await ctx.db.delete(old._id);
    }

    // Insert new news
    for (const article of articles) {
      await ctx.db.insert("finvizNews", {
        symbol,
        ...article,
        expiresAt,
      });
    }
  },
});

// Clear all Finviz cache (for debugging)
export const clearFinvizCache = internalMutation({
  handler: async (ctx) => {
    const allNews = await ctx.db.query("finvizNews").collect();
    for (const news of allNews) {
      await ctx.db.delete(news._id);
    }
    return { deleted: allNews.length };
  },
});

// ============================================
// HELPER: Parse Finviz HTML for news
// ============================================

function parseFinvizNews(html: string): Array<{
  title: string;
  source: string;
  url: string;
  publishedAt: number;
}> {
  const articles: Array<{
    title: string;
    source: string;
    url: string;
    publishedAt: number;
  }> = [];

  try {
    // Finviz news format: <a class="tab-link-news" href="URL">TITLE</a>
    // We'll use regex to extract news items
    const newsPattern =
      /<tr[^>]*>.*?<td[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>.*?<\/td>.*?<td[^>]*>(.*?)<\/td>/gis;

    let match;
    while ((match = newsPattern.exec(html)) !== null) {
      const url = match[1];
      const title = match[2]?.replace(/<[^>]*>/g, "").trim();
      const dateText = match[3]?.replace(/<[^>]*>/g, "").trim();

      // Filter out internal Finviz links (starting with "/")
      // Only include external news links (starting with "http")
      if (title && url && url.startsWith("http")) {
        articles.push({
          title,
          source: "Finviz",
          url: url,
          publishedAt: parseFinvizDate(dateText) || Date.now(),
        });
      }
    }
  } catch (error) {
    console.error("Error parsing Finviz news:", error);
  }

  return articles.slice(0, 30); // Limit to 30 articles
}

function parseFinvizDate(dateText: string): number {
  try {
    // Finviz date formats: "Dec-11-24 09:30AM" or "Today 09:30AM" or "Yesterday 09:30AM"
    const now = new Date();

    if (dateText.includes("Today")) {
      const timeMatch = dateText.match(/(\d{1,2}):(\d{2})(AM|PM)/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3] === "PM";

        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        const date = new Date(now);
        date.setHours(hours, minutes, 0, 0);
        return date.getTime();
      }
    }

    if (dateText.includes("Yesterday")) {
      const timeMatch = dateText.match(/(\d{1,2}):(\d{2})(AM|PM)/);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3] === "PM";

        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        const date = new Date(now);
        date.setDate(date.getDate() - 1);
        date.setHours(hours, minutes, 0, 0);
        return date.getTime();
      }
    }

    // Format: "Dec-11-24 09:30AM"
    const match = dateText.match(/([A-Za-z]{3})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(AM|PM)/);
    if (match) {
      const monthMap: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      const month = monthMap[match[1]];
      const day = parseInt(match[2]);
      const year = 2000 + parseInt(match[3]);
      let hours = parseInt(match[4]);
      const minutes = parseInt(match[5]);
      const isPM = match[6] === "PM";

      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;

      return new Date(year, month, day, hours, minutes).getTime();
    }
  } catch (error) {
    console.error("Error parsing Finviz date:", dateText, error);
  }

  return Date.now();
}

// ============================================
// PUBLIC ACTIONS (called from client)
// ============================================

export const fetchMarketNews = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 30 }) => {
    const symbol = "general";

    // Check cache
    const cached = await ctx.runQuery(internal.finvizNews.getCachedFinvizNews, { symbol });
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

    // Fetch from Finviz
    try {
      const response = await fetch("https://finviz.com/news.ashx");

      if (!response.ok) {
        throw new Error(`Finviz API error: ${response.status}`);
      }

      const html = await response.text();
      const articles = parseFinvizNews(html);

      // Store in cache
      if (articles.length > 0) {
        await ctx.runMutation(internal.finvizNews.storeFinvizNews, {
          symbol,
          articles: articles.slice(0, limit),
        });
      }

      return articles.slice(0, limit);
    } catch (error) {
      console.error("Error fetching Finviz market news:", error);
      return [];
    }
  },
});

export const fetchStockNews = internalAction({
  args: { symbol: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { symbol, limit = 20 }) => {
    // Check cache
    const cached = await ctx.runQuery(internal.finvizNews.getCachedFinvizNews, { symbol });
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

    // Fetch from Finviz
    try {
      const response = await fetch(`https://finviz.com/quote.ashx?t=${symbol.toUpperCase()}`);

      if (!response.ok) {
        throw new Error(`Finviz API error: ${response.status}`);
      }

      const html = await response.text();
      const articles = parseFinvizNews(html);

      // Store in cache
      if (articles.length > 0) {
        await ctx.runMutation(internal.finvizNews.storeFinvizNews, {
          symbol,
          articles: articles.slice(0, limit),
        });
      }

      return articles.slice(0, limit).map((a) => ({ symbol, ...a }));
    } catch (error) {
      console.error(`Error fetching Finviz news for ${symbol}:`, error);
      return [];
    }
  },
});

