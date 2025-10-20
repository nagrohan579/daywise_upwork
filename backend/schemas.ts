// Validation schemas for API routes (replaces @shared/schema)
import { z } from "zod";

// User schemas
export const insertUserSchema = z.object({
  email: z.string().email("Valid email address is required"),
  name: z.string().min(1, "Name is required"),
  password: z.string().optional(),
  googleId: z.string().optional(),
  picture: z.string().optional(),
  emailVerified: z.boolean().optional(),
});

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
  password: z.string().optional(),
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

// Booking schemas
export const insertBookingSchema = z.object({
  userId: z.string(),
  appointmentTypeId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Valid email address is required"),
  appointmentDate: z.coerce.date(),
  duration: z.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  bookingToken: z.string(),
});

// Availability schemas
export const insertAvailabilitySchema = z.object({
  userId: z.string(),
  weekday: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean().optional(),
});

export const availabilitySettingsSchema = z.object({
  weeklyHours: z.record(z.array(z.object({
    start: z.string(),
    end: z.string()
  }))),
  timezone: z.string(),
  bookingWindow: z.number().int().min(1).max(365).optional(),
  bookingWindowDate: z.string().optional(),
  bookingWindowStart: z.string().optional(),
  bookingWindowEnd: z.string().optional(),
  closedMonths: z.array(z.number().int().min(1).max(12)).optional(),
});

// Blocked dates schemas
export const insertBlockedDateSchema = z.object({
  userId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
  isAllDay: z.boolean().optional(),
}).refine((data) => data.startDate <= data.endDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

// Appointment type schemas
export const insertAppointmentTypeSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, "Appointment type name is required"),
  description: z.string().optional(),
  duration: z.number().min(5).max(480),
  bufferTimeBefore: z.number().min(0).max(120).optional(),
  bufferTime: z.number().min(0).max(120).optional(),
  price: z.number().min(0).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

// Availability pattern schemas
export const insertAvailabilityPatternSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, "Pattern name is required"),
  type: z.enum(["recurring", "date_range", "specific_dates"]),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  weeklySchedule: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  specificDates: z.array(z.string()).optional(),
});

export const insertAppointmentTypeAvailabilitySchema = z.object({
  appointmentTypeId: z.string(),
  availabilityPatternId: z.string(),
  priority: z.number().optional(),
});

export const insertAvailabilityExceptionSchema = z.object({
  userId: z.string(),
  appointmentTypeId: z.string().optional(),
  date: z.coerce.date(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  type: z.enum(["unavailable", "custom_hours", "special_availability"]),
  reason: z.string().optional(),
  customSchedule: z.string().optional(),
});

// Subscription schemas
export const insertSubscriptionPlanSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  name: z.string().min(1, "Plan name is required"),
  banner: z.string().optional(),
  originalPrice: z.number().min(0).optional(),
  description: z.string().optional(),
  priceMonthly: z.number().min(0).optional(),
  priceYearly: z.number().min(0).optional(),
  stripePriceMonthly: z.string().optional(),
  stripePriceYearly: z.string().optional(),
  features: z.record(z.any()).default({}),
  isActive: z.boolean().optional(),
});

export const insertUserSubscriptionSchema = z.object({
  userId: z.string(),
  planId: z.string(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  status: z.string(),
  renewsAt: z.coerce.date().optional(),
  cancelAt: z.coerce.date().optional(),
  isAnnual: z.boolean().optional(),
});

// Branding schemas
export const insertBrandingSchema = z.object({
  userId: z.string(),
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a valid hex color"),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Secondary color must be a valid hex color"),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Accent color must be a valid hex color"),
  logoUrl: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  displayName: z.string().optional(),
  showDisplayName: z.boolean().optional(),
  showProfilePicture: z.boolean().optional(),
  usePlatformBranding: z.boolean().optional(),
});

// Feedback schemas
export const insertFeedbackSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

// Stripe/Payment schemas
export const checkoutStartSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  interval: z.enum(["month", "year"]),
  couponId: z.string().optional(),
  promotionCode: z.string().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
});
