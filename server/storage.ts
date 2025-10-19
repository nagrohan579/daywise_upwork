import { type User, type InsertUser, type Booking, type InsertBooking, type Availability, type InsertAvailability, type BlockedDate, type InsertBlockedDate, type AppointmentType, type InsertAppointmentType, type AvailabilityPattern, type InsertAvailabilityPattern, type AppointmentTypeAvailability, type InsertAppointmentTypeAvailability, type AvailabilityException, type InsertAvailabilityException, type SubscriptionPlan, type InsertSubscriptionPlan, type UserSubscription, type InsertUserSubscription, type Branding, type InsertBranding, type Feedback, type InsertFeedback, type Notification, type InsertNotification } from "@shared/schema";
import { users, bookings, availability, blockedDates, appointmentTypes, availabilityPatterns, appointmentTypeAvailability, availabilityExceptions, subscriptionPlans, userSubscriptions, branding, feedback, notifications } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, gte, lte, isNull, or } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserBySlug(slug: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserVerificationToken(id: string, token: string, expires: Date): Promise<void>;
  verifyUserEmail(id: string): Promise<void>;
  updatePasswordResetToken(id: string, token: string, expires: Date): Promise<void>;
  resetPassword(id: string, newPassword: string): Promise<void>;
  
  // Booking operations
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingByToken(token: string): Promise<Booking | undefined>;
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  
  // Availability operations
  getAvailabilityByUser(userId: string): Promise<Availability[]>;
  createAvailability(availability: InsertAvailability): Promise<Availability>;
  updateAvailability(id: string, updates: Partial<Availability>): Promise<Availability | undefined>;
  deleteAvailability(id: string): Promise<boolean>;
  updateWeeklyAvailability(userId: string, weeklySchedule: any): Promise<Availability[]>;
  
  // Blocked dates operations
  getBlockedDatesByUser(userId: string): Promise<BlockedDate[]>;
  createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate>;
  updateBlockedDate(id: string, updates: Partial<BlockedDate>): Promise<BlockedDate | undefined>;
  deleteBlockedDate(id: string): Promise<boolean>;
  
  // Appointment types operations
  getAppointmentTypesByUser(userId: string): Promise<AppointmentType[]>;
  getAppointmentType(id: string): Promise<AppointmentType | undefined>;
  createAppointmentType(appointmentType: InsertAppointmentType): Promise<AppointmentType>;
  updateAppointmentType(id: string, updates: Partial<AppointmentType>): Promise<AppointmentType | undefined>;
  deleteAppointmentType(id: string): Promise<boolean>;

  // Availability patterns operations
  getAvailabilityPatternsByUser(userId: string): Promise<AvailabilityPattern[]>;
  getAvailabilityPattern(id: string): Promise<AvailabilityPattern | undefined>;
  createAvailabilityPattern(pattern: InsertAvailabilityPattern): Promise<AvailabilityPattern>;
  updateAvailabilityPattern(id: string, updates: Partial<AvailabilityPattern>): Promise<AvailabilityPattern | undefined>;
  deleteAvailabilityPattern(id: string): Promise<boolean>;

  // Appointment type availability operations
  getAppointmentTypeAvailabilities(appointmentTypeId: string): Promise<AppointmentTypeAvailability[]>;
  createAppointmentTypeAvailability(mapping: InsertAppointmentTypeAvailability): Promise<AppointmentTypeAvailability>;
  updateAppointmentTypeAvailability(appointmentTypeId: string, availabilityPatternId: string, updates: Partial<AppointmentTypeAvailability>): Promise<AppointmentTypeAvailability | undefined>;
  deleteAppointmentTypeAvailability(appointmentTypeId: string, availabilityPatternId: string): Promise<boolean>;

  // Availability exceptions operations
  getAvailabilityExceptionsByUser(userId: string): Promise<AvailabilityException[]>;
  getAvailabilityExceptionsByDate(userId: string, date: Date): Promise<AvailabilityException[]>;
  createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException>;
  updateAvailabilityException(id: string, updates: Partial<AvailabilityException>): Promise<AvailabilityException | undefined>;
  deleteAvailabilityException(id: string): Promise<boolean>;

  // Subscription plans operations
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<boolean>;

  // User subscriptions operations
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  getAllUserSubscriptions(): Promise<UserSubscription[]>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  deleteUserSubscription(id: string): Promise<boolean>;

  // Branding operations
  getBranding(userId: string): Promise<Branding | undefined>;
  createBranding(branding: InsertBranding): Promise<Branding>;
  updateBranding(userId: string, updates: Partial<Branding>): Promise<Branding | undefined>;

  // Feedback operations
  getAllFeedback(): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  updateFeedbackStatus(id: string, status: string): Promise<Feedback | undefined>;

  // Reminder operations
  getBookingsDueForReminders(windowMinutes: number): Promise<any[]>;
  markBookingRemindersSent(id: string, which: "customer"|"business"|"both"): Promise<void>;

  // Notification operations
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async getUserBySlug(slug: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.slug, slug));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({
      id: randomUUID(),
      ...user
    }).returning();
    return created;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async updateUserVerificationToken(id: string, token: string, expires: Date): Promise<void> {
    await db.update(users).set({
      emailVerificationToken: token,
      emailVerificationExpires: expires
    }).where(eq(users.id, id));
  }

  async verifyUserEmail(id: string): Promise<void> {
    await db.update(users).set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    }).where(eq(users.id, id));
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async updatePasswordResetToken(id: string, token: string, expires: Date): Promise<void> {
    await db.update(users).set({
      passwordResetToken: token,
      passwordResetExpires: expires
    }).where(eq(users.id, id));
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await db.update(users).set({
      password: newPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    }).where(eq(users.id, id));
  }

  // Booking operations
  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingByToken(token: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingToken, token));
    return booking || undefined;
  }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.userId, userId));
  }

  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values({
      id: randomUUID(),
      bookingToken: randomUUID(), // Generate booking token explicitly
      ...booking
    }).returning();
    return created;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const [updated] = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    return updated || undefined;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await db.delete(bookings).where(eq(bookings.id, id));
    return result.rowCount > 0;
  }

  // Availability operations
  async getAvailabilityByUser(userId: string): Promise<Availability[]> {
    return await db.select().from(availability).where(eq(availability.userId, userId));
  }

  async createAvailability(availabilityData: InsertAvailability): Promise<Availability> {
    const [created] = await db.insert(availability).values({
      id: randomUUID(),
      ...availabilityData
    }).returning();
    return created;
  }

  async updateAvailability(id: string, updates: Partial<Availability>): Promise<Availability | undefined> {
    const [updated] = await db.update(availability).set(updates).where(eq(availability.id, id)).returning();
    return updated || undefined;
  }

  async deleteAvailability(id: string): Promise<boolean> {
    const result = await db.delete(availability).where(eq(availability.id, id));
    return result.rowCount > 0;
  }

  async updateWeeklyAvailability(userId: string, weeklySchedule: any): Promise<Availability[]> {
    // Delete existing availability for user
    await db.delete(availability).where(eq(availability.userId, userId));
    
    // Insert new availability
    const availabilityRecords: InsertAvailability[] = [];
    for (const [weekday, times] of Object.entries(weeklySchedule) as [string, any][]) {
      if (times && times.length > 0) {
        for (const timeSlot of times) {
          availabilityRecords.push({
            id: randomUUID(),
            userId,
            weekday,
            startTime: timeSlot.start,
            endTime: timeSlot.end,
            isAvailable: true
          });
        }
      }
    }

    if (availabilityRecords.length > 0) {
      return await db.insert(availability).values(availabilityRecords).returning();
    }
    return [];
  }

  // Blocked dates operations
  async getBlockedDatesByUser(userId: string): Promise<BlockedDate[]> {
    return await db.select().from(blockedDates).where(eq(blockedDates.userId, userId));
  }

  async createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate> {
    const [created] = await db.insert(blockedDates).values({
      id: randomUUID(),
      ...blockedDate
    }).returning();
    return created;
  }

  async updateBlockedDate(id: string, updates: Partial<BlockedDate>): Promise<BlockedDate | undefined> {
    const [updated] = await db.update(blockedDates).set(updates).where(eq(blockedDates.id, id)).returning();
    return updated || undefined;
  }

  async deleteBlockedDate(id: string): Promise<boolean> {
    const result = await db.delete(blockedDates).where(eq(blockedDates.id, id));
    return result.rowCount > 0;
  }

  // Appointment types operations
  async getAppointmentTypesByUser(userId: string): Promise<AppointmentType[]> {
    return await db.select().from(appointmentTypes).where(eq(appointmentTypes.userId, userId));
  }

  async getAppointmentType(id: string): Promise<AppointmentType | undefined> {
    const [appointmentType] = await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, id));
    return appointmentType || undefined;
  }

  async createAppointmentType(appointmentType: InsertAppointmentType): Promise<AppointmentType> {
    const [created] = await db.insert(appointmentTypes).values({
      id: randomUUID(),
      ...appointmentType
    }).returning();
    return created;
  }

  async updateAppointmentType(id: string, updates: Partial<AppointmentType>): Promise<AppointmentType | undefined> {
    const [updated] = await db.update(appointmentTypes).set(updates).where(eq(appointmentTypes.id, id)).returning();
    return updated || undefined;
  }

  async deleteAppointmentType(id: string): Promise<boolean> {
    const result = await db.delete(appointmentTypes).where(eq(appointmentTypes.id, id));
    return result.rowCount > 0;
  }

  // Availability patterns operations
  async getAvailabilityPatternsByUser(userId: string): Promise<AvailabilityPattern[]> {
    return await db.select().from(availabilityPatterns).where(eq(availabilityPatterns.userId, userId));
  }

  async getAvailabilityPattern(id: string): Promise<AvailabilityPattern | undefined> {
    const [pattern] = await db.select().from(availabilityPatterns).where(eq(availabilityPatterns.id, id));
    return pattern || undefined;
  }

  async createAvailabilityPattern(pattern: InsertAvailabilityPattern): Promise<AvailabilityPattern> {
    const [created] = await db.insert(availabilityPatterns).values({
      id: randomUUID(),
      ...pattern
    }).returning();
    return created;
  }

  async updateAvailabilityPattern(id: string, updates: Partial<AvailabilityPattern>): Promise<AvailabilityPattern | undefined> {
    const [updated] = await db.update(availabilityPatterns).set(updates).where(eq(availabilityPatterns.id, id)).returning();
    return updated || undefined;
  }

  async deleteAvailabilityPattern(id: string): Promise<boolean> {
    const result = await db.delete(availabilityPatterns).where(eq(availabilityPatterns.id, id));
    return result.rowCount > 0;
  }

  // Appointment type availability operations
  async getAppointmentTypeAvailabilities(appointmentTypeId: string): Promise<AppointmentTypeAvailability[]> {
    return await db.select().from(appointmentTypeAvailability).where(eq(appointmentTypeAvailability.appointmentTypeId, appointmentTypeId));
  }

  async createAppointmentTypeAvailability(mapping: InsertAppointmentTypeAvailability): Promise<AppointmentTypeAvailability> {
    const [created] = await db.insert(appointmentTypeAvailability).values({
      id: randomUUID(),
      ...mapping
    }).returning();
    return created;
  }

  async updateAppointmentTypeAvailability(appointmentTypeId: string, availabilityPatternId: string, updates: Partial<AppointmentTypeAvailability>): Promise<AppointmentTypeAvailability | undefined> {
    const [updated] = await db.update(appointmentTypeAvailability).set(updates).where(
      and(
        eq(appointmentTypeAvailability.appointmentTypeId, appointmentTypeId),
        eq(appointmentTypeAvailability.availabilityPatternId, availabilityPatternId)
      )
    ).returning();
    return updated || undefined;
  }

  async deleteAppointmentTypeAvailability(appointmentTypeId: string, availabilityPatternId: string): Promise<boolean> {
    const result = await db.delete(appointmentTypeAvailability).where(
      and(
        eq(appointmentTypeAvailability.appointmentTypeId, appointmentTypeId),
        eq(appointmentTypeAvailability.availabilityPatternId, availabilityPatternId)
      )
    );
    return result.rowCount > 0;
  }

  // Availability exceptions operations
  async getAvailabilityExceptionsByUser(userId: string): Promise<AvailabilityException[]> {
    return await db.select().from(availabilityExceptions).where(eq(availabilityExceptions.userId, userId));
  }

  async getAvailabilityExceptionsByDate(userId: string, date: Date): Promise<AvailabilityException[]> {
    return await db.select().from(availabilityExceptions).where(
      and(
        eq(availabilityExceptions.userId, userId),
        eq(availabilityExceptions.date, date)
      )
    );
  }

  async createAvailabilityException(exception: InsertAvailabilityException): Promise<AvailabilityException> {
    const [created] = await db.insert(availabilityExceptions).values({
      id: randomUUID(),
      ...exception
    }).returning();
    return created;
  }

  async updateAvailabilityException(id: string, updates: Partial<AvailabilityException>): Promise<AvailabilityException | undefined> {
    const [updated] = await db.update(availabilityExceptions).set(updates).where(eq(availabilityExceptions.id, id)).returning();
    return updated || undefined;
  }

  async deleteAvailabilityException(id: string): Promise<boolean> {
    const result = await db.delete(availabilityExceptions).where(eq(availabilityExceptions.id, id));
    return result.rowCount > 0;
  }

  // Subscription plans operations
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan || undefined;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db.insert(subscriptionPlans).values(plan).returning();
    return created;
  }

  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updated] = await db.update(subscriptionPlans).set(updates).where(eq(subscriptionPlans.id, id)).returning();
    return updated || undefined;
  }

  async deleteSubscriptionPlan(id: string): Promise<boolean> {
    const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return result.rowCount > 0;
  }

  // User subscriptions operations
  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return subscription || undefined;
  }

  async getUserSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<UserSubscription | undefined> {
    const [subscription] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.stripeCustomerId, stripeCustomerId));
    return subscription || undefined;
  }

  async getAllUserSubscriptions(): Promise<UserSubscription[]> {
    return await db.select().from(userSubscriptions);
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [created] = await db.insert(userSubscriptions).values({
      id: randomUUID(),
      ...subscription
    }).returning();
    return created;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const [updated] = await db.update(userSubscriptions).set(updates).where(eq(userSubscriptions.id, id)).returning();
    return updated || undefined;
  }

  async deleteUserSubscription(id: string): Promise<boolean> {
    const result = await db.delete(userSubscriptions).where(eq(userSubscriptions.id, id));
    return result.rowCount > 0;
  }

  // Branding operations
  async getBranding(userId: string): Promise<Branding | undefined> {
    const [brandingData] = await db.select().from(branding).where(eq(branding.userId, userId));
    return brandingData || undefined;
  }

  async createBranding(brandingData: InsertBranding): Promise<Branding> {
    const [created] = await db.insert(branding).values({
      id: randomUUID(),
      ...brandingData
    }).returning();
    return created;
  }

  async updateBranding(userId: string, updates: Partial<Branding>): Promise<Branding | undefined> {
    const [updated] = await db.update(branding).set(updates).where(eq(branding.userId, userId)).returning();
    return updated || undefined;
  }

  // Feedback operations
  async getAllFeedback(): Promise<Feedback[]> {
    return await db.select().from(feedback);
  }

  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [created] = await db.insert(feedback).values({
      id: randomUUID(),
      ...feedbackData
    }).returning();
    return created;
  }

  async updateFeedbackStatus(id: string, status: string): Promise<Feedback | undefined> {
    const [updated] = await db.update(feedback).set({ status }).where(eq(feedback.id, id)).returning();
    return updated || undefined;
  }

  // Reminder operations
  async getBookingsDueForReminders(windowMinutes = 10): Promise<any[]> {
    const now = new Date();
    const targetFrom = new Date(now.getTime() + 24*60*60*1000 - windowMinutes*60*1000);
    const targetTo   = new Date(now.getTime() + 24*60*60*1000 + windowMinutes*60*1000);

    // Join bookings with users, userSubscriptions and subscriptionPlans
    const rows = await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(users.id, bookings.userId))
      .leftJoin(userSubscriptions, eq(userSubscriptions.userId, bookings.userId))
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, userSubscriptions.planId))
      .where(
        and(
          gte(bookings.appointmentDate, targetFrom),
          lte(bookings.appointmentDate, targetTo),
          // Only confirmed bookings
          eq(bookings.status, "confirmed"),
          // Only Pro users with active/trialing sub
          or(eq(userSubscriptions.status, "active"), eq(userSubscriptions.status, "trialing")),
          eq(subscriptionPlans.id, "pro"),
          // At least one reminder not yet sent
          or(isNull(bookings.customerReminderSentAt), isNull(bookings.businessReminderSentAt))
        )
      );

    return rows;
  }

  async markBookingRemindersSent(id: string, which: "customer"|"business"|"both"): Promise<void> {
    const updates: any = {};
    const now = new Date();
    if (which === "customer" || which === "both") updates.customerReminderSentAt = now;
    if (which === "business" || which === "both") updates.businessReminderSentAt = now;
    await db.update(bookings).set(updates).where(eq(bookings.id, id));
  }

  // Notification operations
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(sql`${notifications.createdAt} DESC`);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values({
      id: randomUUID(),
      ...notification
    }).returning();
    return created;
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated || undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

