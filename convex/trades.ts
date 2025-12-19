/**
 * Convex Functions for Trades Management
 * פונקציות לניהול טריידים פעילים והיסטוריה
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * קבלת כל הטריידים הפעילים
 */
export const getActiveTrades = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("activeTrades")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("status"), "open"))
      .collect();
  },
});

/**
 * קבלת היסטוריית טריידים
 */
export const getTradeHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit || 50;

    return await ctx.db
      .query("tradeHistory")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(limit);
  },
});

/**
 * פתיחת טרייד חדש
 */
export const openTrade = mutation({
  args: {
    strategyId: v.id("strategies"),
    strategyType: v.string(),
    symbol: v.string(),
    side: v.string(),
    quantity: v.number(),
    entryPrice: v.number(),
    stopLoss: v.number(),
    takeProfit: v.number(),
    orderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const tradeId = await ctx.db.insert("activeTrades", {
      userId: identity.subject,
      strategyId: args.strategyId,
      strategyType: args.strategyType,
      symbol: args.symbol,
      side: args.side,
      quantity: args.quantity,
      entryPrice: args.entryPrice,
      currentPrice: args.entryPrice,
      entryTime: Date.now(),
      stopLoss: args.stopLoss,
      takeProfit: args.takeProfit,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      status: "open",
      orderId: args.orderId,
    });

    return { success: true, tradeId };
  },
});

/**
 * סגירת טרייד
 */
export const closeTrade = mutation({
  args: {
    tradeId: v.id("activeTrades"),
    exitPrice: v.number(),
    exitReason: v.string(),
    commission: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // חישוב רווח/הפסד
    const priceDiff =
      trade.side === "long" ? args.exitPrice - trade.entryPrice : trade.entryPrice - args.exitPrice;
    const realizedPnL = priceDiff * trade.quantity - (args.commission || 0);
    const realizedPnLPercent = (priceDiff / trade.entryPrice) * 100;

    // שמירה להיסטוריה
    await ctx.db.insert("tradeHistory", {
      userId: trade.userId,
      strategyId: trade.strategyId,
      strategyType: trade.strategyType,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      entryPrice: trade.entryPrice,
      exitPrice: args.exitPrice,
      entryTime: trade.entryTime,
      exitTime: Date.now(),
      realizedPnL,
      realizedPnLPercent,
      exitReason: args.exitReason,
      commission: args.commission,
    });

    // מחיקה מטריידים פעילים
    await ctx.db.delete(args.tradeId);

    return { success: true, realizedPnL };
  },
});

/**
 * עדכון מחיר נוכחי של טרייד
 */
export const updateTradePrice = mutation({
  args: {
    tradeId: v.id("activeTrades"),
    currentPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // חישוב רווח/הפסד לא ממומש
    const priceDiff =
      trade.side === "long"
        ? args.currentPrice - trade.entryPrice
        : trade.entryPrice - args.currentPrice;
    const unrealizedPnL = priceDiff * trade.quantity;
    const unrealizedPnLPercent = (priceDiff / trade.entryPrice) * 100;

    await ctx.db.patch(args.tradeId, {
      currentPrice: args.currentPrice,
      unrealizedPnL,
      unrealizedPnLPercent,
    });

    return { success: true };
  },
});

/**
 * קבלת סטטיסטיקות טריידים
 */
export const getTradeStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const activeTrades = await ctx.db
      .query("activeTrades")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const history = await ctx.db
      .query("tradeHistory")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // חישוב סטטיסטיקות
    const totalPnL = history.reduce((sum, trade) => sum + trade.realizedPnL, 0);
    const winningTrades = history.filter((t) => t.realizedPnL > 0).length;
    const losingTrades = history.filter((t) => t.realizedPnL < 0).length;
    const winRate = history.length > 0 ? (winningTrades / history.length) * 100 : 0;

    const currentUnrealizedPnL = activeTrades.reduce((sum, trade) => sum + trade.unrealizedPnL, 0);

    return {
      activeTrades: activeTrades.length,
      totalTrades: history.length,
      totalPnL,
      currentUnrealizedPnL,
      winRate,
      winningTrades,
      losingTrades,
    };
  },
});
