# DayWise Database Architecture

## Overview
The DayWise application uses a PostgreSQL database with 14 tables managing users, appointments, availability, subscriptions, and notifications.

---

## Database Tables

### 1. **users** - User Accounts & Profiles
Main user table storing authentication and business profile information.

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `email` (TEXT, UNIQUE, REQUIRED) - User email
- `password` (TEXT, OPTIONAL) - Hashed password (null for Google OAuth only users)
- `emailVerified` (BOOLEAN, DEFAULT: false)
- `emailVerificationToken` (TEXT, OPTIONAL)
- `emailVerificationExpires` (TIMESTAMP, OPTIONAL)
- `passwordResetToken` (TEXT, OPTIONAL)
- `passwordResetExpires` (TIMESTAMP, OPTIONAL)
- `googleId` (TEXT, UNIQUE, OPTIONAL) - Google OAuth ID
- `name` (TEXT, REQUIRED) - Full name
- `picture` (TEXT, OPTIONAL) - Profile picture URL
- `businessName` (TEXT, OPTIONAL)
- `logoUrl` (TEXT, OPTIONAL)
- `welcomeMessage` (TEXT, OPTIONAL)
- `slug` (TEXT, UNIQUE, OPTIONAL) - Custom booking URL slug (e.g., "john-doe")
- `primaryColor` (TEXT, DEFAULT: "#ef4444")
- `secondaryColor` (TEXT, DEFAULT: "#f97316")
- `accentColor` (TEXT, DEFAULT: "#3b82f6")
- `timezone` (TEXT, DEFAULT: "UTC")
- `weeklyHours` (JSONB, OPTIONAL) - Weekly availability hours
- `bookingWindow` (INTEGER, DEFAULT: 60) - Days ahead clients can book (legacy)
- `bookingWindowDate` (TEXT, OPTIONAL) - Furthest date clients can book (YYYY-MM-DD)
- `bookingWindowStart` (TEXT, OPTIONAL) - Start of booking window (YYYY-MM-DD)
- `bookingWindowEnd` (TEXT, OPTIONAL) - End of booking window (YYYY-MM-DD)
- `closedMonths` (JSONB, OPTIONAL) - Array of month numbers (1-12) that are closed
- `country` (TEXT, DEFAULT: "US")
- `isAdmin` (BOOLEAN, DEFAULT: false)
- `createdAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- One-to-Many with: bookings, availability, appointmentTypes, blockedDates, etc.

---

### 2. **bookings** - Appointment Bookings
Stores customer appointment bookings.

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `userId` (VARCHAR, FK → users.id) - Business owner
- `appointmentTypeId` (VARCHAR, FK → appointmentTypes.id)
- `customerName` (TEXT, REQUIRED)
- `customerEmail` (TEXT, REQUIRED)
- `appointmentDate` (TIMESTAMP, REQUIRED)
- `duration` (INTEGER, DEFAULT: 30) - Duration in minutes
- `status` (TEXT, DEFAULT: "confirmed") - Options: "confirmed", "pending", "cancelled"
- `notes` (TEXT, OPTIONAL) - Customer notes
- `bookingToken` (VARCHAR, UNIQUE, REQUIRED) - Shareable link token
- `customerReminderSentAt` (TIMESTAMP, OPTIONAL)
- `businessReminderSentAt` (TIMESTAMP, OPTIONAL)
- `createdAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Belongs to: users (via userId)
- Belongs to: appointmentTypes (via appointmentTypeId)
- Has many: notifications

---

