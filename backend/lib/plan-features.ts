// server/lib/plan-features.ts
import { PLAN_FEATURES, FeaturesShape } from "./features";
import { storage } from "../storage";

export async function getUserFeatures(userId: string): Promise<FeaturesShape> {
  const sub = await storage.getUserSubscription(userId);
  if (!sub?.planId) return PLAN_FEATURES["free"];
  return PLAN_FEATURES[sub.planId] ?? PLAN_FEATURES["free"];
}

export function requireFeature(feature: keyof FeaturesShape) {
  return async (req: any, res: any, next: any) => {
    const userId = req.session?.userId;
    const features = await getUserFeatures(userId);

    if (!features[feature]) {
      return res.status(403).json({ message: `Feature ${feature} not available in your plan` });
    }
    next();
  };
}