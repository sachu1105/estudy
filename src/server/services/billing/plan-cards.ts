import "server-only";

import { featureRows, type PlanName } from "@/lib/pricing/pricing";
import { planPricePaise, PLANS } from "@/server/entitlements/config";
import { effectivePlans } from "@/server/entitlements/resolve";
import { cachedSettings } from "@/server/settings";

/**
 * The three plans as the pricing page shows them, with the admin's limit edits applied,
 * so what is advertised is exactly what `can` and `limit` enforce.
 */
export function planCards() {
  const plans = effectivePlans(cachedSettings().entitlements);
  return PLANS.map((plan) => ({
    plan: plan as PlanName,
    pricePaise: planPricePaise[plan],
    rows: featureRows(plans[plan]),
  }));
}

/** The plan the admin lifts up on the pricing cards (Plans and limits). */
export const featuredPlan = (): PlanName =>
  cachedSettings().featuredPlan?.plan ?? "PRO";