### 3. **appointmentTypes** - Service Types
Different types of appointments/services offered.

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `userId` (VARCHAR, FK → users.id)
- `name` (TEXT, REQUIRED) - e.g., "30min Consultation"
- `description` (TEXT, OPTIONAL)
- `duration` (INTEGER, REQUIRED) - Duration in minutes
- `bufferTimeBefore` (INTEGER, DEFAULT: 0) - Buffer before appointment
- `bufferTime` (INTEGER, DEFAULT: 0) - Buffer after appointment (legacy)
- `price` (INTEGER, DEFAULT: 0) - Price in cents (e.g., 5000 = $50.00)
- `color` (TEXT, DEFAULT: "#3b82f6") - Calendar display color
- `isActive` (BOOLEAN, DEFAULT: true)
- `sortOrder` (INTEGER, DEFAULT: 0) - UI ordering
- `createdAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Belongs to: users (via userId)
- Has many: bookings
- Has many: appointmentTypeAvailability (for custom availability patterns)

---

### 4. **availability** (Legacy)
Basic weekly availability schedule.

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `userId` (VARCHAR, FK → users.id)
- `weekday` (TEXT, REQUIRED) - "monday", "tuesday", etc.
- `startTime` (TEXT, REQUIRED) - "09:00"
- `endTime` (TEXT, REQUIRED) - "17:00"
- `isAvailable` (BOOLEAN, DEFAULT: true)

**Note:** This is a legacy table. New availability system uses `availabilityPatterns`.

---

### 5. **availabilityPatterns** - Advanced Availability Schedules
Flexible availability patterns (recurring, date ranges, specific dates).

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `userId` (VARCHAR, FK → users.id, REQUIRED)
- `name` (TEXT, REQUIRED) - e.g., "Default Schedule", "Summer Hours"
- `type` (TEXT, REQUIRED) - Options: "recurring", "date_range", "specific_dates"
- `isDefault` (BOOLEAN, DEFAULT: false)
- `isActive` (BOOLEAN, DEFAULT: true)
- `weeklySchedule` (TEXT, OPTIONAL) - JSON: `{monday: [{start: "09:00", end: "17:00"}], ...}`
- `startDate` (TIMESTAMP, OPTIONAL) - For date_range type
- `endDate` (TIMESTAMP, OPTIONAL) - For date_range type
- `specificDates` (TEXT[], OPTIONAL) - Array of ISO date strings
- `createdAt` (TIMESTAMP, DEFAULT: NOW)
- `updatedAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Belongs to: users (via userId)
- Has many: appointmentTypeAvailability (links to appointment types)

---

### 6. **appointmentTypeAvailability** - Link Appointment Types to Patterns
Junction table linking appointment types to availability patterns.

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `appointmentTypeId` (VARCHAR, FK → appointmentTypes.id, REQUIRED)
- `availabilityPatternId` (VARCHAR, FK → availabilityPatterns.id, REQUIRED)
- `priority` (INTEGER, DEFAULT: 0) - Higher = higher priority in conflicts
- `createdAt` (TIMESTAMP, DEFAULT: NOW)

**Constraints:**
- UNIQUE (appointmentTypeId, availabilityPatternId) - Prevents duplicate mappings

---

