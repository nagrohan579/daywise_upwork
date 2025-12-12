// Storage wrapper for Convex - replaces old Drizzle storage.ts
import { convex } from "./convex-client";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { retryWithBackoff } from "./lib/retry-wrapper";

export const storage = {
  // User operations
  async getUser(id: string) {
    return await convex.query(api.users.getById, { id: id as Id<"users"> });
  },

  async getUserById(id: string) {
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
    // Convert string IDs to Convex IDs and filter out null intakeFormId
    const mutationData: any = {
      userId: appointmentType.userId as Id<"users">,
      name: appointmentType.name,
      description: appointmentType.description,
      duration: appointmentType.duration,
      bufferTimeBefore: appointmentType.bufferTimeBefore,
      bufferTime: appointmentType.bufferTime,
      price: appointmentType.price,
      color: appointmentType.color,
      isActive: appointmentType.isActive,
      sortOrder: appointmentType.sortOrder,
    };
    
    // Only include intakeFormId if it's provided and not null
    if (appointmentType.intakeFormId && appointmentType.intakeFormId !== null) {
      mutationData.intakeFormId = appointmentType.intakeFormId as Id<"intakeForms">;
    }
    
    // Include requirePayment if provided
    if (appointmentType.requirePayment !== undefined) {
      mutationData.requirePayment = appointmentType.requirePayment;
    }
    
    const id = await convex.mutation(api.appointmentTypes.create, mutationData);
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

  async setAllAppointmentTypesInactiveForUser(userId: string) {
    return await convex.mutation(api.appointmentTypes.setAllInactiveForUser, {
      userId: userId as Id<"users">,
    });
  },

  async setAllIntakeFormsInactiveForUser(userId: string) {
    return await convex.mutation(api.intakeForms.setAllInactiveForUser, {
      userId: userId as Id<"users">,
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

  async createTrialSubscription(userId: string, trialDuration: number) {
    return await convex.mutation(api.subscriptions.createTrialSubscription, {
      userId: userId as Id<"users">,
      trialDuration,
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
    return await retryWithBackoff(
      async () => await convex.query(api.bookings.getDueForReminders, { windowMinutes }),
      {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        operation: 'Get bookings due for reminders'
      }
    );
  },

  async markBookingRemindersSent(id: string, which: "customer" | "business" | "both") {
    await retryWithBackoff(
      async () => await convex.mutation(api.bookings.markRemindersSent, {
        id: id as Id<"bookings">,
        which,
      }),
      {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        operation: 'Mark booking reminders sent'
      }
    );
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
    const id = await convex.mutation(api.notifications.create, {
      userId: notification.userId as Id<"users">,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      relatedBookingId: notification.relatedBookingId ? notification.relatedBookingId as Id<"bookings"> : undefined,
      customerName: notification.customerName,
      serviceName: notification.serviceName,
      appointmentDate: notification.appointmentDate,
    });
    return { _id: id, ...notification, isRead: false, createdAt: Date.now() };
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

  // Intake Forms operations
  async getIntakeFormsByUser(userId: string) {
    return await convex.query(api.intakeForms.getByUser, {
      userId: userId as Id<"users">,
    });
  },

  async getIntakeFormById(formId: string) {
    return await convex.query(api.intakeForms.getById, {
      formId: formId as Id<"intakeForms">,
    });
  },

  async createIntakeForm(form: any) {
    const id = await convex.mutation(api.intakeForms.create, {
      userId: form.userId as Id<"users">,
      name: form.name,
      description: form.description,
      fields: form.fields,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    });
    return await convex.query(api.intakeForms.getById, { formId: id });
  },

  async updateIntakeForm(formId: string, updates: any) {
    return await convex.mutation(api.intakeForms.update, {
      formId: formId as Id<"intakeForms">,
      updates,
    });
  },

  async deleteIntakeForm(formId: string) {
    return await convex.mutation(api.intakeForms.deleteForm, {
      formId: formId as Id<"intakeForms">,
    });
  },

  // Form Submissions operations
  async getTempFormSubmissionBySession(sessionId: string) {
    return await convex.query(api.formSubmissions.getTempBySession, {
      sessionId,
    });
  },

  async getFormSubmissionByBooking(bookingId: string) {
    return await convex.query(api.formSubmissions.getByBookingId, {
      bookingId: bookingId as Id<"bookings">,
    });
  },

  async createTempFormSubmission(submission: any) {
    return await convex.mutation(api.formSubmissions.createTempSubmission, {
      sessionId: submission.sessionId,
      intakeFormId: submission.intakeFormId as Id<"intakeForms">,
      appointmentTypeId: submission.appointmentTypeId as Id<"appointmentTypes">,
      responses: submission.responses,
      fileUrls: submission.fileUrls,
    });
  },

  async updateTempFormSubmission(sessionId: string, updates: any) {
    return await convex.mutation(api.formSubmissions.updateTempSubmission, {
      sessionId,
      updates,
    });
  },

  async deleteTempFormSubmission(sessionId: string) {
    return await convex.mutation(api.formSubmissions.deleteTempSubmission, {
      sessionId,
    });
  },

  async finalizeFormSubmission(sessionId: string, bookingId: string) {
    return await convex.mutation(api.formSubmissions.finalizeSubmission, {
      sessionId,
      bookingId: bookingId as Id<"bookings">,
    });
  },

  async deleteFormSubmissionByBooking(bookingId: string) {
    return await convex.mutation(api.formSubmissions.deleteByBookingId, {
      bookingId: bookingId as Id<"bookings">,
    });
  },

  async cleanupExpiredTempSubmissions() {
    return await convex.mutation(api.formSubmissions.cleanupExpiredTemp, {});
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

  // ============================================
  // CANVA INTEGRATION - Cross-platform account management
  // ============================================

  // Get user by Canva user ID (for already-linked users)
  async getUserByCanvaId(canvaUserId: string) {
    return await convex.query(api.users.getByCanvaUserId, { canvaUserId });
  },

  // Link Canva to existing DayWise user (auto-link by email/googleId)
  async linkCanvaToUser(userId: string, canvaUserId: string, brandId: string) {
    return await convex.mutation(api.users.update, {
      id: userId as Id<"users">,
      updates: {
        canvaUserId,
        canvaBrandId: brandId,
        canvaLinkedAt: Date.now(),
        lastCanvaAccess: Date.now()
      }
    });
  },

  // Update last Canva access time (for analytics)
  async updateCanvaAccess(userId: string) {
    return await convex.mutation(api.users.update, {
      id: userId as Id<"users">,
      updates: {
        lastCanvaAccess: Date.now()
      }
    });
  },

  // Unlink Canva from a user (remove Canva identifiers so they can reconnect)
  async unlinkCanvaFromUser(userId: string) {
    return await convex.mutation(api.users.update, {
      id: userId as Id<"users">,
      updates: {
        canvaUserId: undefined,
        canvaBrandId: undefined,
        canvaLinkedAt: undefined,
        lastCanvaAccess: undefined,
      },
    });
  },

  // Create new DayWise user from Canva signup (email/password)
  async createUserFromCanva(data: {
    email: string;
    name: string;
    password: string;
    canvaUserId: string;
    canvaBrandId: string;
    timezone: string;
    country: string;
  }) {
    const id = await convex.mutation(api.users.create, {
      email: data.email,
      name: data.name,
      password: data.password,
      timezone: data.timezone,
      country: data.country,
      primaryColor: "#4F46E5",
      secondaryColor: "#10B981",
      accentColor: "#F59E0B",
      bookingWindow: 30,
      isAdmin: false,
      emailVerified: false,
    });

    // Update with Canva-specific fields
    await convex.mutation(api.users.update, {
      id,
      updates: {
        canvaUserId: data.canvaUserId,
        canvaBrandId: data.canvaBrandId,
        signupSource: "canva",
        canvaLinkedAt: Date.now(),
        lastCanvaAccess: Date.now(),
      }
    });

    return await convex.query(api.users.getById, { id });
  },

  // Create new DayWise user from Canva Google OAuth signup
  async createUserFromCanvaGoogle(data: {
    email: string;
    name: string;
    googleId: string;
    picture?: string;
    canvaUserId: string;
    canvaBrandId: string;
    timezone: string;
    country: string;
  }) {
    const id = await convex.mutation(api.users.create, {
      email: data.email,
      name: data.name,
      googleId: data.googleId,
      picture: data.picture,
      timezone: data.timezone,
      country: data.country,
      primaryColor: "#4F46E5",
      secondaryColor: "#10B981",
      accentColor: "#F59E0B",
      bookingWindow: 30,
      isAdmin: false,
      emailVerified: true, // Google accounts pre-verified
    });

    // Update with Canva-specific fields
    await convex.mutation(api.users.update, {
      id,
      updates: {
        canvaUserId: data.canvaUserId,
        canvaBrandId: data.canvaBrandId,
        signupSource: "canva",
        canvaLinkedAt: Date.now(),
        lastCanvaAccess: Date.now(),
      }
    });

    return await convex.query(api.users.getById, { id });
  },
};
