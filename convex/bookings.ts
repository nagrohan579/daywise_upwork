import { v } from "convex/values";
import { query, mutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

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
    customerTimezone: v.optional(v.string()),
    appointmentDate: v.number(),
    duration: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    bookingToken: v.string(),
    eventUrl: v.optional(v.string()),
    formSessionId: v.optional(v.string()),
    googleCalendarEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("bookings", {
      userId: args.userId,
      appointmentTypeId: args.appointmentTypeId,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerTimezone: args.customerTimezone,
      appointmentDate: args.appointmentDate,
      duration: args.duration ?? 30,
      status: args.status ?? "confirmed",
      notes: args.notes,
      bookingToken: args.bookingToken,
      eventUrl: args.eventUrl,
      formSessionId: args.formSessionId,
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

// Get bookings due for reminders (24 hours before appointment)
export const getDueForReminders = query({
  handler: async (ctx) => {
    const now = Date.now();
    const twentyFourHoursFromNow = now + 24 * 60 * 60 * 1000;
    const windowMinutes = 30; // 30-minute window for flexibility
    const windowStart = twentyFourHoursFromNow - (windowMinutes * 60 * 1000);
    const windowEnd = twentyFourHoursFromNow + (windowMinutes * 60 * 1000);

    // Get all confirmed bookings within the 24-hour window
    const bookings = await ctx.db
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

    // Filter bookings based on:
    // 1. User has Pro subscription
    // 2. Reminders haven't been sent yet
    const eligibleBookings = [];

    for (const booking of bookings) {
      // Check if reminders already sent
      if (booking.customerReminderSentAt && booking.businessReminderSentAt) {
        continue; // Skip if both reminders already sent
      }

      // Check if user has Pro subscription
      const subscription = await ctx.db
        .query("userSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", booking.userId))
        .first();

      if (subscription && subscription.status === "active" && subscription.planId === "pro") {
        eligibleBookings.push(booking);
      }
    }

    return eligibleBookings;
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

// Internal action to send due reminders (called by cron)
export const sendDueReminders = internalAction({
  handler: async (ctx) => {
    // Get all eligible bookings
    const bookings = await ctx.runQuery(internal.bookings.getDueForReminders);

    console.log(`[Reminder Cron] Found ${bookings.length} bookings due for reminders`);

    // Send reminder for each booking
    for (const booking of bookings) {
      try {
        // Get the backend URL from environment
        const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

        // Call backend API to send the reminder
        const response = await fetch(`${backendUrl}/api/cron/send-reminder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: booking._id,
          }),
        });

        if (response.ok) {
          console.log(`[Reminder Cron] Successfully sent reminder for booking ${booking._id}`);
        } else {
          const errorText = await response.text();
          console.error(`[Reminder Cron] Failed to send reminder for booking ${booking._id}: ${errorText}`);
        }
      } catch (error) {
        console.error(`[Reminder Cron] Error sending reminder for booking ${booking._id}:`, error);
      }
    }

    return { processed: bookings.length };
  },
});
