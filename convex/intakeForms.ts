import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all intake forms for a user
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("intakeForms")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get a single intake form by ID
export const getById = query({
  args: { formId: v.id("intakeForms") },
  handler: async (ctx, { formId }) => {
    return await ctx.db.get(formId);
  },
});

// Create a new intake form
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    fields: v.any(), // JSON array of field configurations
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("intakeForms", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      fields: args.fields,
      isActive: args.isActive ?? true,
      sortOrder: args.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an existing intake form
export const update = mutation({
  args: {
    formId: v.id("intakeForms"),
    updates: v.any(), // Partial updates
  },
  handler: async (ctx, { formId, updates }) => {
    const existing = await ctx.db.get(formId);

    if (!existing) {
      throw new Error("Form not found");
    }

    await ctx.db.patch(formId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(formId);
  },
});

// Delete an intake form
export const deleteForm = mutation({
  args: { formId: v.id("intakeForms") },
  handler: async (ctx, { formId }) => {
    const existing = await ctx.db.get(formId);

    if (!existing) {
      throw new Error("Form not found");
    }

    await ctx.db.delete(formId);
    return { success: true };
  },
});

// Set all intake forms inactive for a user
export const setAllInactiveForUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const intakeForms = await ctx.db
      .query("intakeForms")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    
    // Set all intake forms to inactive
    for (const form of intakeForms) {
      await ctx.db.patch(form._id, { isActive: false });
    }
    
    return intakeForms.length;
  },
});
