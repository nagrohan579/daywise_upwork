import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get booking by ID
export const getById = query({
  args: { id: v.id("bookings") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get booking by ID with appointment type
export const getByIdWithType = query({
  args: { id: v.id("bookings") },
  handler: async (ctx, { id }) => {
    const booking = await ctx.db.get(id);
    if (!booking) return null;
    
    let appointmentType: any = null;
    if (booking.appointmentTypeId) {
      appointmentType = await ctx.db.get(booking.appointmentTypeId);
    }
    
    return {
      ...booking,
      appointmentType,
    };
  },
});

// Get booking by token
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_bookingToken", (q) => q.eq("bookingToken", token))
      .first();
  },
});

// Get booking by token with appointment type
export const getByTokenWithType = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_bookingToken", (q) => q.eq("bookingToken", token))
      .first();
    
    if (!booking) return null;
    
    let appointmentType: any = null;
    if (booking.appointmentTypeId) {
      appointmentType = await ctx.db.get(booking.appointmentTypeId);
    }
    
    return {
      ...booking,
      appointmentType,
    };
  },
});

// Get bookings by user
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get bookings by user with appointment types
export const getByUserWithTypes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Fetch appointment types for each booking
    const bookingsWithTypes = await Promise.all(
      bookings.map(async (booking) => {
        let appointmentType: any = null;
        if (booking.appointmentTypeId) {
          appointmentType = await ctx.db.get(booking.appointmentTypeId);
        }
        return {
          ...booking,
          appointmentType,
        };
      })
    );

    return bookingsWithTypes;
  },
});

// Get all bookings (admin)
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("bookings").collect();
  },
});

// Create booking
export const create = mutation({
  args: {
    userId: v.id("users"),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    customerName: v.string(),
    customerEmail: v.string(),
    appointmentDate: v.number(),
    duration: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    bookingToken: v.string(),
    googleCalendarEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bookings", {
      userId: args.userId,
      appointmentTypeId: args.appointmentTypeId,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      appointmentDate: args.appointmentDate,
      duration: args.duration ?? 30,
      status: args.status ?? "confirmed",
      notes: args.notes,
      bookingToken: args.bookingToken,
      googleCalendarEventId: args.googleCalendarEventId,
    });
  },
});

// Update booking
export const update = mutation({
  args: {
    id: v.id("bookings"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

// Delete booking
export const deleteBooking = mutation({
  args: { id: v.id("bookings") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});

// Get bookings due for reminders
export const getDueForReminders = query({
  args: { windowMinutes: v.number() },
  handler: async (ctx, { windowMinutes }) => {
    const now = Date.now();
    const windowStart = now + (24 * 60 - windowMinutes) * 60 * 1000; // 24 hours - window
    const windowEnd = now + 24 * 60 * 60 * 1000; // 24 hours

    return await ctx.db
      .query("bookings")
      .withIndex("by_appointmentDate")
      .filter((q) =>
        q.and(
          q.gte(q.field("appointmentDate"), windowStart),
          q.lte(q.field("appointmentDate"), windowEnd),
          q.eq(q.field("status"), "confirmed")
        )
      )
      .collect();
  },
});

// Mark reminders sent
export const markRemindersSent = mutation({
  args: {
    id: v.id("bookings"),
    which: v.union(v.literal("customer"), v.literal("business"), v.literal("both")),
  },
  handler: async (ctx, { id, which }) => {
    const now = Date.now();
    const updates: any = {};

    if (which === "customer" || which === "both") {
      updates.customerReminderSentAt = now;
    }
    if (which === "business" || which === "both") {
      updates.businessReminderSentAt = now;
    }

    await ctx.db.patch(id, updates);
  },
});
