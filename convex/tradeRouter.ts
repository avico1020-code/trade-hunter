/**
 * Convex Functions for Trade Router
 * פונקציות לניהול נתב המסחר
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * קבלת הגדרות נתב המסחר
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const config = await ctx.db
      .query("tradeRouterConfig")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    // אם אין, צור ברירות מחדל
    if (!config) {
      const defaultConfig = {
        userId: identity.subject,
        maxPositionSize: 10000,
        maxConcurrentTrades: 3,
        portfolioRiskPercent: 2,
        positionSizingMethod: "fixed",
        tradingStartTime: "09:30",
        tradingEndTime: "16:00",
        closeBeforeMarketClose: 15,
        dailyLossLimit: 500,
        dailyProfitTarget: 1500,
        maxDrawdown: 10,
        stopTradingOnLimit: true,
        paperTrading: true,
        accountId: "",
        enabled: false,
        updatedAt: Date.now(),
      };

      const id = await ctx.db.insert("tradeRouterConfig", defaultConfig);
      return await ctx.db.get(id);
    }

    return config;
  },
});

/**
 * עדכון הגדרות נתב המסחר
 */
export const updateConfig = mutation({
  args: {
    updates: v.object({
      maxPositionSize: v.optional(v.number()),
      maxConcurrentTrades: v.optional(v.number()),
      portfolioRiskPercent: v.optional(v.number()),
      positionSizingMethod: v.optional(v.string()),
      tradingStartTime: v.optional(v.string()),
      tradingEndTime: v.optional(v.string()),
      closeBeforeMarketClose: v.optional(v.number()),
      dailyLossLimit: v.optional(v.number()),
      dailyProfitTarget: v.optional(v.number()),
      maxDrawdown: v.optional(v.number()),
      stopTradingOnLimit: v.optional(v.boolean()),
      paperTrading: v.optional(v.boolean()),
      enabled: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const config = await ctx.db
      .query("tradeRouterConfig")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!config) {
      throw new Error("Config not found");
    }

    await ctx.db.patch(config._id, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * הפעלה/כיבוי של נתב המסחר
 */
export const toggleRouter = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const config = await ctx.db
      .query("tradeRouterConfig")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();

    if (!config) {
      throw new Error("Config not found");
    }

    await ctx.db.patch(config._id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
