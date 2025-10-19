import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"), // for email/password authentication
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  googleId: text("google_id").unique(), // Google OAuth unique identifier
  name: text("name").notNull(), // Full name from Google profile
  picture: text("picture"), // Google profile picture URL
  businessName: text("business_name"),
  logoUrl: text("logo_url"),
  welcomeMessage: text("welcome_message"),
  slug: text("slug").unique(), // Custom booking URL slug
  primaryColor: text("primary_color").default("#ef4444"),
  secondaryColor: text("secondary_color").default("#f97316"),
  accentColor: text("accent_color").default("#3b82f6"),
  timezone: text("timezone").default("UTC"),
  weeklyHours: jsonb("weekly_hours"),
  bookingWindow: integer("booking_window").default(60), // days ahead clients can book (legacy)
  bookingWindowDate: text("booking_window_date"), // furthest date clients can book (YYYY-MM-DD) (legacy)
  bookingWindowStart: text("booking_window_start"), // start of booking window range (YYYY-MM-DD)
  bookingWindowEnd: text("booking_window_end"), // end of booking window range (YYYY-MM-DD)
  closedMonths: jsonb("closed_months"), // array of month numbers (1-12) that are closed
  country: text("country").default("US"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  appointmentTypeId: varchar("appointment_type_id").references(() => appointmentTypes.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").default(30), // in minutes (can override appointmentType duration)
  status: text("status").default("confirmed"), // confirmed, pending, cancelled
  notes: text("notes"),
  bookingToken: varchar("booking_token").unique().notNull(), // unique shareable link token (generated in app)
  customerReminderSentAt: timestamp("customer_reminder_sent_at"),
  businessReminderSentAt: timestamp("business_reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const availability = pgTable("availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  weekday: text("weekday").notNull(), // monday, tuesday, etc.
  startTime: text("start_time").notNull(), // "09:00"
  endTime: text("end_time").notNull(), // "17:00"
  isAvailable: boolean("is_available").default(true),
});

export const availabilityPatterns = pgTable("availability_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(), // "Default Schedule", "Summer Hours", etc.
  type: text("type").notNull(), // "recurring", "date_range", "specific_dates"
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  
  // For recurring patterns
  weeklySchedule: text("weekly_schedule"), // JSON: {monday: [{start: "09:00", end: "17:00"}], tuesday: [...]}
  
  // For date range patterns
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // For specific date patterns
  specificDates: text("specific_dates").array(), // Array of ISO date strings
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appointmentTypeAvailability = pgTable("appointment_type_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentTypeId: varchar("appointment_type_id").references(() => appointmentTypes.id).notNull(),
  availabilityPatternId: varchar("availability_pattern_id").references(() => availabilityPatterns.id).notNull(),
  priority: integer("priority").default(0), // Higher number = higher priority for conflicts
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate mappings
  uniqueAppointmentTypePattern: sql`UNIQUE (${table.appointmentTypeId}, ${table.availabilityPatternId})`,
}));

export const availabilityExceptions = pgTable("availability_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  appointmentTypeId: varchar("appointment_type_id").references(() => appointmentTypes.id), // nullable - scope to specific appointment type
  date: timestamp("date").notNull(),
  startTime: text("start_time"), // null means all day
  endTime: text("end_time"), // null means all day
  type: text("type").notNull(), // "unavailable", "custom_hours", "special_availability"
  reason: text("reason"), // "Vacation", "Meeting", "Special Event", etc.
  customSchedule: text("custom_schedule"), // JSON for custom hours on this date
  createdAt: timestamp("created_at").defaultNow(),
});

