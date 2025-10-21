import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get credentials by userId
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("googleCalendarCredentials")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

// Create new credentials
export const create = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("googleCalendarCredentials", {
      userId: args.userId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiry: args.tokenExpiry,
      scope: args.scope,
      isConnected: true,
      isSynced: false,
      updatedAt: Date.now(),
    });
  },
});

// Update credentials (mainly for token refresh)
export const update = mutation({
  args: {
    id: v.id("googleCalendarCredentials"),
    updates: v.object({
      accessToken: v.optional(v.string()),
      refreshToken: v.optional(v.string()),
      tokenExpiry: v.optional(v.number()),
      isConnected: v.optional(v.boolean()),
      isSynced: v.optional(v.boolean()),
      lastSyncAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Update by userId (convenience method)
export const updateByUserId = mutation({
  args: {
    userId: v.id("users"),
    updates: v.object({
      accessToken: v.optional(v.string()),
      refreshToken: v.optional(v.string()),
      tokenExpiry: v.optional(v.number()),
      isConnected: v.optional(v.boolean()),
      isSynced: v.optional(v.boolean()),
      lastSyncAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { userId, updates }) => {
    const existing = await ctx.db
      .query("googleCalendarCredentials")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existing) {
      throw new Error("No credentials found for this user");
    }

    await ctx.db.patch(existing._id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(existing._id);
  },
});

// Delete credentials (disconnect)
export const deleteByUserId = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("googleCalendarCredentials")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});

// Upsert credentials (create or update)
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleCalendarCredentials")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiry: args.tokenExpiry,
        scope: args.scope,
        isConnected: true,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(existing._id);
    } else {
      // Create new
      const id = await ctx.db.insert("googleCalendarCredentials", {
        userId: args.userId,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiry: args.tokenExpiry,
        scope: args.scope,
        isConnected: true,
        isSynced: false,
        updatedAt: Date.now(),
      });
      return await ctx.db.get(id);
    }
  },
});
