import { describe, expect, it } from "vitest";

import {
  countOf,
  featureRows,
  overLimitNote,
  plural,
  rupees,
  storageOf,
} from "./pricing";

const plan = {
  limits: {
    syllabusUploads: 5,
    activePlans: Infinity,
    afterTaskMocksPerDay: 3,
    sectionMocksPerWeek: 1,
    groupsCreated: 5,
    groupsJoined: 10,
    groupStorageBytes: 1024 ** 3,
    vaultStorageBytes: 200 * 1024 ** 2,
    vaultMocksPerMonth: 30,
    pagesPerVaultMock: 40,
  },
  flags: {
    aiExplanations: true,
    priorityParsing: false,
    sellInSquads: false,
    verifiedBadge: true,
  },
};

describe("pricing", () => {
  it("writes amounts and limits the way a reader expects", () => {
    expect(rupees(19900)).toBe("₹199");
    expect(rupees(0)).toBe("₹0");
    expect(rupees(19950)).toBe("₹199.50");
    expect(countOf(Infinity)).toBe("Unlimited");
    expect(countOf(3, " a day")).toBe("3 a day");
    expect(storageOf(1024 ** 3)).toBe("1 GB");
    expect(storageOf(200 * 1024 ** 2)).toBe("200 MB");
  });

  it("counts in words that read correctly at one, many and unlimited", () => {
    expect(plural(1, "group", "groups")).toBe("1 group");
    expect(plural(5, "group", "groups")).toBe("5 groups");
    expect(plural(Infinity, "group", "groups")).toBe("Unlimited groups");
    const one = featureRows({
      ...plan,
      limits: {
        ...plan.limits,
        syllabusUploads: 1,
        activePlans: 1,
        groupsCreated: 1,
        groupsJoined: 3,
        sectionMocksPerWeek: 1,
      },
    });
    expect(one[0].label).toBe("1 syllabus upload");
    expect(one[1].label).toBe("1 active study plan");
    expect(one[3].label).toBe("1 section or full mock a week");
    expect(one[5].label).toBe("1 squad created, 3 joined");
    const unlimited = featureRows({
      ...plan,
      limits: {
        ...plan.limits,
        groupsCreated: Infinity,
        groupsJoined: Infinity,
      },
    });
    expect(unlimited[5].label).toBe("Unlimited squads, created or joined");
  });

  it("builds rows straight from the limits, so they cannot drift", () => {
    const rows = featureRows(plan);
    expect(rows[0]).toEqual({ label: "5 syllabus uploads", on: true });
    expect(rows[1].label).toBe("Unlimited active study plans");
    expect(rows.find((r) => r.label === "AI answer explanations")?.on).toBe(
      true,
    );
    expect(rows.some((r) => /analytics/i.test(r.label))).toBe(false);
    const free = featureRows({
      ...plan,
      limits: { ...plan.limits, vaultMocksPerMonth: 0 },
    });
    expect(
      free.find((r) => r.label.startsWith("Mock tests from your own")),
    ).toEqual({ label: "Mock tests from your own material", on: false });
  });

  it("says what happens over a limit, and nothing when inside it", () => {
    expect(overLimitNote("groups", 1, 3)).toContain("read-only");
    expect(overLimitNote("groups", 3, 3)).toBeNull();
  });
});
