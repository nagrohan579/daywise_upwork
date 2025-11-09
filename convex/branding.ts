import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("branding")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    primary: v.string(),
    secondary: v.string(),
    accent: v.string(),
    logoUrl: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    displayName: v.optional(v.string()),
    showDisplayName: v.optional(v.boolean()),
    showProfilePicture: v.optional(v.boolean()),
    usePlatformBranding: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("branding", {
      userId: args.userId,
      primary: args.primary,
      secondary: args.secondary,
      accent: args.accent,
      logoUrl: args.logoUrl,
      profilePictureUrl: args.profilePictureUrl,
      displayName: args.displayName,
      showDisplayName: args.showDisplayName ?? true,
      showProfilePicture: args.showProfilePicture ?? true,
      usePlatformBranding: args.usePlatformBranding ?? true,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    updates: v.any(),
  },
  handler: async (ctx, { userId, updates }) => {
    const existing = await ctx.db
      .query("branding")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existing) return undefined;

    await ctx.db.patch(existing._id, { ...updates, updatedAt: Date.now() });
    return await ctx.db.get(existing._id);
  },
});

export const clearField = mutation({
  args: {
    userId: v.id("users"),
    field: v.string(), // only allows specific fields at runtime
  },
  handler: async (ctx, { userId, field }) => {
    const existing = await ctx.db
      .query("branding")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existing) return undefined;

    if (field !== "logoUrl" && field !== "profilePictureUrl") {
      throw new Error("Unsupported field to clear");
    }

    // Clear both the URL and associated crop data
    const patch: any = { updatedAt: Date.now() };
    if (field === "logoUrl") {
      patch.logoUrl = undefined;
      patch.logoCropData = undefined;
    } else if (field === "profilePictureUrl") {
      patch.profilePictureUrl = undefined;
      patch.profileCropData = undefined;
    }

    await ctx.db.patch(existing._id, patch);
    return await ctx.db.get(existing._id);
  },
});
