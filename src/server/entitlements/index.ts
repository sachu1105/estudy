import "server-only";

import { systemClock } from "@/lib/clock";
import { env } from "@/server/env";
import { cachedSettings } from "@/server/settings";

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
  // The admin's billing switch and limit changes, from the settings cache.
  settings: () => {
    const values = cachedSettings();
    return {
      billingEnabled: values.billing?.enabled,
      overrides: values.entitlements,
    };
  },
});

export const can = entitlements.can;
export const limit = entitlements.limit;
export const planOf = entitlements.planOf;
export const isPaidOnly = entitlements.isPaidOnly;
/** Billing as it is now: the admin's switch, else the environment. */
export const billingEnabled = () =>
  cachedSettings().billing?.enabled ?? env.BILLING_ENABLED;
