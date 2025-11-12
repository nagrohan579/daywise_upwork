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
    intakeFormId: v.optional(v.id("intakeForms")),
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
      intakeFormId: args.intakeFormId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("appointmentTypes"),
    updates: v.any(),
  },
  handler: async (ctx, { id, updates }) => {
    // Prepare patch data - filter out null/undefined values
    // Note: boolean false should be included, only null/undefined are filtered
    const patchData: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      // Skip null/undefined values - we'll handle intakeFormId separately if it's null
      // Boolean false is a valid value and should be included
      if (value !== undefined && value !== null) {
        patchData[key] = value;
      }
    }
    
    // If intakeFormId is explicitly null, we need to clear it
    // Convex doesn't support undefined in patch, so we need to use replace
    if (updates.intakeFormId === null) {
      const existing = await ctx.db.get(id);
      if (!existing) {
        throw new Error("Appointment type not found");
      }
      
      // Build replacement: start with existing, apply updates, but exclude intakeFormId
      const { intakeFormId: _, ...restOfExisting } = existing;
      
      // Filter updates to exclude intakeFormId and null/undefined values
      const filteredUpdates: any = {};
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'intakeFormId' && value !== undefined && value !== null) {
          filteredUpdates[key] = value;
        }
      }
      
      const replacement: any = {
        ...restOfExisting,
        ...filteredUpdates,
        // intakeFormId is explicitly omitted to clear it
      };
      
      await ctx.db.replace(id, replacement);
    } else {
      // Normal patch for other updates (including when intakeFormId is set to a value)
      if (Object.keys(patchData).length > 0) {
        await ctx.db.patch(id, patchData);
      }
    }
    
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

export const setAllInactiveForUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const appointmentTypes = await ctx.db
      .query("appointmentTypes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    
    // Set all appointment types to inactive
    for (const appointmentType of appointmentTypes) {
      await ctx.db.patch(appointmentType._id, { isActive: false });
    }
    
    return appointmentTypes.length;
  },
});
