import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Symbol Scoring System - Convex Functions
 * 
 * This file handles storage and retrieval of scoring data in Convex.
 * 
 * Weights and formulas are stored in the code (rulebooks/),
 * but the actual scores (variable data) are stored here.
 */

// =====================================================
// Types (matching the schema)
// =====================================================

export interface ComponentBreakdown {
  [key: string]: any; // Flexible structure for department breakdowns
}

export interface SymbolScoreInput {
  symbol: string;
  technicalScore: number;
  newsScore: number;
  macroScore: number;
  sectorScore: number;
  optionsFlowScore: number;
  microCompanyScore: number;
  masterScore: number;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  componentBreakdown?: ComponentBreakdown;
  refreshTrigger?: string;
  refreshReason?: string;
}

// =====================================================
// Mutations - Save/Update Scores
// =====================================================

/**
 * Save or update scores for a symbol
 * This will be called by the Python scoring engine after calculations
 */
export const saveSymbolScores = mutation({
  args: {
    symbol: v.string(),
    technicalScore: v.number(),
    newsScore: v.number(),
    macroScore: v.number(),
    sectorScore: v.number(),
    optionsFlowScore: v.number(),
    microCompanyScore: v.number(),
    masterScore: v.number(),
    direction: v.union(v.literal("LONG"), v.literal("SHORT"), v.literal("NEUTRAL")),
    componentBreakdown: v.optional(v.any()),
    refreshTrigger: v.optional(v.string()),
    refreshReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if score already exists for this symbol
    const existing = await ctx.db
      .query("symbolScores")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        technicalScore: args.technicalScore,
        newsScore: args.newsScore,
        macroScore: args.macroScore,
        sectorScore: args.sectorScore,
        optionsFlowScore: args.optionsFlowScore,
        microCompanyScore: args.microCompanyScore,
        masterScore: args.masterScore,
        direction: args.direction,
        componentBreakdown: args.componentBreakdown ?? existing.componentBreakdown,
        lastUpdated: now,
        refreshTrigger: args.refreshTrigger,
        refreshReason: args.refreshReason,
      });
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert("symbolScores", {
        symbol: args.symbol,
        technicalScore: args.technicalScore,
        newsScore: args.newsScore,
        macroScore: args.macroScore,
        sectorScore: args.sectorScore,
        optionsFlowScore: args.optionsFlowScore,
        microCompanyScore: args.microCompanyScore,
        masterScore: args.masterScore,
        direction: args.direction,
        componentBreakdown: args.componentBreakdown,
        lastUpdated: now,
        refreshTrigger: args.refreshTrigger,
        refreshReason: args.refreshReason,
      });
    }
  },
});

/**
 * Batch save scores for multiple symbols
 * Useful when updating scores for an entire universe at once
 */
export const batchSaveSymbolScores = mutation({
  args: {
    scores: v.array(
      v.object({
        symbol: v.string(),
        technicalScore: v.number(),
        newsScore: v.number(),
        macroScore: v.number(),
        sectorScore: v.number(),
        optionsFlowScore: v.number(),
        microCompanyScore: v.number(),
        masterScore: v.number(),
        direction: v.union(v.literal("LONG"), v.literal("SHORT"), v.literal("NEUTRAL")),
        componentBreakdown: v.optional(v.any()),
        refreshTrigger: v.optional(v.string()),
        refreshReason: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: string[] = [];

    for (const scoreData of args.scores) {
      const existing = await ctx.db
        .query("symbolScores")
        .withIndex("by_symbol", (q) => q.eq("symbol", scoreData.symbol))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          technicalScore: scoreData.technicalScore,
          newsScore: scoreData.newsScore,
          macroScore: scoreData.macroScore,
          sectorScore: scoreData.sectorScore,
          optionsFlowScore: scoreData.optionsFlowScore,
          microCompanyScore: scoreData.microCompanyScore,
          masterScore: scoreData.masterScore,
          direction: scoreData.direction,
          componentBreakdown: scoreData.componentBreakdown ?? existing.componentBreakdown,
          lastUpdated: now,
          refreshTrigger: scoreData.refreshTrigger,
          refreshReason: scoreData.refreshReason,
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert("symbolScores", {
          symbol: scoreData.symbol,
          technicalScore: scoreData.technicalScore,
          newsScore: scoreData.newsScore,
          macroScore: scoreData.macroScore,
          sectorScore: scoreData.sectorScore,
          optionsFlowScore: scoreData.optionsFlowScore,
          microCompanyScore: scoreData.microCompanyScore,
          masterScore: scoreData.masterScore,
          direction: scoreData.direction,
          componentBreakdown: scoreData.componentBreakdown,
          lastUpdated: now,
          refreshTrigger: scoreData.refreshTrigger,
          refreshReason: scoreData.refreshReason,
        });
        results.push(id);
      }
    }

    return results;
  },
});

// =====================================================
// Queries - Retrieve Scores
// =====================================================

/**
 * Get scores for a specific symbol
 */
export const getSymbolScores = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("symbolScores")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();
  },
});

