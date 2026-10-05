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

type Options = { billingEnabled: boolean; clock: Clock };

// CLAUDE.md rule 8: the only place that decides what a plan grants.
export function createEntitlements({ billingEnabled, clock }: Options) {
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
    return billingEnabled ? subscribedPlanOf(subject) : "ELITE";
  }

  function configFor(subject: EntitlementSubject, feature: Feature) {
    const plan = PAID_ONLY.has(feature)
      ? subscribedPlanOf(subject)
      : planOf(subject);
    return planConfig[plan];
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
