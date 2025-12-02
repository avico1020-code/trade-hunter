/**
 * Convex Functions for Strategy Management
 * פונקציות לניהול אסטרטגיות - חיבור בין Frontend ל-Backend
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * קבלת כל האסטרטגיות של המשתמש
 */
export const getUserStrategies = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

/**
 * קבלת אסטרטגיה ספציפית לפי סוג
 */
export const getStrategyByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const strategy = await ctx.db
      .query("strategies")
      .withIndex("by_user_and_type", (q) => q.eq("userId", identity.subject).eq("type", args.type))
      .first();

    // אם לא קיימת, צור ברירות מחדל
    if (!strategy) {
      const defaultConfig = getDefaultConfigForType(args.type);
      if (!defaultConfig) return null;

      const id = await ctx.db.insert("strategies", {
        userId: identity.subject,
        type: args.type,
        name: defaultConfig.name,
        enabled: false,
        ...defaultConfig.config,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return await ctx.db.get(id);
    }

    return strategy;
  },
});

/**
 * קבלת רק האסטרטגיות הפעילות
 */
export const getEnabledStrategies = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("strategies")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();
  },
});

/**
 * יצירת אסטרטגיה חדשה
 */
export const createStrategy = mutation({
  args: {
    type: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // בדיקה אם כבר קיימת
    const existing = await ctx.db
      .query("strategies")
      .withIndex("by_user_and_type", (q) => q.eq("userId", identity.subject).eq("type", args.type))
      .first();

    if (existing) {
      throw new Error("Strategy already exists");
    }

    const defaultConfig = getDefaultConfigForType(args.type);
    if (!defaultConfig) {
      throw new Error("Invalid strategy type");
    }

    const id = await ctx.db.insert("strategies", {
      userId: identity.subject,
      type: args.type,
      name: args.name,
      enabled: false,
      ...defaultConfig.config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return id;
  },
});

/**
 * עדכון הגדרות אסטרטגיה - פונקציה כללית
 */
export const updateStrategy = mutation({
  args: {
    strategyId: v.id("strategies"),
    updates: v.object({
      enabled: v.optional(v.boolean()),
      patternConfig: v.optional(v.any()),
      entryConfig: v.optional(v.any()),
      exitConfig: v.optional(v.any()),
      stopConfig: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");
    if (strategy.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.strategyId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * עדכון שדה ספציפי באסטרטגיה
 */
export const updateStrategyField = mutation({
  args: {
    type: v.string(),
    section: v.string(), // "patternConfig", "entryConfig", etc.
    field: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const strategy = await ctx.db
      .query("strategies")
      .withIndex("by_user_and_type", (q) => q.eq("userId", identity.subject).eq("type", args.type))
      .first();

    if (!strategy) throw new Error("Strategy not found");

    // עדכון השדה הספציפי בתוך הסקשן
    const currentSection = strategy[args.section as keyof typeof strategy] as any;
    const updatedSection = {
      ...currentSection,
      [args.field]: args.value,
    };

    await ctx.db.patch(strategy._id, {
      [args.section]: updatedSection,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * הפעלה/כיבוי של אסטרטגיה
 */
export const toggleStrategy = mutation({
  args: {
    type: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const strategy = await ctx.db
      .query("strategies")
      .withIndex("by_user_and_type", (q) => q.eq("userId", identity.subject).eq("type", args.type))
      .first();

    if (!strategy) throw new Error("Strategy not found");

    await ctx.db.patch(strategy._id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * מחיקת אסטרטגיה
 */
export const deleteStrategy = mutation({
  args: {
    strategyId: v.id("strategies"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");
    if (strategy.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.strategyId);
    return { success: true };
  },
});

/**
 * ברירות מחדל לכל סוג אסטרטגיה
 */
function getDefaultConfigForType(type: string) {
  const configs: Record<string, { name: string; config: Record<string, any> }> = {
    "double-top": {
      name: "Double Top",
      config: {
        patternConfig: {
          candlesBetweenPeaks: 8,
          priceDeviation: 2,
          volumeConfirmation: true,
          minPatternHeight: 3,
        },
        entryConfig: {
          confirmationCandles: 1,
          volumeThreshold: 1.2,
          customParams: { necklineBreakPercent: 0.5 },
        },
        exitConfig: {
          takeProfitPercent: 7,
          stopLossPercent: 3,
          trailingStop: false,
          trailingStopPercent: 2,
        },
        stopConfig: {
          stopLossType: "fixed",
          stopLossValue: 3,
          takeProfitType: "fixed",
          takeProfitValue: 7,
        },
      },
    },
    "double-bottom": {
      name: "Double Bottom",
      config: {
        patternConfig: {
          candlesBetweenPeaks: 8,
          priceDeviation: 2,
          volumeConfirmation: true,
          minPatternHeight: 3,
        },
        entryConfig: {
          confirmationCandles: 1,
          volumeThreshold: 1.2,
          customParams: { necklineBreakPercent: 0.5 },
        },
        exitConfig: {
          takeProfitPercent: 7,
          stopLossPercent: 3,
          trailingStop: false,
          trailingStopPercent: 2,
        },
        stopConfig: {
          stopLossType: "fixed",
          stopLossValue: 3,
          takeProfitType: "fixed",
          takeProfitValue: 7,
        },
      },
    },
    "gap-up": {
      name: "Gap Up",
      config: {
        patternConfig: {
          customParams: {
            minGapPercent: 2,
            volumeMultiplier: 1.5,
          },
        },
        entryConfig: {
          confirmationCandles: 1,
          volumeThreshold: 1.3,
        },
        exitConfig: {
          takeProfitPercent: 5,
          stopLossPercent: 2,
          trailingStop: true,
          trailingStopPercent: 1.5,
        },
        stopConfig: {
          stopLossType: "fixed",
          stopLossValue: 2,
          takeProfitType: "fixed",
          takeProfitValue: 5,
        },
      },
    },
    "gap-down": {
      name: "Gap Down",
      config: {
        patternConfig: {
          customParams: {
            minGapPercent: 2,
            volumeMultiplier: 1.5,
          },
        },
        entryConfig: {
          confirmationCandles: 1,
          volumeThreshold: 1.3,
        },
        exitConfig: {
          takeProfitPercent: 5,
          stopLossPercent: 2,
          trailingStop: true,
          trailingStopPercent: 1.5,
        },
        stopConfig: {
          stopLossType: "fixed",
          stopLossValue: 2,
          takeProfitType: "fixed",
          takeProfitValue: 5,
        },
      },
    },
    reversal: {
      name: "Reversal",
      config: {
        patternConfig: {
          customParams: {
            rsiOversold: 30,
            rsiOverbought: 70,
            volumeConfirmation: true,
          },
        },
        entryConfig: {
          confirmationCandles: 2,
          volumeThreshold: 1.5,
        },
        exitConfig: {
          takeProfitPercent: 10,
          stopLossPercent: 4,
          trailingStop: false,
        },
        stopConfig: {
          stopLossType: "fixed",
          stopLossValue: 4,
          takeProfitType: "fixed",
          takeProfitValue: 10,
        },
      },
    },
  };

  return configs[type] || null;
}
