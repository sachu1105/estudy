import type { Clock } from "@/lib/clock";

import {
  PAID_ONLY,
  planConfig,
  type Feature,
  type FlagFeature,
  type LimitFeature,
  type PlanName,
} from "./config";

/** What entitlements need to know about a user. */
export type EntitlementSubject = {
  subscription: {
    plan: PlanName;
    status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
    periodEnd: Date | null;
  } | null;
};

/** Admin changes over the built-in table (milestone 15); null limits mean unlimited. */
export type EntitlementSettings = {
  billingEnabled?: boolean;
  overrides?: Partial<
    Record<
      PlanName,
      {
        limits?: Partial<Record<LimitFeature, number | null>>;
        flags?: Partial<Record<FlagFeature, boolean>>;
      }
    >
  >;
};

type Options = {
  billingEnabled: boolean;
  clock: Clock;
  /** Read on every check, so admin edits apply without a restart. */
  settings?: () => EntitlementSettings;
};

/** The plans table with the admin's changes laid over it. */
export function effectivePlans(overrides: EntitlementSettings["overrides"]) {
  if (!overrides) return planConfig;
  const plans = structuredClone(planConfig);
  for (const [plan, change] of Object.entries(overrides) as [
    PlanName,
    NonNullable<EntitlementSettings["overrides"]>[PlanName],
  ][]) {
    for (const [feature, value] of Object.entries(change?.limits ?? {}))
      plans[plan].limits[feature as LimitFeature] = value ?? Infinity;
    Object.assign(plans[plan].flags, change?.flags ?? {});
  }
  return plans;
}

// CLAUDE.md rule 8: the only place that decides what a plan grants.
export function createEntitlements({
  billingEnabled: billingDefault,
  clock,
  settings,
}: Options) {
  let lastOverrides: EntitlementSettings["overrides"];
  let plans = planConfig;
  /** The current table, rebuilt only when the admin's changes do. */
  function table() {
    const overrides = settings?.().overrides;
    if (overrides !== lastOverrides) {
      lastOverrides = overrides;
      plans = effectivePlans(overrides);
    }
    return plans;
  }
  const billingOn = () => settings?.().billingEnabled ?? billingDefault;

  /** The plan the user actually holds, ignoring the free-launch override. */
  function subscribedPlanOf(subject: EntitlementSubject): PlanName {
    const sub = subject.subscription;
    if (!sub) return "FREE";
    // PAST_DUE keeps access during the grace period; CANCELLED keeps it until periodEnd.
    const inPeriod = sub.periodEnd === null || sub.periodEnd > clock.now();
    const entitled =
      sub.status === "ACTIVE" ||
      ((sub.status === "PAST_DUE" || sub.status === "CANCELLED") && inPeriod);
    return entitled ? sub.plan : "FREE";
  }

  function planOf(subject: EntitlementSubject): PlanName {
    return billingOn() ? subscribedPlanOf(subject) : "ELITE";
  }

  function configFor(subject: EntitlementSubject, feature: Feature) {
    const plan = PAID_ONLY.has(feature)
      ? subscribedPlanOf(subject)
      : planOf(subject);
    return table()[plan];
  }

  function limit(subject: EntitlementSubject, feature: LimitFeature): number {
    return configFor(subject, feature).limits[feature];
  }

  function can(
    subject: EntitlementSubject,
    feature: FlagFeature | LimitFeature,
  ): boolean {
    const config = configFor(subject, feature);
    if (feature in config.flags) return config.flags[feature as FlagFeature];
    return config.limits[feature as LimitFeature] > 0;
  }

  /** Paid-only features the user can't use yet, so the UI can show an upgrade card. */
  function isPaidOnly(feature: Feature) {
    return PAID_ONLY.has(feature);
  }

  return { planOf, subscribedPlanOf, limit, can, isPaidOnly };
}