### 7. **availabilityExceptions** - Date-Specific Availability Overrides
Override availability for specific dates (vacations, special hours, etc.).

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `userId` (VARCHAR, FK → users.id, REQUIRED)
- `appointmentTypeId` (VARCHAR, FK → appointmentTypes.id, OPTIONAL) - Scope to specific appointment type
- `date` (TIMESTAMP, REQUIRED)
- `startTime` (TEXT, OPTIONAL) - null = all day
- `endTime` (TEXT, OPTIONAL) - null = all day
- `type` (TEXT, REQUIRED) - Options: "unavailable", "custom_hours", "special_availability"
- `reason` (TEXT, OPTIONAL) - "Vacation", "Meeting", etc.
- `customSchedule` (TEXT, OPTIONAL) - JSON for custom hours
- `createdAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Belongs to: users (via userId)
- Belongs to: appointmentTypes (via appointmentTypeId, optional)

---

### 8. **blockedDates** (Legacy)
Simple date range blocking (legacy feature).

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `userId` (VARCHAR, FK → users.id)
- `startDate` (TIMESTAMP, REQUIRED)
- `endDate` (TIMESTAMP, REQUIRED)
- `reason` (TEXT, OPTIONAL) - "Vacation", "Holiday", etc.
- `isAllDay` (BOOLEAN, DEFAULT: true)
- `createdAt` (TIMESTAMP, DEFAULT: NOW)

**Note:** Kept for backwards compatibility. New system uses `availabilityExceptions`.

---

### 9. **subscriptionPlans** - Pricing Plans
Available subscription plans (Free, Pro, etc.).

**Fields:**
- `id` (VARCHAR(191), PK) - Plan slug like "free" or "pro"
- `name` (VARCHAR(191), REQUIRED)
- `banner` (VARCHAR(191), OPTIONAL) - "Best deal", "70% off"
- `originalPrice` (INTEGER, OPTIONAL) - In cents (for strikethrough)
- `description` (TEXT, OPTIONAL)
- `priceMonthly` (INTEGER, OPTIONAL) - In cents
- `priceYearly` (INTEGER, OPTIONAL) - In cents
- `stripePriceMonthly` (VARCHAR(191), OPTIONAL) - Stripe price ID
- `stripePriceYearly` (VARCHAR(191), OPTIONAL) - Stripe price ID
- `features` (JSONB, REQUIRED, DEFAULT: {}) - Feature flags/limits
- `isActive` (BOOLEAN, DEFAULT: true)
- `createdAt` (TIMESTAMP, DEFAULT: NOW)
- `updatedAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Has many: userSubscriptions

---

### 10. **userSubscriptions** - User Subscription Status
Tracks which plan each user is subscribed to.

**Fields:**
- `userId` (VARCHAR(191), PK, FK → users.id)
- `planId` (VARCHAR(191), REQUIRED)
- `stripeCustomerId` (VARCHAR(191), OPTIONAL)
- `stripeSubscriptionId` (VARCHAR(191), OPTIONAL)
- `status` (VARCHAR(64), DEFAULT: "inactive") - Options: "active", "canceled", "trialing"
- `renewsAt` (TIMESTAMP, OPTIONAL)
- `cancelAt` (TIMESTAMP, OPTIONAL)
- `isAnnual` (BOOLEAN, DEFAULT: false)
- `updatedAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Belongs to: users (via userId)
- References: subscriptionPlans (via planId)

---

### 11. **branding** - User Branding Settings
Custom branding colors and display settings.

**Fields:**
- `userId` (VARCHAR(191), PK, FK → users.id)
- `primary` (VARCHAR(7), DEFAULT: "#FF6B4A") - Hex color
- `secondary` (VARCHAR(7), DEFAULT: "#0F172A") - Hex color
- `accent` (VARCHAR(7), DEFAULT: "#F59E0B") - Hex color
- `logoUrl` (TEXT, OPTIONAL)
- `profilePictureUrl` (TEXT, OPTIONAL)
- `displayName` (TEXT, OPTIONAL)
- `showDisplayName` (BOOLEAN, DEFAULT: true)
- `showProfilePicture` (BOOLEAN, DEFAULT: true)
- `usePlatformBranding` (BOOLEAN, DEFAULT: true)
- `updatedAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Belongs to: users (via userId) - One-to-One

---

### 12. **feedback** - User Feedback
Customer feedback submissions.

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `name` (TEXT, OPTIONAL)
- `email` (TEXT, OPTIONAL)
- `message` (TEXT, REQUIRED)
- `status` (TEXT, DEFAULT: "new") - Options: "new", "reviewed", "resolved"
- `createdAt` (TIMESTAMP, DEFAULT: NOW)

---

