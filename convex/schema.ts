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
    industry: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
    isAdmin: v.boolean(),
    accountStatus: v.optional(v.string()), // "active" or "inactive", defaults to "active"
    // Stripe Connect fields
    stripeAccountId: v.optional(v.string()),
    stripeAccessToken: v.optional(v.string()),
    stripeRefreshToken: v.optional(v.string()),
    stripeScope: v.optional(v.string()),
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
    formSessionId: v.optional(v.string()), // Session ID linking to intake form submission
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
    intakeFormId: v.optional(v.id("intakeForms")),
    requirePayment: v.optional(v.boolean()),
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
    startDate: v.optional(v.number()), // Subscription start date (timestamp)
    lifetimeSpend: v.optional(v.number()), // Total amount spent (in cents)
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
    accent: v.string(), // Text color maps to accent
    logoUrl: v.optional(v.string()), // Original logo URL (cropped on display using logoCropData)
    profilePictureUrl: v.optional(v.string()), // Original profile picture URL (cropped on display using profileCropData)
    displayName: v.optional(v.string()),
    showDisplayName: v.boolean(),
    showProfilePicture: v.boolean(),
    usePlatformBranding: v.boolean(),
    // Crop data for logo
    logoCropData: v.optional(v.any()), // { x, y, width, height, zoom, rotation, croppedAreaPixels }
    // Crop data for profile picture
    profileCropData: v.optional(v.any()), // { x, y, width, height, zoom, rotation, croppedAreaPixels }
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

  // Intake Forms - Custom forms for booking process
  intakeForms: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    fields: v.any(), // JSON array of field configurations
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_active", ["userId", "isActive"]),

  // Form Submissions - Permanent customer form submissions linked to bookings
  formSubmissions: defineTable({
    bookingId: v.id("bookings"),
    intakeFormId: v.id("intakeForms"),
    responses: v.any(), // Array of field responses with answers/fileUrls
    submittedAt: v.number(),
  })
    .index("by_bookingId", ["bookingId"])
    .index("by_intakeFormId", ["intakeFormId"]),

  // Temporary Form Submissions - Temporary data during booking process
  tempFormSubmissions: defineTable({
    sessionId: v.string(),
    intakeFormId: v.id("intakeForms"),
    appointmentTypeId: v.id("appointmentTypes"),
    responses: v.any(), // Array of field responses with answers/fileUrls
    fileUrls: v.array(v.string()), // Track all uploaded file URLs
    createdAt: v.number(),
    expiresAt: v.number(), // createdAt + 1 hour
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_expiresAt", ["expiresAt"]),
});
