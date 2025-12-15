import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user's index panels
export const getUserIndexPanels = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const panels = await ctx.db
      .query("userIndexPanels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();

    return panels;
  },
});

// Add index panel
export const addIndexPanel = mutation({
  args: {
    userId: v.string(),
    symbol: v.string(),
  },
  handler: async (ctx, { userId, symbol }) => {
    // Check if symbol already exists for this user
    const existing = await ctx.db
      .query("userIndexPanels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("symbol"), symbol))
      .first();

    if (existing) {
      throw new Error("Index panel already exists for this symbol");
    }

    // Get current max order
    const panels = await ctx.db
      .query("userIndexPanels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const maxOrder = panels.length > 0 ? Math.max(...panels.map((p) => p.order)) : -1;

    // Insert new panel
    const id = await ctx.db.insert("userIndexPanels", {
      userId,
      symbol,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });

    return id;
  },
});

// Delete index panel
export const deleteIndexPanel = mutation({
  args: {
    userId: v.string(),
    panelId: v.id("userIndexPanels"),
  },
  handler: async (ctx, { userId, panelId }) => {
    const panel = await ctx.db.get(panelId);

    if (!panel || panel.userId !== userId) {
      throw new Error("Panel not found or unauthorized");
    }

    await ctx.db.delete(panelId);
  },
});
