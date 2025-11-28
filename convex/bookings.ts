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

    // LOG 1: Time window being searched
    console.log(`[Reminder Query] Searching for bookings between:`);
    console.log(`[Reminder Query]   windowStart: ${new Date(windowStart).toISOString()}`);
    console.log(`[Reminder Query]   windowEnd: ${new Date(windowEnd).toISOString()}`);

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

    // LOG 2: How many bookings matched initial query
    console.log(`[Reminder Query] Found ${bookings.length} confirmed bookings in time window`);

    // Filter bookings based on:
    // 1. User has Pro subscription
    // 2. Reminders haven't been sent yet
    const eligibleBookings = [];
    let skippedAlreadySent = 0;
    let skippedNoProSubscription = 0;

    for (const booking of bookings) {
      // LOG 3: Each booking being checked
      console.log(`[Reminder Query] Checking booking ${booking._id}:`);
      console.log(`[Reminder Query]   appointmentDate: ${new Date(booking.appointmentDate).toISOString()}`);
      console.log(`[Reminder Query]   userId: ${booking.userId}`);
      console.log(`[Reminder Query]   customerReminderSentAt: ${booking.customerReminderSentAt ? new Date(booking.customerReminderSentAt).toISOString() : 'NOT SENT'}`);
      console.log(`[Reminder Query]   businessReminderSentAt: ${booking.businessReminderSentAt ? new Date(booking.businessReminderSentAt).toISOString() : 'NOT SENT'}`);

      // Check if reminders already sent
      if (booking.customerReminderSentAt && booking.businessReminderSentAt) {
        console.log(`[Reminder Query]   ❌ SKIPPED - Both reminders already sent`);
        skippedAlreadySent++;
        continue; // Skip if both reminders already sent
      }

      // Check if user has Pro subscription
      const subscription = await ctx.db
        .query("userSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", booking.userId))
        .first();

      // LOG 4: Subscription details
      if (!subscription) {
        console.log(`[Reminder Query]   ❌ SKIPPED - No subscription found for user`);
        skippedNoProSubscription++;
        continue;
      }

      console.log(`[Reminder Query]   Subscription: planId=${subscription.planId}, status=${subscription.status}, isTrial=${subscription.isTrial}`);

      if (subscription && subscription.status === "active" && subscription.planId === "pro") {
        console.log(`[Reminder Query]   ✅ ELIGIBLE - Adding to reminder list`);
        eligibleBookings.push(booking);
      } else {
        console.log(`[Reminder Query]   ❌ SKIPPED - Not active Pro subscription`);
        skippedNoProSubscription++;
      }
    }

    // LOG 5: Final summary
    console.log(`[Reminder Query] ========================================`);
    console.log(`[Reminder Query] SUMMARY:`);
    console.log(`[Reminder Query]   Total bookings in window: ${bookings.length}`);
    console.log(`[Reminder Query]   Skipped (reminders sent): ${skippedAlreadySent}`);
    console.log(`[Reminder Query]   Skipped (no Pro): ${skippedNoProSubscription}`);
    console.log(`[Reminder Query]   ELIGIBLE: ${eligibleBookings.length}`);
    console.log(`[Reminder Query] ========================================`);

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