export const blockedDates = pgTable("blocked_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"), // "Vacation", "Holiday", "Personal", etc.
  isAllDay: boolean("is_all_day").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointmentTypes = pgTable("appointment_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(), // "30min Consultation", "60min Deep Dive"
  description: text("description"), // Optional description
  duration: integer("duration").notNull(), // in minutes
  bufferTimeBefore: integer("buffer_time_before").default(0), // Buffer time before appointment in minutes
  bufferTime: integer("buffer_time").default(0), // Buffer time after appointment in minutes (legacy field name)
  price: integer("price").default(0), // Price in cents (e.g., 5000 = $50.00)
  color: text("color").default("#3b82f6"), // Color for calendar display
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0), // For ordering in UI
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id", { length: 191 }).primaryKey(),        // slug like "free" or "pro"
  name: varchar("name", { length: 191 }).notNull(),
  // marketing fields:
  banner: varchar("banner", { length: 191 }),             // e.g., "Best deal" or "70% off"
  originalPrice: integer("original_price"),               // in cents (for strikethrough)
  description: text("description"),
  // pricing (display)
  priceMonthly: integer("price_monthly"),                 // in cents (optional)
  priceYearly: integer("price_yearly"),                   // in cents (optional)
  // Stripe prices to actually charge:
  stripePriceMonthly: varchar("stripe_price_monthly", { length: 191 }),
  stripePriceYearly: varchar("stripe_price_yearly", { length: 191 }),
  // feature map
  features: jsonb("features").notNull().default("{}"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  userId: varchar("user_id", { length: 191 }).primaryKey(),
  planId: varchar("plan_id", { length: 191 }).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 191 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 191 }),
  status: varchar("status", { length: 64 }).notNull().default("inactive"), // active, canceled, trialing
  renewsAt: timestamp("renews_at"),
  cancelAt: timestamp("cancel_at"),
  isAnnual: boolean("is_annual").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const branding = pgTable("branding", {
  userId: varchar("user_id", { length: 191 }).primaryKey(),
  primary: varchar("primary", { length: 7 }).notNull().default("#FF6B4A"),
  secondary: varchar("secondary", { length: 7 }).notNull().default("#0F172A"),
  accent: varchar("accent", { length: 7 }).notNull().default("#F59E0B"),
  logoUrl: text("logo_url"),
  profilePictureUrl: text("profile_picture_url"),
  displayName: text("display_name"),
  showDisplayName: boolean("show_display_name").notNull().default(true),
  showProfilePicture: boolean("show_profile_picture").notNull().default(true),
  usePlatformBranding: boolean("use_platform_branding").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/*
AVAILABILITY PRECEDENCE ORDER (highest to lowest):
1. availability_exceptions - Date-specific exceptions (can be scoped to appointment types)
2. blocked_dates - Legacy blocked dates (kept for backwards compatibility)
3. appointment_type_availability + availability_patterns - Service-specific availability patterns
4. availability - Legacy basic weekday availability (fallback only)

When determining availability for a specific date/time/appointment type:
- Check availability_exceptions first (if scoped to appointment type, only apply to that type)
- Then check blocked_dates for any blocks
- Then use appointment_type_availability to find relevant availability_patterns for the appointment type
- Fall back to basic availability table if no patterns exist
*/

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email address is required"),
  googleId: z.string().optional(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  bookingToken: true, // Generated by backend
  customerReminderSentAt: true, // Auto-managed
  businessReminderSentAt: true, // Auto-managed
  createdAt: true,
}).extend({
  appointmentDate: z.coerce.date(), // Allow string dates to be converted to Date objects
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email address is required"),
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.startDate <= data.endDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const insertAppointmentTypeSchema = createInsertSchema(appointmentTypes).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Appointment type name is required"),
  duration: z.number().min(5).max(480),
  // Make bufferTime optional (we'll remove it from UI too)
  bufferTime: z.number().min(0).max(120).optional().nullable(),
  // Make color optional (we'll remove it from UI too)  
  color: z.string().optional().nullable(),
  // Make price optional
  price: z.number().min(0).optional().nullable(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().min(1, "Plan ID is required"),
  name: z.string().min(1, "Plan name is required"),
  priceMonthly: z.number().min(0, "Monthly price cannot be negative").optional(),
  priceYearly: z.number().min(0, "Yearly price cannot be negative").optional(),
  originalPrice: z.number().min(0, "Original price cannot be negative").optional(),
  features: z.record(z.any()).default({}),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  updatedAt: true,
});

export const insertBrandingSchema = createInsertSchema(branding).omit({
  updatedAt: true,
}).extend({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a valid hex color"),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Secondary color must be a valid hex color"),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Accent color must be a valid hex color"),
});

export const insertAvailabilityPatternSchema = createInsertSchema(availabilityPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Pattern name is required"),
  type: z.enum(["recurring", "date_range", "specific_dates"], {
    errorMap: () => ({ message: "Type must be recurring, date_range, or specific_dates" })
  }),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  weeklySchedule: z.string().optional().refine((val) => {
    if (!val) return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Weekly schedule must be valid JSON" }),
  specificDates: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.type === "date_range") {
    return data.startDate && data.endDate && data.startDate <= data.endDate;
  }
  return true;
}, {
  message: "Date range type requires valid start and end dates",
  path: ["endDate"],
});

export const insertAppointmentTypeAvailabilitySchema = createInsertSchema(appointmentTypeAvailability).omit({
  id: true,
  createdAt: true,
});

export const insertAvailabilityExceptionSchema = createInsertSchema(availabilityExceptions).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.coerce.date(),
  type: z.enum(["unavailable", "custom_hours", "special_availability"], {
    errorMap: () => ({ message: "Type must be unavailable, custom_hours, or special_availability" })
  }),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  appointmentTypeId: z.string().optional(), // Optional FK to scope exception to specific appointment type
  customSchedule: z.string().optional().refine((val) => {
    if (!val) return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Custom schedule must be valid JSON" }),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertAppointmentType = z.infer<typeof insertAppointmentTypeSchema>;
export type AppointmentType = typeof appointmentTypes.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertBranding = z.infer<typeof insertBrandingSchema>;
export type Branding = typeof branding.$inferSelect;
export type InsertAvailabilityPattern = z.infer<typeof insertAvailabilityPatternSchema>;
export type AvailabilityPattern = typeof availabilityPatterns.$inferSelect;
export type InsertAppointmentTypeAvailability = z.infer<typeof insertAppointmentTypeAvailabilitySchema>;
export type AppointmentTypeAvailability = typeof appointmentTypeAvailability.$inferSelect;
export type InsertAvailabilityException = z.infer<typeof insertAvailabilityExceptionSchema>;
export type AvailabilityException = typeof availabilityExceptions.$inferSelect;

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"), // Optional name from feedback form
  email: text("email"), // Optional email from feedback form
  message: text("message").notNull(), // Required feedback message
  status: text("status").default("new"), // "new", "reviewed", "resolved"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  status: true,
  createdAt: true,
});

export const googleCalendarCredentials = pgTable("google_calendar_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiry: timestamp("token_expiry").notNull(),
  scope: text("scope").notNull(),
  isConnected: boolean("is_connected").default(true),
  isSynced: boolean("is_synced").default(false),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGoogleCalendarCredentialsSchema = createInsertSchema(googleCalendarCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Availability settings schema
export const availabilitySettingsSchema = z.object({
  weeklyHours: z.record(z.array(z.object({
    start: z.string(),
    end: z.string()
  }))),
  timezone: z.string(),
  bookingWindow: z.number().int().min(1).max(365).optional(), // days ahead clients can book (legacy)
  bookingWindowDate: z.string().optional(), // furthest date clients can book (YYYY-MM-DD) (legacy)
  bookingWindowStart: z.string().optional(), // start of booking window range (YYYY-MM-DD)
  bookingWindowEnd: z.string().optional(), // end of booking window range (YYYY-MM-DD)
  closedMonths: z.array(z.number().int().min(1).max(12)).optional(), // array of closed month numbers
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertGoogleCalendarCredentials = z.infer<typeof insertGoogleCalendarCredentialsSchema>;
export type GoogleCalendarCredentials = typeof googleCalendarCredentials.$inferSelect;

// Notifications table for in-app notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // "booking_created", "booking_cancelled", "booking_reminder", "system", etc.
  relatedBookingId: varchar("related_booking_id").references(() => bookings.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Authentication request validation schemas
export const loginSchema = z.object({
  email: z.string().email("Valid email address is required").transform(val => val.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  email: z.string().email("Valid email address is required").transform(val => val.toLowerCase().trim()),
  name: z.string().min(1, "Name is required").transform(val => val.trim()),
  password: z.string().min(12, "Password must be at least 12 characters long"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Valid email address is required").transform(val => val.toLowerCase().trim()),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(12, "New password must be at least 12 characters long"),
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email("Valid email address is required").transform(val => val.toLowerCase().trim()),
  password: z.string().optional(), // Required for password accounts, checked in endpoint
});

export const disconnectGoogleSchema = z.object({
  password: z.string().min(1, "Password is required to disconnect Google account"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email address is required").transform(val => val.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(12, "Password must be at least 12 characters long"),
});

// Checkout/Payment request validation schemas
export const checkoutStartSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  interval: z.enum(["month", "year"], { errorMap: () => ({ message: "Interval must be 'month' or 'year'" }) }),
  couponId: z.string().optional(),
  promotionCode: z.string().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
});

// Type exports
export type LoginRequest = z.infer<typeof loginSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type ChangeEmailRequest = z.infer<typeof changeEmailSchema>;
export type DisconnectGoogleRequest = z.infer<typeof disconnectGoogleSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type CheckoutStartRequest = z.infer<typeof checkoutStartSchema>;
export type ValidateCouponRequest = z.infer<typeof validateCouponSchema>;
