import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("feedback").collect();
  },
});

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("feedback", {
      name: args.name,
      email: args.email,
      message: args.message,
      status: "new",
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("feedback"),
    status: v.string(),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status });
    return await ctx.db.get(id);
  },
});
