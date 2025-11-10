import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get temporary submission by session ID
export const getTempBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("tempFormSubmissions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});

// Get expired temporary submissions
export const getExpiredTemp = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("tempFormSubmissions")
      .withIndex("by_expiresAt")
      .filter((q) => q.lte(q.field("expiresAt"), now))
      .collect();
  },
});

// Get form submission by booking ID
export const getByBookingId = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    return await ctx.db
      .query("formSubmissions")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", bookingId))
      .first();
  },
});

// Create a temporary form submission
export const createTempSubmission = mutation({
  args: {
    sessionId: v.string(),
    intakeFormId: v.id("intakeForms"),
    appointmentTypeId: v.id("appointmentTypes"),
    responses: v.any(),
    fileUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    return await ctx.db.insert("tempFormSubmissions", {
      sessionId: args.sessionId,
      intakeFormId: args.intakeFormId,
      appointmentTypeId: args.appointmentTypeId,
      responses: args.responses,
      fileUrls: args.fileUrls,
      createdAt: now,
      expiresAt: now + oneHour,
    });
  },
});

// Update a temporary form submission
export const updateTempSubmission = mutation({
  args: {
    sessionId: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, { sessionId, updates }) => {
    const existing = await ctx.db
      .query("tempFormSubmissions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!existing) {
      throw new Error("Temporary submission not found");
    }

    await ctx.db.patch(existing._id, updates);
    return await ctx.db.get(existing._id);
  },
});

// Delete a temporary form submission
export const deleteTempSubmission = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const existing = await ctx.db
      .query("tempFormSubmissions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!existing) {
      throw new Error("Temporary submission not found");
    }

    await ctx.db.delete(existing._id);
    return { success: true, fileUrls: existing.fileUrls };
  },
});

// Finalize submission - create permanent record
// Note: File moving happens in the backend API endpoint
export const finalizeSubmission = mutation({
  args: {
    sessionId: v.string(),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { sessionId, bookingId }) => {
    // Get temp submission
    const tempSubmission = await ctx.db
      .query("tempFormSubmissions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!tempSubmission) {
      throw new Error("Temporary submission not found");
    }

    // Create permanent submission
    const submissionId = await ctx.db.insert("formSubmissions", {
      bookingId,
      intakeFormId: tempSubmission.intakeFormId,
      responses: tempSubmission.responses,
      submittedAt: Date.now(),
    });

    // Delete temp submission
    await ctx.db.delete(tempSubmission._id);

    return {
      submissionId,
      fileUrls: tempSubmission.fileUrls,
    };
  },
});

// Cleanup expired temporary submissions
export const cleanupExpiredTemp = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSubmissions = await ctx.db
      .query("tempFormSubmissions")
      .withIndex("by_expiresAt")
      .filter((q) => q.lte(q.field("expiresAt"), now))
      .collect();

    const deletedSubmissions = [];
    for (const submission of expiredSubmissions) {
      await ctx.db.delete(submission._id);
      deletedSubmissions.push({
        sessionId: submission.sessionId,
        fileUrls: submission.fileUrls,
      });
    }

    return {
      count: deletedSubmissions.length,
      deletedSubmissions,
    };
  },
});

// Delete form submission by booking ID (for cascade deletion)
export const deleteByBookingId = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const submission = await ctx.db
      .query("formSubmissions")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", bookingId))
      .first();

    if (!submission) {
      return { success: true, fileUrls: [] };
    }

    // Extract file URLs from responses
    const fileUrls: string[] = [];
    if (Array.isArray(submission.responses)) {
      for (const response of submission.responses) {
        if (response.fileUrls && Array.isArray(response.fileUrls)) {
          fileUrls.push(...response.fileUrls);
        }
      }
    }

    await ctx.db.delete(submission._id);
    return { success: true, fileUrls };
  },
});