### 13. **googleCalendarCredentials** - Google Calendar Integration
OAuth tokens for Google Calendar sync.

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `userId` (VARCHAR, FK → users.id, UNIQUE, REQUIRED)
- `accessToken` (TEXT, REQUIRED)
- `refreshToken` (TEXT, REQUIRED)
- `tokenExpiry` (TIMESTAMP, REQUIRED)
- `scope` (TEXT, REQUIRED)
- `isConnected` (BOOLEAN, DEFAULT: true)
- `isSynced` (BOOLEAN, DEFAULT: false)
- `lastSyncAt` (TIMESTAMP, OPTIONAL)
- `createdAt` (TIMESTAMP, DEFAULT: NOW)
- `updatedAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Belongs to: users (via userId) - One-to-One

---

### 14. **notifications** - In-App Notifications
System notifications for users.

**Fields:**
- `id` (VARCHAR, PK) - Auto-generated UUID
- `userId` (VARCHAR, FK → users.id, REQUIRED)
- `title` (TEXT, REQUIRED)
- `message` (TEXT, REQUIRED)
- `type` (TEXT, REQUIRED) - "booking_created", "booking_cancelled", "booking_reminder", "system"
- `relatedBookingId` (VARCHAR, FK → bookings.id, OPTIONAL)
- `isRead` (BOOLEAN, DEFAULT: false)
- `createdAt` (TIMESTAMP, DEFAULT: NOW)

**Relationships:**
- Belongs to: users (via userId)
- Belongs to: bookings (via relatedBookingId, optional)

---

## Availability System Logic

The app uses a **priority-based availability system** with 4 levels:

### Precedence Order (Highest to Lowest):
1. **availabilityExceptions** - Date-specific exceptions (can be scoped to appointment types)
2. **blockedDates** - Legacy blocked dates (backwards compatibility)
3. **appointmentTypeAvailability + availabilityPatterns** - Service-specific availability patterns
4. **availability** - Legacy basic weekday availability (fallback only)

### How It Works:
When determining availability for a specific date/time/appointment type:
1. Check `availabilityExceptions` first (if scoped to appointment type, only apply to that type)
2. Then check `blockedDates` for any blocks
3. Then use `appointmentTypeAvailability` to find relevant `availabilityPatterns` for the appointment type
4. Fall back to basic `availability` table if no patterns exist

---

## Key Relationships Diagram

```
users
  ├─→ bookings (one-to-many)
  ├─→ appointmentTypes (one-to-many)
  │     └─→ bookings (one-to-many)
  │     └─→ appointmentTypeAvailability (one-to-many)
  ├─→ availability (one-to-many) [LEGACY]
  ├─→ availabilityPatterns (one-to-many)
  │     └─→ appointmentTypeAvailability (one-to-many)
  ├─→ availabilityExceptions (one-to-many)
  ├─→ blockedDates (one-to-many) [LEGACY]
  ├─→ notifications (one-to-many)
  ├─→ userSubscriptions (one-to-one)
  ├─→ branding (one-to-one)
  └─→ googleCalendarCredentials (one-to-one)

subscriptionPlans
  └─→ userSubscriptions (one-to-many)

bookings
  └─→ notifications (one-to-many)
```

---

## Data Storage Notes

### Authentication
- Supports both email/password and Google OAuth
- Passwords are hashed using bcrypt
- Email verification required for email/password signup
- Password reset via email tokens

### Booking System
- Each booking has a unique shareable token
- Tracks reminder emails (customer + business)
- Status tracking: confirmed, pending, cancelled

### Availability
- Complex system with patterns, exceptions, and legacy support
- Supports recurring schedules, date ranges, and specific dates
- Can scope availability to specific appointment types
- Priority system for handling conflicts

### Subscriptions
- Stripe integration for payments
- Plans stored in database for flexibility
- Features stored as JSON for customization
- Tracks both monthly and yearly pricing

### Branding
- Per-user color customization (3 colors)
- Logo and profile picture support
- Display toggles for name/picture
- Platform branding option

---

## Migration to Convex Considerations

When converting to Convex:
1. **IDs**: Convex auto-generates IDs, no need for UUID generation
2. **Timestamps**: Convex auto-manages `_creationTime`
3. **Relationships**: Use Convex's document references or implement as queries
4. **JSONB**: Convex natively supports objects/arrays
5. **Unique constraints**: Implement via indexes in Convex schema
6. **Foreign keys**: Handle via queries and validation in mutations
7. **Transactions**: Use Convex transactions for atomic operations
