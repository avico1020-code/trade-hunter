// Query to get all stocks from user's lists

import { v } from "convex/values";
import { query } from "./_generated/server";

export const getAllUserStocks = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Get all user's lists
    const lists = await ctx.db
      .query("stocksLists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (lists.length === 0) {
      return [];
    }

    // Get all stocks from all lists
    const allStocks = [];
    const uniqueSymbols = new Set<string>();

    for (const list of lists) {
      const stocks = await ctx.db
        .query("listStocks")
        .withIndex("by_list", (q) => q.eq("listId", list._id))
        .collect();

      for (const stock of stocks) {
        if (!uniqueSymbols.has(stock.symbol)) {
          uniqueSymbols.add(stock.symbol);
          allStocks.push({
            symbol: stock.symbol,
            listName: list.name,
          });
        }
      }
    }

    return allStocks;
  },
});
