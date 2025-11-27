import { v } from "convex/values";
import { query, mutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

// Check if user has active Pro subscription
export const hasProSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!subscription) return false;

    // Check if subscription is active and is "pro" plan
    return subscription.status === "active" && subscription.planId === "pro";
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
    startDate: v.optional(v.number()),
    lifetimeSpend: v.optional(v.number()),
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
      startDate: args.startDate,
      lifetimeSpend: args.lifetimeSpend ?? 0,
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

// Trial Subscription Management

export const createTrialSubscription = mutation({
  args: {
    userId: v.id("users"),
    trialDuration: v.number(),
  },
  handler: async (ctx, { userId, trialDuration }) => {
    console.log(`[Trial Creation] Starting trial creation for user ${userId}, duration: ${trialDuration}s`);

    // Validate user exists
    const user = await ctx.db.get(userId);
    if (!user) {
      console.error(`[Trial Creation] User ${userId} not found`);
      throw new Error("User not found");
    }

    // Check if user already has an active subscription
    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      console.log(`[Trial Creation] Found existing subscription ${existing._id} for user ${userId}`);
      console.log(`[Trial Creation] Previous plan: ${existing.planId}, status: ${existing.status}, isTrial: ${existing.isTrial}`);
    }

    const now = Date.now();
    const expiresAt = now + (trialDuration * 1000);

    const subscriptionData = {
      userId,
      planId: "pro",
      status: "active" as const,
      isTrial: true,
      trialDuration,
      trialExpiresAt: expiresAt,
      startDate: now,
      renewsAt: expiresAt,
      cancelAt: undefined,
      isAnnual: false,
      lifetimeSpend: existing?.lifetimeSpend || 0,
      stripeCustomerId: existing?.stripeCustomerId,
      stripeSubscriptionId: existing?.stripeSubscriptionId,
      updatedAt: now,
    };

    let subscriptionId;
    if (existing) {
      console.log(`[Trial Creation] Updating existing subscription ${existing._id}`);
      await ctx.db.patch(existing._id, subscriptionData);
      subscriptionId = existing._id;
      console.log(`[Trial Creation] Successfully updated subscription ${existing._id}`);
    } else {
      console.log(`[Trial Creation] Creating new subscription for user ${userId}`);
      subscriptionId = await ctx.db.insert("userSubscriptions", subscriptionData);
      console.log(`[Trial Creation] Successfully created subscription ${subscriptionId}`);
    }

    console.log(`[Trial Creation] Trial subscription active until ${new Date(expiresAt).toISOString()}`);
    return subscriptionId;
  },
});

export const getExpiredTrials = query({
  handler: async (ctx) => {
    const now = Date.now();
    console.log(`[Trial Query] Checking for expired trials at ${new Date(now).toISOString()}`);

    const allSubscriptions = await ctx.db.query("userSubscriptions").collect();
    console.log(`[Trial Query] Found ${allSubscriptions.length} total subscriptions`);

    const expiredTrials = allSubscriptions.filter(sub => {
      const isExpired =
        sub.isTrial === true &&
        sub.status === "active" &&
        sub.trialExpiresAt &&
        sub.trialExpiresAt <= now;

      if (isExpired) {
        console.log(`[Trial Query] Found expired trial: userId=${sub.userId}, expiresAt=${new Date(sub.trialExpiresAt).toISOString()}`);
      }

      return isExpired;
    });

    console.log(`[Trial Query] Found ${expiredTrials.length} expired trials to process`);
    return expiredTrials;
  },
});

export const expireTrial = mutation({
  args: {
    subscriptionId: v.id("userSubscriptions"),
  },
  handler: async (ctx, { subscriptionId }) => {
    console.log(`[Trial Expiration] Starting expiration for subscription ${subscriptionId}`);

    const subscription = await ctx.db.get(subscriptionId);
    if (!subscription) {
      console.error(`[Trial Expiration] Subscription ${subscriptionId} not found, skipping`);
      return;
    }

    console.log(`[Trial Expiration] Current state: userId=${subscription.userId}, planId=${subscription.planId}, isTrial=${subscription.isTrial}, status=${subscription.status}`);

    if (subscription.isTrial !== true) {
      console.warn(`[Trial Expiration] Subscription ${subscriptionId} is not a trial (isTrial=${subscription.isTrial}), skipping downgrade`);
      return;
    }

    if (subscription.planId === "free") {
      console.warn(`[Trial Expiration] Subscription ${subscriptionId} already on free plan, cleaning up trial flags only`);
      await ctx.db.patch(subscriptionId, {
        isTrial: false,
        trialDuration: undefined,
        trialExpiresAt: undefined,
        updatedAt: Date.now(),
      });
      return;
    }

    const now = Date.now();
    console.log(`[Trial Expiration] Downgrading subscription ${subscriptionId} from ${subscription.planId} to free`);

    await ctx.db.patch(subscriptionId, {
      planId: "free",
      status: "active" as const,
      isTrial: false,
      trialDuration: undefined,
      trialExpiresAt: undefined,
      updatedAt: now,
    });

    console.log(`[Trial Expiration] Successfully downgraded subscription ${subscriptionId} to free plan`);
  },
});

export const processExpiredTrials = internalAction({
  handler: async (ctx) => {
    const startTime = Date.now();
    console.log(`[Trial Expiration Cron] ========================================`);
    console.log(`[Trial Expiration Cron] Starting at ${new Date(startTime).toISOString()}`);

    try {
      const expiredTrials = await ctx.runQuery(internal.subscriptions.getExpiredTrials);

      console.log(`[Trial Expiration Cron] Found ${expiredTrials.length} expired trial subscriptions`);

      if (expiredTrials.length === 0) {
        console.log(`[Trial Expiration Cron] No expired trials to process`);
        return { processed: 0, success: 0, failed: 0 };
      }

      let successCount = 0;
      let failCount = 0;

      for (const trial of expiredTrials) {
        try {
          console.log(`[Trial Expiration Cron] Processing trial ${trial._id} for user ${trial.userId}`);

          await ctx.runMutation(internal.subscriptions.expireTrial, {
            subscriptionId: trial._id,
          });

          successCount++;
          console.log(`[Trial Expiration Cron] ✅ Successfully downgraded user ${trial.userId} (${successCount}/${expiredTrials.length})`);
        } catch (error) {
          failCount++;
          console.error(`[Trial Expiration Cron] ❌ Error expiring trial for user ${trial.userId} (${failCount} failures):`, error);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`[Trial Expiration Cron] ========================================`);
      console.log(`[Trial Expiration Cron] Completed in ${duration}ms`);
      console.log(`[Trial Expiration Cron] Total: ${expiredTrials.length}, Success: ${successCount}, Failed: ${failCount}`);
      console.log(`[Trial Expiration Cron] ========================================`);

      return {
        processed: expiredTrials.length,
        success: successCount,
        failed: failCount,
        duration,
      };
    } catch (error) {
      console.error(`[Trial Expiration Cron] ❌ CRITICAL ERROR in cron job:`, error);
      throw error;
    }
  },
});
