import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - Main user accounts & profiles
  users: defineTable({
    email: v.string(),
    password: v.optional(v.string()), // null for Google OAuth users
    emailVerified: v.boolean(),
    emailVerificationToken: v.optional(v.string()),
    emailVerificationExpires: v.optional(v.number()), // timestamp
    passwordResetToken: v.optional(v.string()),
    passwordResetExpires: v.optional(v.number()), // timestamp
    googleId: v.optional(v.string()),
    name: v.string(),
    picture: v.optional(v.string()),
    businessName: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    slug: v.optional(v.string()),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    accentColor: v.string(),
    timezone: v.string(),
    weeklyHours: v.optional(v.any()), // JSON object
    bookingWindow: v.number(),
    bookingWindowDate: v.optional(v.string()),
    bookingWindowStart: v.optional(v.string()),
    bookingWindowEnd: v.optional(v.string()),
    closedMonths: v.optional(v.array(v.number())),
    country: v.string(),
    isAdmin: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_googleId", ["googleId"])
    .index("by_slug", ["slug"])
    .index("by_emailVerificationToken", ["emailVerificationToken"])
    .index("by_passwordResetToken", ["passwordResetToken"]),

  // Bookings table - Appointment bookings
  bookings: defineTable({
    userId: v.id("users"),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    customerName: v.string(),
    customerEmail: v.string(),
    customerTimezone: v.optional(v.string()),
    appointmentDate: v.number(), // timestamp
    duration: v.optional(v.number()), // Duration in minutes - optional for internal bookings
    status: v.string(), // "confirmed", "pending", "cancelled"
    notes: v.optional(v.string()),
    bookingToken: v.string(),
    eventUrl: v.optional(v.string()), // Unique shareable event link for customer
    customerReminderSentAt: v.optional(v.number()),
    businessReminderSentAt: v.optional(v.number()),
    googleCalendarEventId: v.optional(v.string()), // Google Calendar event ID for syncing
  })
    .index("by_userId", ["userId"])
    .index("by_appointmentTypeId", ["appointmentTypeId"])
    .index("by_bookingToken", ["bookingToken"])
    .index("by_appointmentDate", ["appointmentDate"])
    .index("by_status", ["status"]),

  // Appointment Types table - Service types
  appointmentTypes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    duration: v.number(),
    bufferTimeBefore: v.number(),
    bufferTime: v.number(),
    price: v.number(),
    color: v.string(),
    isActive: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_active", ["userId", "isActive"]),

  // Availability table (Legacy) - Basic weekly availability
  availability: defineTable({
    userId: v.id("users"),
    weekday: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    isAvailable: v.boolean(),
  }).index("by_userId", ["userId"]),

  // Availability Patterns - Advanced availability schedules
  availabilityPatterns: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.string(), // "recurring", "date_range", "specific_dates"
    isDefault: v.boolean(),
    isActive: v.boolean(),
    weeklySchedule: v.optional(v.string()), // JSON string
    startDate: v.optional(v.number()), // timestamp
    endDate: v.optional(v.number()), // timestamp
    specificDates: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_active", ["userId", "isActive"]),

  // Appointment Type Availability - Junction table
  appointmentTypeAvailability: defineTable({
    appointmentTypeId: v.id("appointmentTypes"),
    availabilityPatternId: v.id("availabilityPatterns"),
    priority: v.number(),
  })
    .index("by_appointmentTypeId", ["appointmentTypeId"])
    .index("by_availabilityPatternId", ["availabilityPatternId"]),

  // Availability Exceptions - Date-specific overrides
  availabilityExceptions: defineTable({
    userId: v.id("users"),
    appointmentTypeId: v.optional(v.id("appointmentTypes")),
    date: v.number(), // timestamp
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    type: v.string(), // "unavailable", "custom_hours", "special_availability"
    reason: v.optional(v.string()),
    customSchedule: v.optional(v.string()), // JSON string
  })
    .index("by_userId", ["userId"])
    .index("by_date", ["date"])
    .index("by_userId_date", ["userId", "date"]),

  // Blocked Dates table (Legacy) - Simple date range blocking
  blockedDates: defineTable({
    userId: v.id("users"),
    startDate: v.number(), // timestamp
    endDate: v.number(), // timestamp
    reason: v.optional(v.string()),
    isAllDay: v.boolean(),
  }).index("by_userId", ["userId"]),

  // Subscription Plans - Available pricing plans
  subscriptionPlans: defineTable({
    planId: v.string(), // "free", "pro", etc. (used as primary identifier)
    name: v.string(),
    banner: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    description: v.optional(v.string()),
    priceMonthly: v.optional(v.number()),
    priceYearly: v.optional(v.number()),
    stripePriceMonthly: v.optional(v.string()),
    stripePriceYearly: v.optional(v.string()),
    features: v.any(), // JSON object
    isActive: v.boolean(),
    updatedAt: v.number(),
  }).index("by_planId", ["planId"]),

  // User Subscriptions - User's current subscription
  userSubscriptions: defineTable({
    userId: v.id("users"),
    planId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    status: v.string(), // "active", "canceled", "trialing", "inactive"
    renewsAt: v.optional(v.number()),
    cancelAt: v.optional(v.number()),
    isAnnual: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  // Branding - User branding settings
  branding: defineTable({
    userId: v.id("users"),
    primary: v.string(),
    secondary: v.string(),
    accent: v.string(),
    logoUrl: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    displayName: v.optional(v.string()),
    showDisplayName: v.boolean(),
    showProfilePicture: v.boolean(),
    usePlatformBranding: v.boolean(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Feedback - User feedback submissions
  feedback: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    message: v.string(),
    status: v.string(), // "new", "reviewed", "resolved"
  }).index("by_status", ["status"]),

  // Google Calendar Credentials - OAuth tokens
  googleCalendarCredentials: defineTable({
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(), // timestamp
    scope: v.string(),
    isConnected: v.boolean(),
    isSynced: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Notifications - In-app notifications
  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(), // "scheduled", "rescheduled", "cancelled"
    relatedBookingId: v.optional(v.id("bookings")),
    isRead: v.boolean(),
    customerName: v.string(), // Customer who triggered the notification
    serviceName: v.string(), // Appointment type name
    appointmentDate: v.number(), // Timestamp of the appointment
    createdAt: v.number(), // When notification was created (for sorting)
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isRead", ["userId", "isRead"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),
});
