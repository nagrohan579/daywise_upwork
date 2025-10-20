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
      primaryColor: args.primaryColor ?? "#ef4444",
      secondaryColor: args.secondaryColor ?? "#f97316",
      accentColor: args.accentColor ?? "#3b82f6",
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
