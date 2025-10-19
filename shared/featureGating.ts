import { SubscriptionPlan, UserSubscription, Booking } from "./schema";

export interface FeatureGateResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

export interface UserPlanData {
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
}

// Feature shape that matches the JSON features stored in subscription plans
interface PlanFeatures {
  customBranding?: boolean;
  logoUpload?: boolean;
  bookingLimit?: number | null;
  appointmentTypeLimit?: number | null;
  teamMemberLimit?: number | null;
}

// Helper to safely extract features from plan JSON
function getPlanFeatures(plan: SubscriptionPlan | null): PlanFeatures {
  if (!plan) return {};
  
  try {
    // Plan features are stored as JSON, safely parse them
    const features = typeof plan.features === 'object' && plan.features ? plan.features as PlanFeatures : {};
    return features;
  } catch {
    return {};
  }
}

/**
 * Feature gating utility to control access based on subscription plans
 */
export class FeatureGate {
  /**
   * Check if user can create new bookings based on their plan limits
   */
  static canCreateBooking(
    userPlan: UserPlanData,
    existingBookings: Booking[],
    currentMonth: Date = new Date()
  ): FeatureGateResult {
    const features = getPlanFeatures(userPlan.plan);
    
    // Use booking limit from features (default 10 for free/demo users, null = unlimited)
    const bookingLimit = features.bookingLimit !== undefined ? features.bookingLimit : 10;
    
    // If unlimited (null), allow
    if (bookingLimit === null) {
      return { allowed: true };
    }

    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const bookingsThisMonth = existingBookings.filter(booking => {
      if (!booking.createdAt) return false;
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= monthStart && bookingDate <= monthEnd;
    });

    if (bookingsThisMonth.length >= bookingLimit) {
      return {
        allowed: false,
        reason: `Monthly booking limit of ${bookingLimit} reached`,
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user has access to custom branding features
   */
  static hasCustomBranding(userPlan: UserPlanData): FeatureGateResult {
    const features = getPlanFeatures(userPlan.plan);

    if (!features.customBranding) {
      return {
        allowed: false,
        reason: "Custom branding not available in your current plan",
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user has logo upload capability
   */
  static hasLogoUpload(userPlan: UserPlanData): FeatureGateResult {
    const features = getPlanFeatures(userPlan.plan);

    if (!features.logoUpload) {
      return {
        allowed: false,
        reason: "Logo upload not available in your current plan",
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can create additional appointment types based on plan limits
   */
  static canCreateAppointmentType(
    userPlan: UserPlanData,
    existingTypesCount: number
  ): FeatureGateResult {
    const features = getPlanFeatures(userPlan.plan);
    const maxTypes = features.appointmentTypeLimit !== undefined ? features.appointmentTypeLimit : 3; // default limit

    // If unlimited (null), allow
    if (maxTypes === null) {
      return { allowed: true };
    }

    if (existingTypesCount >= maxTypes) {
      return {
        allowed: false,
        reason: `Plan limited to ${maxTypes} appointment types`,
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Get the max number of appointment types allowed for a plan
   */
  static getMaxAppointmentTypes(userPlan: UserPlanData): number | null {
    const features = getPlanFeatures(userPlan.plan);
    return features.appointmentTypeLimit !== undefined ? features.appointmentTypeLimit : 3; // default limit for free users
  }

  /**
   * Get plan-specific feature summary for UI display
   */
  static getPlanFeatureSummary(plan: SubscriptionPlan): {
    bookingLimit: string;
    appointmentTypes: string;
    features: string[];
  } {
    const features = getPlanFeatures(plan);
    
    const bookingLimit = features.bookingLimit 
      ? `${features.bookingLimit} bookings/month`
      : "Unlimited bookings";

    const appointmentTypes = features.appointmentTypeLimit 
      ? `Up to ${features.appointmentTypeLimit} appointment types`
      : "Unlimited appointment types";

    const featureList: string[] = [];
    if (features.customBranding) featureList.push("Custom Branding");
    if (features.logoUpload) featureList.push("Logo Upload");

    return {
      bookingLimit,
      appointmentTypes,
      features: featureList,
    };
  }

  /**
   * Check if subscription is active and not expired
   */
  static isSubscriptionActive(subscription: UserSubscription | null): boolean {
    if (!subscription) return false;
    
    if (subscription.status !== "active") return false;
    
    // Check if subscription is past due date (using renewsAt from our schema)
    if (subscription.renewsAt) {
      const now = new Date();
      const renewsAt = new Date(subscription.renewsAt);
      if (now > renewsAt && subscription.cancelAt) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get user's effective plan (Free plan if no active subscription)
   */
  static getEffectivePlan(
    userPlan: UserPlanData,
    freePlan: SubscriptionPlan
  ): SubscriptionPlan {
    if (!userPlan.subscription || !this.isSubscriptionActive(userPlan.subscription)) {
      return freePlan;
    }
    
    return userPlan.plan || freePlan;
  }
}