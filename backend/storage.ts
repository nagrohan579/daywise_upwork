// Storage wrapper for Convex - replaces old Drizzle storage.ts
import { convex } from "./convex-client";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export const storage = {
  // User operations
  async getUser(id: string) {
    return await convex.query(api.users.getById, { id: id as Id<"users"> });
  },

  async getUserByEmail(email: string) {
    return await convex.query(api.users.getByEmail, { email });
  },

  async getUserByGoogleId(googleId: string) {
    return await convex.query(api.users.getByGoogleId, { googleId });
  },

  async getUserBySlug(slug: string) {
    return await convex.query(api.users.getBySlug, { slug });
  },

  async getUserByVerificationToken(token: string) {
    return await convex.query(api.users.getByVerificationToken, { token });
  },

  async getUserByPasswordResetToken(token: string) {
    return await convex.query(api.users.getByPasswordResetToken, { token });
  },

  async getAllUsers() {
    return await convex.query(api.users.getAll);
  },

  async createUser(user: any) {
    const id = await convex.mutation(api.users.create, user);
    return await convex.query(api.users.getById, { id });
  },

  async updateUser(id: string, updates: any) {
    return await convex.mutation(api.users.update, {
      id: id as Id<"users">,
      updates
    });
  },

  async updateUserVerificationToken(id: string, token: string, expires: Date) {
    await convex.mutation(api.users.updateVerificationToken, {
      id: id as Id<"users">,
      token,
      expires: expires.getTime(),
    });
  },

  async verifyUserEmail(id: string) {
    await convex.mutation(api.users.verifyEmail, { id: id as Id<"users"> });
  },

  async updatePasswordResetToken(id: string, token: string, expires: Date) {
    await convex.mutation(api.users.updatePasswordResetToken, {
      id: id as Id<"users">,
      token,
      expires: expires.getTime(),
    });
  },

  async resetPassword(id: string, newPassword: string) {
    await convex.mutation(api.users.resetPassword, {
      id: id as Id<"users">,
      newPassword,
    });
  },

  async deleteUser(id: string) {
    return await convex.mutation(api.users.deleteUser, {
      id: id as Id<"users">,
    });
  },

  // Booking operations
  async getBooking(id: string) {
    return await convex.query(api.bookings.getByIdWithType, { id: id as Id<"bookings"> });
  },

  async getBookingByToken(token: string) {
    return await convex.query(api.bookings.getByTokenWithType, { token });
  },

  async getBookingsByUser(userId: string) {
    return await convex.query(api.bookings.getByUserWithTypes, { userId: userId as Id<"users"> });
  },

  async getAllBookings() {
    return await convex.query(api.bookings.getAll);
  },

  async createBooking(booking: any) {
    console.log('storage.createBooking - Input booking:', booking);
    console.log('storage.createBooking - userId:', booking.userId, 'type:', typeof booking.userId);
    console.log('storage.createBooking - bookingToken:', booking.bookingToken, 'type:', typeof booking.bookingToken);
    
    // Convert Date to timestamp
    const bookingData: any = {
      ...booking,
      appointmentDate: booking.appointmentDate instanceof Date
        ? booking.appointmentDate.getTime()
        : booking.appointmentDate,
    };
    
    console.log('storage.createBooking - After spread, userId:', bookingData.userId);
    console.log('storage.createBooking - After spread, bookingToken:', bookingData.bookingToken);
    
    // Remove undefined values to avoid Convex validation issues
    Object.keys(bookingData).forEach(key => {
      if (bookingData[key] === undefined) {
        console.log('storage.createBooking - Removing undefined key:', key);
        delete bookingData[key];
      }
    });
    
    console.log('storage.createBooking - Final bookingData to send:', bookingData);
    console.log('storage.createBooking - Final bookingData JSON:', JSON.stringify(bookingData, null, 2));
    
    const id = await convex.mutation(api.bookings.create, bookingData);
    return await convex.query(api.bookings.getByIdWithType, { id });
  },

  async updateBooking(id: string, updates: any) {
    await convex.mutation(api.bookings.update, {
      id: id as Id<"bookings">,
      updates,
    });
    // Fetch and return the updated booking with appointment type
    return await convex.query(api.bookings.getByIdWithType, { id: id as Id<"bookings"> });
  },

  async deleteBooking(id: string) {
    return await convex.mutation(api.bookings.deleteBooking, {
      id: id as Id<"bookings">,
    });
  },

  // Availability operations
  async getAvailabilityByUser(userId: string) {
    return await convex.query(api.availability.getByUser, { userId: userId as Id<"users"> });
  },

  async getAvailability(id: string) {
    return await convex.query(api.availability.get, { id: id as Id<"availability"> });
  },

  async createAvailability(availability: any) {
    const id = await convex.mutation(api.availability.create, availability);
    return await convex.query(api.availability.getByUser, { userId: availability.userId });
  },

  async updateAvailability(id: string, updates: any) {
    return await convex.mutation(api.availability.update, {
      id: id as Id<"availability">,
      updates,
    });
  },

  async deleteAvailability(id: string) {
    return await convex.mutation(api.availability.deleteAvailability, {
      id: id as Id<"availability">,
    });
  },

  async updateWeeklyAvailability(userId: string, weeklySchedule: any) {
    return await convex.mutation(api.availability.updateWeekly, {
      userId: userId as Id<"users">,
      weeklySchedule,
    });
  },

  // Blocked dates operations
  async getBlockedDatesByUser(userId: string) {
    return await convex.query(api.availability.getBlockedDatesByUser, {
      userId: userId as Id<"users">,
    });
  },

  async createBlockedDate(blockedDate: any) {
    // Convert Dates to timestamps
    const data = {
      ...blockedDate,
      startDate: blockedDate.startDate instanceof Date
        ? blockedDate.startDate.getTime()
        : blockedDate.startDate,
      endDate: blockedDate.endDate instanceof Date
        ? blockedDate.endDate.getTime()
        : blockedDate.endDate,
    };
    const id = await convex.mutation(api.availability.createBlockedDate, data);
    return await convex.query(api.availability.getBlockedDatesByUser, {
      userId: blockedDate.userId,
    });
  },

  async updateBlockedDate(id: string, updates: any) {
    return await convex.mutation(api.availability.updateBlockedDate, {
      id: id as Id<"blockedDates">,
      updates,
    });
  },

  async deleteBlockedDate(id: string) {
    return await convex.mutation(api.availability.deleteBlockedDate, {
      id: id as Id<"blockedDates">,
    });
  },

  // Appointment types operations
  async getAppointmentTypesByUser(userId: string) {
    return await convex.query(api.appointmentTypes.getByUser, {
      userId: userId as Id<"users">,
    });
  },

  async getAppointmentType(id: string) {
    return await convex.query(api.appointmentTypes.getById, {
      id: id as Id<"appointmentTypes">,
    });
  },

  async createAppointmentType(appointmentType: any) {
    const id = await convex.mutation(api.appointmentTypes.create, appointmentType);
    return await convex.query(api.appointmentTypes.getById, { id });
  },

  async updateAppointmentType(id: string, updates: any) {
    return await convex.mutation(api.appointmentTypes.update, {
      id: id as Id<"appointmentTypes">,
      updates,
    });
  },

  async deleteAppointmentType(id: string) {
    return await convex.mutation(api.appointmentTypes.deleteAppointmentType, {
      id: id as Id<"appointmentTypes">,
    });
  },

  // Availability patterns operations
  async getAvailabilityPatternsByUser(userId: string) {
    return await convex.query(api.availability.getPatternsByUser, {
      userId: userId as Id<"users">,
    });
  },

  async getAvailabilityPattern(id: string) {
    // TODO: Add getById to availability patterns
    const patterns = await convex.query(api.availability.getPatternsByUser, {
      userId: "" as Id<"users">, // Will need to refactor this
    });
    return patterns.find((p: any) => p._id === id);
  },

  async createAvailabilityPattern(pattern: any) {
    const id = await convex.mutation(api.availability.createPattern, pattern);
    return await convex.query(api.availability.getPatternsByUser, {
      userId: pattern.userId,
    });
  },

  async updateAvailabilityPattern(id: string, updates: any) {
    return await convex.mutation(api.availability.updatePattern, {
      id: id as Id<"availabilityPatterns">,
      updates,
    });
  },

  async deleteAvailabilityPattern(id: string) {
    return await convex.mutation(api.availability.deletePattern, {
      id: id as Id<"availabilityPatterns">,
    });
  },

  // Availability exceptions operations
  async getAvailabilityExceptionsByUser(userId: string) {
    return await convex.query(api.availability.getExceptionsByUser, {
      userId: userId as Id<"users">,
    });
  },

  async getAvailabilityExceptionsByDate(userId: string, date: Date) {
    return await convex.query(api.availability.getExceptionsByDate, {
      userId: userId as Id<"users">,
      date: date.getTime(),
    });
  },

  async createAvailabilityException(exception: any) {
    // Convert date to timestamp
    const data = {
      ...exception,
      date: exception.date instanceof Date ? exception.date.getTime() : exception.date,
    };
    const id = await convex.mutation(api.availability.createException, data);
    return await convex.query(api.availability.getExceptionsByUser, {
      userId: exception.userId,
    });
  },

  async updateAvailabilityException(id: string, updates: any) {
    return await convex.mutation(api.availability.updateException, {
      id: id as Id<"availabilityExceptions">,
      updates,
    });
  },

  async deleteAvailabilityException(id: string) {
    return await convex.mutation(api.availability.deleteException, {
      id: id as Id<"availabilityExceptions">,
    });
  },

  // Subscription plans operations
  async getAllSubscriptionPlans() {
    return await convex.query(api.subscriptions.getAllPlans);
  },

  async getSubscriptionPlan(planId: string) {
    return await convex.query(api.subscriptions.getPlanById, { planId });
  },

  async createSubscriptionPlan(plan: any) {
    const id = await convex.mutation(api.subscriptions.createPlan, plan);
    return await convex.query(api.subscriptions.getPlanById, { planId: plan.planId });
  },

  async updateSubscriptionPlan(id: string, updates: any) {
    return await convex.mutation(api.subscriptions.updatePlan, {
      id: id as Id<"subscriptionPlans">,
      updates,
    });
  },

  async deleteSubscriptionPlan(id: string) {
    return await convex.mutation(api.subscriptions.deletePlan, {
      id: id as Id<"subscriptionPlans">,
    });
  },

  // User subscriptions operations
  async getUserSubscription(userId: string) {
    return await convex.query(api.subscriptions.getUserSubscription, {
      userId: userId as Id<"users">,
    });
  },

  async getAllUserSubscriptions() {
    return await convex.query(api.subscriptions.getAllUserSubscriptions);
  },

  async createUserSubscription(subscription: any) {
    const id = await convex.mutation(api.subscriptions.createUserSubscription, subscription);
    return await convex.query(api.subscriptions.getUserSubscription, {
      userId: subscription.userId,
    });
  },

  async updateUserSubscription(userId: string, updates: any) {
    return await convex.mutation(api.subscriptions.updateUserSubscription, {
      userId: userId as Id<"users">,
      updates,
    });
  },

  async deleteUserSubscription(userId: string) {
    return await convex.mutation(api.subscriptions.deleteUserSubscription, {
      userId: userId as Id<"users">,
    });
  },

  // Branding operations
  async getBranding(userId: string) {
    return await convex.query(api.branding.getByUser, {
      userId: userId as Id<"users">,
    });
  },

  async createBranding(branding: any) {
    const id = await convex.mutation(api.branding.create, branding);
    return await convex.query(api.branding.getByUser, { userId: branding.userId });
  },

  async updateBranding(userId: string, updates: any) {
    return await convex.mutation(api.branding.update, {
      userId: userId as Id<"users">,
      updates,
    });
  },

  async clearBrandingField(userId: string, field: "logoUrl" | "profilePictureUrl") {
    return await convex.mutation(api.branding.clearField, {
      userId: userId as Id<"users">,
      field,
    });
  },

  // Feedback operations
  async getAllFeedback() {
    return await convex.query(api.feedback.getAll);
  },

  async createFeedback(feedback: any) {
    const id = await convex.mutation(api.feedback.create, feedback);
    return await convex.query(api.feedback.getAll);
  },

  async updateFeedbackStatus(id: string, status: string) {
    return await convex.mutation(api.feedback.updateStatus, {
      id: id as Id<"feedback">,
      status,
    });
  },

  // Reminder operations
  async getBookingsDueForReminders(windowMinutes: number) {
    return await convex.query(api.bookings.getDueForReminders, { windowMinutes });
  },

  async markBookingRemindersSent(id: string, which: "customer" | "business" | "both") {
    await convex.mutation(api.bookings.markRemindersSent, {
      id: id as Id<"bookings">,
      which,
    });
  },

  // Notification operations
  async getNotificationsByUser(userId: string) {
    return await convex.query(api.notifications.getByUser, {
      userId: userId as Id<"users">,
    });
  },

  async getUnreadNotificationsByUser(userId: string) {
    return await convex.query(api.notifications.getUnreadByUser, {
      userId: userId as Id<"users">,
    });
  },

  async createNotification(notification: any) {
    const id = await convex.mutation(api.notifications.create, notification);
    return await convex.query(api.notifications.getByUser, {
      userId: notification.userId,
    });
  },

  async markNotificationAsRead(id: string) {
    return await convex.mutation(api.notifications.markAsRead, {
      id: id as Id<"notifications">,
    });
  },

  async markAllNotificationsAsRead(userId: string) {
    return await convex.mutation(api.notifications.markAllAsRead, {
      userId: userId as Id<"users">,
    });
  },

  async deleteNotification(id: string) {
    return await convex.mutation(api.notifications.deleteNotification, {
      id: id as Id<"notifications">,
    });
  },

  // Google Calendar credentials operations
  async getGoogleCredentialsByUserId(userId: string) {
    return await convex.query(api.googleCalendarCredentials.getByUserId, {
      userId: userId as Id<"users">,
    });
  },

  async createGoogleCredentials(credentials: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiry: number;
    scope: string;
  }) {
    const id = await convex.mutation(api.googleCalendarCredentials.create, {
      userId: credentials.userId as Id<"users">,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenExpiry: credentials.tokenExpiry,
      scope: credentials.scope,
    });
    return await convex.query(api.googleCalendarCredentials.getByUserId, {
      userId: credentials.userId as Id<"users">,
    });
  },

  async updateGoogleCredentials(id: string, updates: any) {
    await convex.mutation(api.googleCalendarCredentials.update, {
      id: id as Id<"googleCalendarCredentials">,
      updates,
    });
    return await convex.query(api.googleCalendarCredentials.getByUserId, {
      userId: updates.userId as Id<"users">,
    });
  },

  async updateGoogleCredentialsByUserId(userId: string, updates: any) {
    return await convex.mutation(api.googleCalendarCredentials.updateByUserId, {
      userId: userId as Id<"users">,
      updates,
    });
  },

  async upsertGoogleCredentials(credentials: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiry: number;
    scope: string;
  }) {
    return await convex.mutation(api.googleCalendarCredentials.upsert, {
      userId: credentials.userId as Id<"users">,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenExpiry: credentials.tokenExpiry,
      scope: credentials.scope,
    });
  },

  async deleteGoogleCredentialsByUserId(userId: string) {
    return await convex.mutation(api.googleCalendarCredentials.deleteByUserId, {
      userId: userId as Id<"users">,
    });
  },

  // Placeholder operations that might be needed
  async getAppointmentTypeAvailabilities(appointmentTypeId: string) {
    // TODO: Implement if needed
    return [];
  },

  async createAppointmentTypeAvailability(mapping: any) {
    // TODO: Implement if needed
    return null;
  },

  async updateAppointmentTypeAvailability(
    appointmentTypeId: string,
    availabilityPatternId: string,
    updates: any
  ) {
    // TODO: Implement if needed
    return undefined;
  },

  async deleteAppointmentTypeAvailability(
    appointmentTypeId: string,
    availabilityPatternId: string
  ) {
    // TODO: Implement if needed
    return false;
  },
};
