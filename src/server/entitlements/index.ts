import "server-only";

import { systemClock } from "@/lib/clock";
import { env } from "@/server/env";

import { createEntitlements } from "./resolve";

export type { EntitlementSubject } from "./resolve";
export {
  PAID_ONLY,
  planConfig,
  PLANS,
  type Feature,
  type FlagFeature,
  type LimitFeature,
  type PlanName,
} from "./config";

const entitlements = createEntitlements({
  billingEnabled: env.BILLING_ENABLED,
  clock: systemClock,
});

export const can = entitlements.can;
export const limit = entitlements.limit;
export const planOf = entitlements.planOf;
export const isPaidOnly = entitlements.isPaidOnly;
export const billingEnabled = env.BILLING_ENABLED;