// Enhanced query that fetches bookings WITH all related data (eliminates backend re-queries)
export const getDueForRemindersWithData = query({
  handler: async (ctx) => {
    const now = Date.now();
    const twentyFourHoursFromNow = now + 24 * 60 * 60 * 1000;
    const windowMinutes = 30;
    const windowStart = twentyFourHoursFromNow - (windowMinutes * 60 * 1000);
    const windowEnd = twentyFourHoursFromNow + (windowMinutes * 60 * 1000);

    console.log(`[Reminder Query] Searching for bookings between:`);
    console.log(`[Reminder Query]   windowStart: ${new Date(windowStart).toISOString()}`);
    console.log(`[Reminder Query]   windowEnd: ${new Date(windowEnd).toISOString()}`);

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

    console.log(`[Reminder Query] Found ${bookings.length} confirmed bookings in time window`);

    // Build complete data objects with all related info
    const bookingsWithData = [];
    let skippedAlreadySent = 0;
    let skippedNoProSubscription = 0;

    for (const booking of bookings) {
      console.log(`[Reminder Query] Checking booking ${booking._id}:`);
      console.log(`[Reminder Query]   appointmentDate: ${new Date(booking.appointmentDate).toISOString()}`);
      console.log(`[Reminder Query]   userId: ${booking.userId}`);
      console.log(`[Reminder Query]   customerReminderSentAt: ${booking.customerReminderSentAt ? new Date(booking.customerReminderSentAt).toISOString() : 'NOT SENT'}`);
      console.log(`[Reminder Query]   businessReminderSentAt: ${booking.businessReminderSentAt ? new Date(booking.businessReminderSentAt).toISOString() : 'NOT SENT'}`);

      // Check if reminders already sent
      if (booking.customerReminderSentAt && booking.businessReminderSentAt) {
        console.log(`[Reminder Query]   ❌ SKIPPED - Both reminders already sent`);
        skippedAlreadySent++;
        continue;
      }

      // Check Pro subscription
      const subscription = await ctx.db
        .query("userSubscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", booking.userId))
        .first();

      console.log(`[Reminder Query]   Subscription: planId=${subscription?.planId}, status=${subscription?.status}, isTrial=${subscription?.isTrial}`);

      if (!subscription || subscription.status !== "active" || subscription.planId !== "pro") {
        console.log(`[Reminder Query]   ❌ SKIPPED - No active Pro subscription`);
        skippedNoProSubscription++;
        continue;
      }

      // Fetch all related data NOW (eliminates backend re-fetching)
      const user = await ctx.db.get(booking.userId);
      if (!user) {
        console.log(`[Reminder Query]   ❌ SKIPPED - User not found`);
        continue;
      }

      const appointmentType = booking.appointmentTypeId
        ? await ctx.db.get(booking.appointmentTypeId)
        : null;

      const branding = await ctx.db
        .query("branding")
        .withIndex("by_userId", (q) => q.eq("userId", booking.userId))
        .first();

      console.log(`[Reminder Query]   ✅ ELIGIBLE - Adding to reminder list`);

      bookingsWithData.push({
        booking,
        user,
        appointmentType,
        branding,
      });
    }

    console.log(`[Reminder Query] ========================================`);
    console.log(`[Reminder Query] SUMMARY:`);
    console.log(`[Reminder Query]   Total bookings in window: ${bookings.length}`);
    console.log(`[Reminder Query]   Skipped (reminders sent): ${skippedAlreadySent}`);
    console.log(`[Reminder Query]   Skipped (no Pro): ${skippedNoProSubscription}`);
    console.log(`[Reminder Query]   ELIGIBLE: ${bookingsWithData.length}`);
    console.log(`[Reminder Query] ========================================`);

    return bookingsWithData;
  },
});

// Internal action to send due reminders (called by cron) - BATCH VERSION
export const sendDueReminders = internalAction({
  handler: async (ctx) => {
    // Get all eligible bookings WITH complete data
    const bookingsWithData = await ctx.runQuery(
      internal.bookings.getDueForRemindersWithData
    );

    console.log(`[Reminder Cron] Found ${bookingsWithData.length} bookings due for reminders`);

    if (bookingsWithData.length === 0) {
      return { processed: 0, successful: 0, failed: 0 };
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    console.log(`[Reminder Cron] Using backend URL: ${backendUrl}`);

    const BATCH_SIZE = 10; // Process 10 bookings per HTTP call
    const results = { processed: 0, successful: 0, failed: 0 };

    // Split into batches to prevent overwhelming backend
    for (let i = 0; i < bookingsWithData.length; i += BATCH_SIZE) {
      const batch = bookingsWithData.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(bookingsWithData.length / BATCH_SIZE);

      console.log(`[Reminder Cron] Processing batch ${batchNumber}/${totalBatches} (${batch.length} bookings)`);

      try {
        // Single HTTP call for entire batch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(
          `${backendUrl}/api/cron/send-reminder-batch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookings: batch }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();

          console.log(`[Reminder Cron] Batch ${batchNumber} response:`, {
            total: result.total,
            successful: result.successful?.length || 0,
            failed: result.failed?.length || 0,
          });

          // Mark successful reminders as sent
          if (result.successful && result.successful.length > 0) {
            for (const success of result.successful) {
              try {
                await ctx.runMutation(internal.bookings.markRemindersSent, {
                  id: success.bookingId,
                  which: success.which,
                });
                results.successful++;
              } catch (markError) {
                console.error(`[Reminder Cron] Failed to mark ${success.bookingId} as sent:`, markError);
              }
            }
          }

          results.processed += batch.length;
          console.log(`[Reminder Cron] Batch ${batchNumber} completed: ${result.successful?.length || 0}/${batch.length} successful`);
        } else {
          const errorText = await response.text();
          console.error(`[Reminder Cron] Batch ${batchNumber} failed: ${response.status} - ${errorText}`);
          results.failed += batch.length;
        }
      } catch (error) {
        console.error(`[Reminder Cron] Batch ${batchNumber} error:`, error);
        results.failed += batch.length;
      }

      // Small delay between batches to avoid overwhelming backend
      if (i + BATCH_SIZE < bookingsWithData.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay
      }
    }

    console.log(`[Reminder Cron] ========================================`);
    console.log(`[Reminder Cron] FINAL RESULTS:`);
    console.log(`[Reminder Cron]   Total processed: ${results.processed}`);
    console.log(`[Reminder Cron]   Successful: ${results.successful}`);
    console.log(`[Reminder Cron]   Failed: ${results.failed}`);
    console.log(`[Reminder Cron] ========================================`);

    return results;
  },
});
