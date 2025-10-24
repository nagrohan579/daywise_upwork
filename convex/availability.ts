import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Legacy availability functions
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("availability")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("availability") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    weekday: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("availability", {
      userId: args.userId,
      weekday: args.weekday,
      startTime: args.startTime,
      endTime: args.endTime,
      isAvailable: args.isAvailable ?? true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("availability"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const deleteAvailability = mutation({
  args: { id: v.id("availability") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});

// Update weekly availability (bulk operation)
export const updateWeekly = mutation({
  args: {
    userId: v.id("users"),
    weeklySchedule: v.any(),
  },
  handler: async (ctx, { userId, weeklySchedule }) => {
    // Delete existing availability
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const item of existing) {
      await ctx.db.delete(item._id);
    }

    // Ensure all 7 days exist in the schedule
    const allDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const completeSchedule = { ...weeklySchedule };
    
    // Add missing days with empty arrays
    allDays.forEach(day => {
      if (!completeSchedule[day]) {
        completeSchedule[day] = [];
      }
    });

    // Insert new availability - create entries for ALL days
    const results = [];
    for (const [weekday, slots] of Object.entries(completeSchedule)) {
      if (Array.isArray(slots) && slots.length > 0) {
        // Day has time slots - create entries with isAvailable: true
        for (const slot of slots as any[]) {
          const id = await ctx.db.insert("availability", {
            userId,
            weekday,
            startTime: slot.start,
            endTime: slot.end,
            isAvailable: true,
          });
          results.push(await ctx.db.get(id));
        }
      } else {
        // Day has no time slots (unavailable) - create entry with isAvailable: false
        const id = await ctx.db.insert("availability", {
          userId,
          weekday,
          startTime: "00:00", // Default time for unavailable days
          endTime: "00:00",   // Default time for unavailable days
          isAvailable: false,
        });
        results.push(await ctx.db.get(id));
      }
    }

    return results;
  },
});

// Availability Patterns
export const getPatternsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("availabilityPatterns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createPattern = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    type: v.string(),
    isDefault: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    weeklySchedule: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    specificDates: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("availabilityPatterns", {
      userId: args.userId,
      name: args.name,
      type: args.type,
      isDefault: args.isDefault ?? false,
      isActive: args.isActive ?? true,
      weeklySchedule: args.weeklySchedule,
      startDate: args.startDate,
      endDate: args.endDate,
      specificDates: args.specificDates,
      updatedAt: Date.now(),
    });
  },
});

export const updatePattern = mutation({
  args: {
    id: v.id("availabilityPatterns"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deletePattern = mutation({
  args: { id: v.id("availabilityPatterns") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});

// Availability Exceptions
export const getExceptionsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getExceptionsByDate = query({
  args: { userId: v.id("users"), date: v.number() },
  handler: async (ctx, { userId, date }) => {
    return await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();
  },
});

export const createException = mutation({
  args: {
    userId: v.id("users"),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    date: v.number(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    type: v.string(),
    reason: v.optional(v.string()),
    customSchedule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("availabilityExceptions", args);
  },
});

export const updateException = mutation({
  args: {
    id: v.id("availabilityExceptions"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const deleteException = mutation({
  args: { id: v.id("availabilityExceptions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});

// Blocked Dates (Legacy)
export const getBlockedDatesByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("blockedDates")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createBlockedDate = mutation({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
    reason: v.optional(v.string()),
    isAllDay: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("blockedDates", {
      userId: args.userId,
      startDate: args.startDate,
      endDate: args.endDate,
      reason: args.reason,
      isAllDay: args.isAllDay ?? true,
    });
  },
});

export const updateBlockedDate = mutation({
  args: {
    id: v.id("blockedDates"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const deleteBlockedDate = mutation({
  args: { id: v.id("blockedDates") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});
