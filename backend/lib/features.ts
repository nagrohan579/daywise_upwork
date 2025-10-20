export type FeatureSpec =
  | { type: "boolean"; default: boolean }
  | { type: "number"; default: number | null }; // null = unlimited

export type FeaturesShape = {
  customBranding: boolean;     // branding + logo combined
  bookingLimit: number | null; // max bookings per month
  appointmentTypeLimit: number | null;
  emailConfirmations: boolean;
  emailReminders: boolean;
  prioritySupport: boolean;
  poweredBy: boolean;          // must show "Powered by DayWise"
};

export const FEATURE_SPECS: Record<keyof FeaturesShape, FeatureSpec> = {
  customBranding: { type: "boolean", default: false },
  bookingLimit: { type: "number", default: 5 },
  appointmentTypeLimit: { type: "number", default: 2 },
  emailConfirmations: { type: "boolean", default: true },
  emailReminders: { type: "boolean", default: false },
  prioritySupport: { type: "boolean", default: false },
  poweredBy: { type: "boolean", default: true },
};

export function applyDefaults(partial?: Partial<FeaturesShape>): FeaturesShape {
  const out: any = {};
  for (const key of Object.keys(FEATURE_SPECS) as (keyof FeaturesShape)[]) {
    out[key] =
      partial?.[key] !== undefined ? partial[key] : (FEATURE_SPECS[key] as any).default;
  }
  return out as FeaturesShape;
}

// Explicit plan definitions
export const PLAN_FEATURES: Record<string, FeaturesShape> = {
  free: {
    customBranding: false,
    bookingLimit: 5,
    appointmentTypeLimit: 2,
    emailConfirmations: true,
    emailReminders: false,
    prioritySupport: false,
    poweredBy: true,
  },
  pro: {
    customBranding: true,
    bookingLimit: null,
    appointmentTypeLimit: null,
    emailConfirmations: true,
    emailReminders: true,
    prioritySupport: true,
    poweredBy: false,
  },
};