import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("appointmentTypes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("appointmentTypes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    duration: v.number(),
    bufferTimeBefore: v.optional(v.number()),
    bufferTime: v.optional(v.number()),
    price: v.optional(v.number()),
    color: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("appointmentTypes", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      duration: args.duration,
      bufferTimeBefore: args.bufferTimeBefore ?? 0,
      bufferTime: args.bufferTime ?? 0,
      price: args.price ?? 0,
      color: args.color ?? "#3b82f6",
      isActive: args.isActive ?? true,
      sortOrder: args.sortOrder ?? 0,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("appointmentTypes"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const deleteAppointmentType = mutation({
  args: { id: v.id("appointmentTypes") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});
