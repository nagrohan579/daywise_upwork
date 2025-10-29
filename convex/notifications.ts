import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    // Sort by createdAt descending (newest first)
    return notifications.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getUnreadByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId_isRead", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    relatedBookingId: v.optional(v.id("bookings")),
    customerName: v.string(),
    serviceName: v.string(),
    appointmentDate: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      relatedBookingId: args.relatedBookingId,
      isRead: false,
      customerName: args.customerName,
      serviceName: args.serviceName,
      appointmentDate: args.appointmentDate,
      createdAt: Date.now(),
    });
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { isRead: true });
    return await ctx.db.get(id);
  },
});

export const markAllAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_isRead", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return unread.length;
  },
});

export const deleteNotification = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});
