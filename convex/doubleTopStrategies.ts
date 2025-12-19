// convex/doubleTopStrategies.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Schema validator for DoubleTopConfig
const doubleTopConfigValidator = v.object({
  // זיהוי דפוס
  minDropPct: v.number(),
  maxDropPct: v.number(),
  minBarsBetweenPeaks: v.number(),
  peakDiffAbsPct: v.number(),
  volumeDowntrendBetweenPeaks: v.boolean(),
  patternConfirmRedBars: v.number(),

  // התראה מוקדמת
  earlyHeadsUpEnabled: v.boolean(),
  earlyHeadsUpRiseBars: v.number(),

  // כניסה ראשונה
  entry1ConfirmBars: v.number(),
  entry1UsesSameConfirmation: v.boolean(),

  // יציאה ראשונה
  abnormalVolMultiplier: v.number(),
  abnormalVolWindowMode: v.union(v.literal("fromFirstRed"), v.literal("fixed")),
  abnormalVolFixedWindow: v.number(),

  // כניסה שנייה
  entry2Enabled: v.boolean(),
  entry2ConfirmBelowMA: v.number(),
  maKind: v.literal("sma"),
  maWindows: v.array(v.number()),

  // יציאה שנייה
  exit2OnTouchMA: v.boolean(),

  // סטופים
  stop1_initial_atSecondPeakHigh: v.boolean(),
  stop1_trailing_byResistances: v.boolean(),
  stop2_initial_atFailedMAHigh: v.boolean(),
  stop2_trailing_byResistances: v.boolean(),
});

const indicatorValidator = v.object({
  id: v.string(),
  name: v.union(v.string(), v.null()),
  value: v.string(),
});

// Save or update a Double Top strategy configuration
// Each user has only ONE Double Top strategy - updates existing or creates new
export const saveStrategy = mutation({
  args: {
    name: v.string(),
    timeInterval: v.string(),
    indicators: v.array(indicatorValidator),
    config: doubleTopConfigValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Check if user already has a Double Top strategy
    const existingStrategy = await ctx.db
      .query("doubleTopStrategies")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existingStrategy) {
      // Update existing strategy
      await ctx.db.patch(existingStrategy._id, {
        name: args.name,
        timeInterval: args.timeInterval,
        indicators: args.indicators,
        config: args.config,
        updatedAt: now,
      });

      return existingStrategy._id;
    }

    // Create new strategy (first time)
    const strategyId = await ctx.db.insert("doubleTopStrategies", {
      userId,
      name: args.name,
      timeInterval: args.timeInterval,
      indicators: args.indicators,
      config: args.config,
      createdAt: now,
      updatedAt: now,
    });

    return strategyId;
  },
});

// Get the single Double Top strategy for the current user
export const getUserStrategy = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;
    // Return the first (and should be only) strategy for this user
    const strategy = await ctx.db
      .query("doubleTopStrategies")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    return strategy;
  },
});

// Get all strategies for the current user (legacy - kept for compatibility)
export const getUserStrategies = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const strategies = await ctx.db
      .query("doubleTopStrategies")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .collect();

    return strategies;
  },
});

// Get a specific strategy by ID
export const getStrategy = query({
  args: { strategyId: v.id("doubleTopStrategies") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    if (strategy.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    return strategy;
  },
});

// Delete a strategy
export const deleteStrategy = mutation({
  args: { strategyId: v.id("doubleTopStrategies") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    if (strategy.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.strategyId);
  },
});

// Get default configuration values
export const getDefaultConfig = query({
  args: {},
  handler: async () => {
    return {
      // ערכי ברירת מחדל סבירים
      minDropPct: 3,
      maxDropPct: 15,
      minBarsBetweenPeaks: 8,
      peakDiffAbsPct: 1.5,
      volumeDowntrendBetweenPeaks: true,
      patternConfirmRedBars: 2,

      earlyHeadsUpEnabled: false,
      earlyHeadsUpRiseBars: 2,

      entry1ConfirmBars: 2,
      entry1UsesSameConfirmation: true,

      abnormalVolMultiplier: 2.0,
      abnormalVolWindowMode: "fixed" as const,
      abnormalVolFixedWindow: 20,

      entry2Enabled: true,
      entry2ConfirmBelowMA: 2,
      maKind: "sma" as const,
      maWindows: [9, 20, 50],

      exit2OnTouchMA: true,

      stop1_initial_atSecondPeakHigh: true,
      stop1_trailing_byResistances: true,
      stop2_initial_atFailedMAHigh: true,
      stop2_trailing_byResistances: true,
    };
  },
});
