import { describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";

import { createEntitlements, type EntitlementSubject } from "./resolve";

const clock = fixedClock("2026-10-05T10:00:00Z");
const free: EntitlementSubject = { subscription: null };
const pro = (
  overrides: Partial<NonNullable<EntitlementSubject["subscription"]>> = {},
) => ({
  subscription: {
    plan: "PRO" as const,
    status: "ACTIVE" as const,
    periodEnd: null,
    ...overrides,
  },
});

describe("entitlements with billing disabled", () => {
  const { can, limit, planOf } = createEntitlements({
    billingEnabled: false,
    clock,
  });

  it("resolves everyone to ELITE", () => {
    expect(planOf(free)).toBe("ELITE");
    expect(planOf(pro({ status: "EXPIRED" }))).toBe("ELITE");
  });

  it("grants every feature and unlimited counts", () => {
    expect(can(free, "aiExplanations")).toBe(true);
    expect(can(free, "topperComparison")).toBe(true);
    expect(limit(free, "syllabusUploads")).toBe(Infinity);
    expect(limit(free, "groupStorageBytes")).toBe(5 * 1024 ** 3);
  });
});

describe("entitlements with billing enabled", () => {
  const { can, limit, planOf } = createEntitlements({
    billingEnabled: true,
    clock,
  });

  it("defaults users without a subscription to FREE limits", () => {
    expect(planOf(free)).toBe("FREE");
    expect(limit(free, "syllabusUploads")).toBe(1);
    expect(limit(free, "afterTaskMocksPerDay")).toBe(3);
    expect(can(free, "aiExplanations")).toBe(false);
    expect(can(free, "activePlans")).toBe(true);
  });

  it("applies PRO limits to an active PRO subscription", () => {
    expect(limit(pro(), "syllabusUploads")).toBe(5);
    expect(limit(pro(), "afterTaskMocksPerDay")).toBe(Infinity);
    expect(can(pro(), "aiExplanations")).toBe(true);
    expect(can(pro(), "topperComparison")).toBe(false);
  });

  it("keeps a cancelled plan until the period ends, then drops to FREE", () => {
    expect(
      planOf(
        pro({
          status: "CANCELLED",
          periodEnd: new Date("2026-10-31T00:00:00Z"),
        }),
      ),
    ).toBe("PRO");
    expect(
      planOf(
        pro({
          status: "CANCELLED",
          periodEnd: new Date("2026-10-01T00:00:00Z"),
        }),
      ),
    ).toBe("FREE");
  });

  it("drops expired subscriptions to FREE", () => {
    expect(planOf(pro({ status: "EXPIRED" }))).toBe("FREE");
  });
});
