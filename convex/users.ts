import { v } from "convex/values";
import { query, mutation} from "./_generated/server";

// Get user by ID
export const getById = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get user by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

// Get user by Google ID
export const getByGoogleId = query({
  args: { googleId: v.string() },
  handler: async (ctx, { googleId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", googleId))
      .first();
  },
});

// Get user by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

// Get user by verification token
export const getByVerificationToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_emailVerificationToken", (q) => q.eq("emailVerificationToken", token))
      .first();
  },
});

// Get user by password reset token
export const getByPasswordResetToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_passwordResetToken", (q) => q.eq("passwordResetToken", token))
      .first();
  },
});

// Get all users (admin only)
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Create user
export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.optional(v.string()),
    googleId: v.optional(v.string()),
    picture: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    emailVerificationToken: v.optional(v.string()),
    emailVerificationExpires: v.optional(v.number()),
    businessName: v.optional(v.string()),
    slug: v.optional(v.string()),
    timezone: v.optional(v.string()),
    country: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    bookingWindow: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      password: args.password,
      googleId: args.googleId,
      picture: args.picture,
      emailVerified: args.emailVerified ?? false,
      emailVerificationToken: args.emailVerificationToken,
      emailVerificationExpires: args.emailVerificationExpires,
      businessName: args.businessName,
      slug: args.slug,
      primaryColor: args.primaryColor ?? "#0053F1",
      secondaryColor: args.secondaryColor ?? "#64748B",
      accentColor: args.accentColor ?? "#121212",
      timezone: args.timezone ?? "UTC",
      bookingWindow: args.bookingWindow ?? 60,
      country: args.country ?? "US",
      isAdmin: args.isAdmin ?? false,
    });
  },
});

// Update user
export const update = mutation({
  args: {
    id: v.id("users"),
    updates: v.any(), // Partial updates
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

// Update verification token
export const updateVerificationToken = mutation({
  args: {
    id: v.id("users"),
    token: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, { id, token, expires }) => {
    await ctx.db.patch(id, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });
  },
});

// Verify email
export const verifyEmail = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });
  },
});

// Update password reset token
export const updatePasswordResetToken = mutation({
  args: {
    id: v.id("users"),
    token: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, { id, token, expires }) => {
    await ctx.db.patch(id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  },
});

// Reset password
export const resetPassword = mutation({
  args: {
    id: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, { id, newPassword }) => {
    await ctx.db.patch(id, {
      password: newPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });
  },
});

// Delete user and all associated data
export const deleteUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    // 1. Get all appointment types for this user
    const appointmentTypes = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();

    // 2. Delete appointmentTypeAvailability entries (junction table)
    for (const type of appointmentTypes) {
      const mappings = await ctx.db
        .query("appointmentTypeAvailability")
        .withIndex("by_appointmentTypeId", (q) => q.eq("appointmentTypeId", type._id))
        .collect();
      for (const mapping of mappings) {
        await ctx.db.delete(mapping._id);
      }
    }

    // 3. Delete notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // 4. Delete bookings
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();
    for (const booking of bookings) {
      await ctx.db.delete(booking._id);
    }

    // 5. Delete availability exceptions
    const exceptions = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();
    for (const exception of exceptions) {
      await ctx.db.delete(exception._id);
    }

    // 6. Delete blocked dates
    const blockedDates = await ctx.db
      .query("blockedDates")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();
    for (const blockedDate of blockedDates) {
      await ctx.db.delete(blockedDate._id);
    }

    // 7. Delete availability (basic weekly)
    const availabilities = await ctx.db
      .query("availability")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();
    for (const availability of availabilities) {
      await ctx.db.delete(availability._id);
    }

    // 8. Delete availability patterns
    const patterns = await ctx.db
      .query("availabilityPatterns")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .collect();
    for (const pattern of patterns) {
      await ctx.db.delete(pattern._id);
    }

    // 9. Delete appointment types
    for (const type of appointmentTypes) {
      await ctx.db.delete(type._id);
    }

    // 10. Delete branding
    const branding = await ctx.db
      .query("branding")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .first();
    if (branding) {
      await ctx.db.delete(branding._id);
    }

    // 11. Delete user subscription
    const subscription = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .first();
    if (subscription) {
      await ctx.db.delete(subscription._id);
    }

    // 12. Delete Google Calendar credentials
    const googleCreds = await ctx.db
      .query("googleCalendarCredentials")
      .withIndex("by_userId", (q) => q.eq("userId", id))
      .first();
    if (googleCreds) {
      await ctx.db.delete(googleCreds._id);
    }

    // 13. Finally, delete the user
    await ctx.db.delete(id);

    return { success: true };
  },
});

// Update account status (for admin)
export const updateAccountStatus = mutation({
  args: {
    id: v.id("users"),
    accountStatus: v.string(), // "active" or "inactive"
  },
  handler: async (ctx, { id, accountStatus }) => {
    await ctx.db.patch(id, {
      accountStatus,
    });
    return await ctx.db.get(id);
  },
});

// ============================================
// CANVA INTEGRATION - Cross-platform account management
// ============================================

// Get user by Canva user ID
export const getByCanvaUserId = query({
  args: { canvaUserId: v.string() },
  handler: async (ctx, { canvaUserId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_canvaUserId", (q) => q.eq("canvaUserId", canvaUserId))
      .first();
  },
});
