// convex/stocksLists.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================
// QUERIES
// ============================================

// Get user's active list or create one if doesn't exist
export const getActiveList = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;

    // Try to find active list
    let activeList = await ctx.db
      .query("stocksLists")
      .withIndex("by_user_and_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .first();

    // If no active list, get any list or return null
    if (!activeList) {
      activeList = await ctx.db
        .query("stocksLists")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    }

    return activeList;
  },
});

// Get all stocks in the active list
export const getListStocks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // Get active list
    const activeList = await ctx.db
      .query("stocksLists")
      .withIndex("by_user_and_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .first();

    if (!activeList) {
      return [];
    }

    // Get stocks in this list
    const stocks = await ctx.db
      .query("listStocks")
      .withIndex("by_list", (q) => q.eq("listId", activeList._id))
      .collect();

    return stocks.map((stock) => ({
      id: stock._id,
      symbol: stock.symbol,
      addedAt: stock.addedAt,
    }));
  },
});

// Get active strategies for the active list
export const getListStrategies = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // Get active list
    const activeList = await ctx.db
      .query("stocksLists")
      .withIndex("by_user_and_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .first();

    if (!activeList) {
      return [];
    }

    // Get active strategies for this list
    const strategies = await ctx.db
      .query("listStrategies")
      .withIndex("by_list_and_active", (q) => q.eq("listId", activeList._id).eq("isActive", true))
      .collect();

    return strategies.map((strategy) => ({
      id: strategy._id,
      name: strategy.strategyName,
      type: strategy.strategyType,
      addedAt: strategy.addedAt,
    }));
  },
});

// Get active trades (real-time, only "open" trades)
export const getActiveTrades = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;

    // Get only trades with status "open"
    const trades = await ctx.db
      .query("activeTrades")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();

    return trades;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Create the first list for a user (auto-called if needed)
export const createDefaultList = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Check if user already has a list
    const existingList = await ctx.db
      .query("stocksLists")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingList) {
      return existingList._id;
    }

    // Create first list
    const listId = await ctx.db.insert("stocksLists", {
      userId,
      name: "רשימת מניות ראשית",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return listId;
  },
});

// Add a stock to the active list
export const addStock = mutation({
  args: {
    symbol: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get or create active list
    let activeList = await ctx.db
      .query("stocksLists")
      .withIndex("by_user_and_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .first();

    if (!activeList) {
      // Create default list
      const listId = await ctx.db.insert("stocksLists", {
        userId,
        name: "רשימת מניות ראשית",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      activeList = await ctx.db.get(listId);
    }

    if (!activeList) {
      throw new Error("Failed to create list");
    }

    // Check if stock already exists in this list
    const existing = await ctx.db
      .query("listStocks")
      .withIndex("by_list_and_symbol", (q) =>
        q.eq("listId", activeList._id).eq("symbol", args.symbol.toUpperCase())
      )
      .first();

    if (existing) {
      throw new Error("המניה כבר קיימת ברשימה");
    }

    // Add stock
    const stockId = await ctx.db.insert("listStocks", {
      listId: activeList._id,
      symbol: args.symbol.toUpperCase(),
      addedAt: Date.now(),
    });

    return stockId;
  },
});

// Remove a stock from the list
export const removeStock = mutation({
  args: {
    stockId: v.id("listStocks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the stock
    const stock = await ctx.db.get(args.stockId);
    if (!stock) {
      throw new Error("Stock not found");
    }

    // Get the list
    const list = await ctx.db.get(stock.listId);
    if (!list || list.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Delete the stock
    await ctx.db.delete(args.stockId);
  },
});

// Add a strategy to the active list
export const addStrategyToList = mutation({
  args: {
    strategyName: v.string(),
    strategyType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get or create active list
    let activeList = await ctx.db
      .query("stocksLists")
      .withIndex("by_user_and_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .first();

    if (!activeList) {
      const listId = await ctx.db.insert("stocksLists", {
        userId,
        name: "רשימת מניות ראשית",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      activeList = await ctx.db.get(listId);
    }

    if (!activeList) {
      throw new Error("Failed to create list");
    }

    // Check if strategy already exists for this list
    const existing = await ctx.db
      .query("listStrategies")
      .withIndex("by_list_and_type", (q) =>
        q.eq("listId", activeList._id).eq("strategyType", args.strategyType)
      )
      .first();

    if (existing) {
      // Activate if it's inactive
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, {
          isActive: true,
        });
      }
      return existing._id;
    }

    // Add new strategy
    const strategyId = await ctx.db.insert("listStrategies", {
      listId: activeList._id,
      strategyName: args.strategyName,
      strategyType: args.strategyType,
      isActive: true,
      addedAt: Date.now(),
    });

    return strategyId;
  },
});

// Remove a strategy from the list
export const removeStrategyFromList = mutation({
  args: {
    strategyId: v.id("listStrategies"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the strategy
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    // Get the list
    const list = await ctx.db.get(strategy.listId);
    if (!list || list.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Delete the strategy
    await ctx.db.delete(args.strategyId);
  },
});



