// Initialize with database and demo data
export const storage = new DatabaseStorage();

// Create demo data for development/testing
export async function createDemoData() {
  try {
    // Check if demo user already exists
    const existingDemoUser = await storage.getUserByEmail("demo@test.com");
    if (existingDemoUser) {
      return; // Demo data already exists
    }

    // Demo user for testing authentication
    const demoUser = await storage.createUser({
      email: "demo@test.com",
      name: "Demo User",
      businessName: "Demo Business",
      slug: "demo-business",
      timezone: "America/New_York", 
      country: "US",
      isAdmin: false,
      emailVerified: true,
      primaryColor: "#ef4444",
      secondaryColor: "#f97316", 
      accentColor: "#3b82f6"
    });

    // Admin user for testing admin features
    const adminUser = await storage.createUser({
      email: "admin@test.com",
      name: "Admin User", 
      businessName: "Admin Business",
      timezone: "America/New_York",
      country: "US",
      isAdmin: true,
      emailVerified: true,
      primaryColor: "#ef4444",
      secondaryColor: "#f97316",
      accentColor: "#3b82f6"
    });

    // Create appointment types for demo user
    const consultation30 = await storage.createAppointmentType({
      userId: demoUser.id,
      name: "30min Consultation",
      description: "Quick consultation call",
      duration: 30,
      price: 0,
      color: "#3b82f6",
      isActive: true,
      sortOrder: 1
    });

    const consultation60 = await storage.createAppointmentType({
      userId: demoUser.id,
      name: "60min Deep Dive",
      description: "Extended consultation session",
      duration: 60,
      price: 0,
      color: "#10b981",
      isActive: true,
      sortOrder: 2
    });

    // Create default availability for demo user
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    for (const weekday of weekdays) {
      await storage.createAvailability({
        userId: demoUser.id,
        weekday,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true
      });
    }

    console.log("Demo data created successfully");
  } catch (error) {
    console.error("Error creating demo data:", error);
  }
}