import type { Clock } from "@/lib/clock";

import {
  planConfig,
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
  function planOf(subject: EntitlementSubject): PlanName {
    if (!billingEnabled) return "ELITE";
    const sub = subject.subscription;
    if (!sub) return "FREE";
    // PAST_DUE keeps access during the grace period; CANCELLED keeps it until periodEnd.
    const inPeriod = sub.periodEnd === null || sub.periodEnd > clock.now();
    const entitled =
      sub.status === "ACTIVE" ||
      ((sub.status === "PAST_DUE" || sub.status === "CANCELLED") && inPeriod);
    return entitled ? sub.plan : "FREE";
  }

  function limit(subject: EntitlementSubject, feature: LimitFeature): number {
    return planConfig[planOf(subject)].limits[feature];
  }

  function can(
    subject: EntitlementSubject,
    feature: FlagFeature | LimitFeature,
  ): boolean {
    const config = planConfig[planOf(subject)];
    if (feature in config.flags) return config.flags[feature as FlagFeature];
    return config.limits[feature as LimitFeature] > 0;
  }

  return { planOf, limit, can };
}
