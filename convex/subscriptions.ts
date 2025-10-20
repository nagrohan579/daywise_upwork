import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Subscription Plans
export const getAllPlans = query({
  handler: async (ctx) => {
    return await ctx.db.query("subscriptionPlans").collect();
  },
});

export const getPlanById = query({
  args: { planId: v.string() },
  handler: async (ctx, { planId }) => {
    return await ctx.db
      .query("subscriptionPlans")
      .withIndex("by_planId", (q) => q.eq("planId", planId))
      .first();
  },
});

export const createPlan = mutation({
  args: {
    planId: v.string(),
    name: v.string(),
    banner: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    description: v.optional(v.string()),
    priceMonthly: v.optional(v.number()),
    priceYearly: v.optional(v.number()),
    stripePriceMonthly: v.optional(v.string()),
    stripePriceYearly: v.optional(v.string()),
    features: v.any(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("subscriptionPlans", {
      planId: args.planId,
      name: args.name,
      banner: args.banner,
      originalPrice: args.originalPrice,
      description: args.description,
      priceMonthly: args.priceMonthly,
      priceYearly: args.priceYearly,
      stripePriceMonthly: args.stripePriceMonthly,
      stripePriceYearly: args.stripePriceYearly,
      features: args.features ?? {},
      isActive: args.isActive ?? true,
      updatedAt: Date.now(),
    });
  },
});

export const updatePlan = mutation({
  args: {
    id: v.id("subscriptionPlans"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deletePlan = mutation({
  args: { id: v.id("subscriptionPlans") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});

// User Subscriptions
export const getUserSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const getAllUserSubscriptions = query({
  handler: async (ctx) => {
    return await ctx.db.query("userSubscriptions").collect();
  },
});

export const createUserSubscription = mutation({
  args: {
    userId: v.id("users"),
    planId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.string(),
    renewsAt: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    isAnnual: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("userSubscriptions", {
      userId: args.userId,
      planId: args.planId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      status: args.status,
      renewsAt: args.renewsAt,
      cancelAt: args.cancelAt,
      isAnnual: args.isAnnual ?? false,
      updatedAt: Date.now(),
    });
  },
});

export const updateUserSubscription = mutation({
  args: {
    userId: v.id("users"),
    updates: v.any(),
  },
  handler: async (ctx, { userId, updates }) => {
    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existing) return undefined;

    await ctx.db.patch(existing._id, { ...updates, updatedAt: Date.now() });
    return await ctx.db.get(existing._id);
  },
});

export const deleteUserSubscription = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existing) return false;

    await ctx.db.delete(existing._id);
    return true;
  },
});