/**
 * Get scores for multiple symbols
 */
export const getMultipleSymbolScores = query({
  args: { symbols: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results = [];
    for (const symbol of args.symbols) {
      const score = await ctx.db
        .query("symbolScores")
        .withIndex("by_symbol", (q) => q.eq("symbol", symbol))
        .first();
      if (score) {
        results.push(score);
      }
    }
    return results;
  },
});

/**
 * Get top-ranked symbols by Master Score
 * Returns symbols sorted by absolute masterScore (strongest first)
 */
export const getTopRankedSymbols = query({
  args: {
    limit: v.optional(v.number()), // Max number of results (default: 50)
    minScore: v.optional(v.number()), // Minimum absolute score threshold
    direction: v.optional(v.union(v.literal("LONG"), v.literal("SHORT"), v.literal("NEUTRAL"))),
  },
  handler: async (ctx, args) => {
    // Get all scores - we'll filter and sort in memory
    const allScores = await ctx.db.query("symbolScores").collect();

    // Filter by direction if specified
    let filtered = allScores;
    if (args.direction) {
      filtered = allScores.filter((s) => s.direction === args.direction);
    }

    // Sort by absolute master score (descending)
    filtered = filtered.sort((a, b) => Math.abs(b.masterScore) - Math.abs(a.masterScore));

    // Apply minimum score threshold
    if (args.minScore !== undefined) {
      filtered = filtered.filter((s) => Math.abs(s.masterScore) >= args.minScore);
    }

    // Apply limit
    const limit = args.limit ?? 50;
    return filtered.slice(0, limit);
  },
});

/**
 * Get all symbols sorted by last update time
 * Useful for checking which symbols have been scored recently
 */
export const getRecentlyUpdatedScores = query({
  args: {
    limit: v.optional(v.number()), // Max number of results (default: 100)
    since: v.optional(v.number()), // Only return scores updated after this timestamp
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("symbolScores").withIndex("by_last_updated");

    const allScores = await query.order("desc").collect();

    // Filter by timestamp if specified
    let filtered = allScores;
    if (args.since !== undefined) {
      filtered = allScores.filter((s) => s.lastUpdated >= args.since!);
    }

    const limit = args.limit ?? 100;
    return filtered.slice(0, limit);
  },
});

/**
 * Get scores filtered by refresh trigger
 * Useful for debugging and monitoring which departments triggered updates
 */
export const getScoresByRefreshTrigger = query({
  args: {
    refreshTrigger: v.string(), // e.g., "TECHNICAL", "NEWS", "MACRO"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allScores = await ctx.db.query("symbolScores").collect();
    const filtered = allScores.filter((s) => s.refreshTrigger === args.refreshTrigger);

    // Sort by last updated (most recent first)
    filtered.sort((a, b) => b.lastUpdated - a.lastUpdated);

    const limit = args.limit ?? 100;
    return filtered.slice(0, limit);
  },
});

// =====================================================
// Utility Queries
// =====================================================

/**
 * Get all unique symbols that have scores
 */
export const getAllScoredSymbols = query({
  args: {},
  handler: async (ctx) => {
    const allScores = await ctx.db.query("symbolScores").collect();
    return [...new Set(allScores.map((s) => s.symbol))].sort();
  },
});

/**
 * Delete scores for a specific symbol
 * Useful for cleanup or when a symbol is removed from the universe
 */
export const deleteSymbolScores = mutation({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("symbolScores")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

/**
 * Check if a symbol has scores
 */
export const hasSymbolScores = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    const score = await ctx.db
      .query("symbolScores")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();
    return score !== null;
  },
});

