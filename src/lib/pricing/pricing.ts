// The plan table as the pricing page and the upgrade cards show it. Pure: it takes the
// effective plans (admin edits included), so pricing can never drift from the limits.

export type PlanName = "FREE" | "PRO" | "ELITE";

export type PlanShape = {
  limits: Record<string, number>;
  flags: Record<string, boolean>;
};

const MB = 1024 ** 2;
const GB = 1024 ** 3;

export const countOf = (value: number, unit = "") =>
  value === Infinity ? "Unlimited" : `${value}${unit}`;

export function storageOf(bytes: number) {
  if (bytes === Infinity) return "Unlimited";
  return bytes >= GB
    ? `${Math.round((bytes / GB) * 10) / 10} GB`
    : `${Math.round(bytes / MB)} MB`;
}

/** Rupees, with no paise when it is a round amount. */
export function rupees(paise: number) {
  const value = paise / 100;
  return `₹${value % 1 === 0 ? value : value.toFixed(2)}`;
}

export const planLabel = (plan: PlanName) =>
  plan.charAt(0) + plan.slice(1).toLowerCase();

export const blurbs: Record<PlanName, string> = {
  FREE: "Everything you need to start one plan.",
  PRO: "For serious aspirants with more than one exam.",
  ELITE: "No limits on anything.",
};

export type FeatureRow = { label: string; on: boolean };

/** "1 syllabus upload", "5 syllabus uploads", "Unlimited syllabus uploads". */
export function plural(value: number, one: string, many: string) {
  return value === Infinity
    ? `Unlimited ${many}`
    : `${value} ${value === 1 ? one : many}`;
}

export function featureRows(plan: PlanShape): FeatureRow[] {
  const { limits, flags } = plan;
  const groups =
    limits.groupsCreated === Infinity && limits.groupsJoined === Infinity
      ? "Unlimited squads, created or joined"
      : `${plural(limits.groupsCreated, "squad", "squads")} created, ${countOf(limits.groupsJoined)} joined`;
  return [
    {
      label: plural(
        limits.syllabusUploads,
        "syllabus upload",
        "syllabus uploads",
      ),
      on: true,
    },
    {
      label: plural(
        limits.activePlans,
        "active study plan",
        "active study plans",
      ),
      on: true,
    },
    {
      label:
        limits.afterTaskMocksPerDay === Infinity
          ? "Unlimited after-task tests"
          : `${plural(limits.afterTaskMocksPerDay, "after-task test", "after-task tests")} a day`,
      on: true,
    },
    {
      label:
        limits.sectionMocksPerWeek === Infinity
          ? "Unlimited section and full mocks"
          : `${plural(limits.sectionMocksPerWeek, "section or full mock", "section and full mocks")} a week`,
      on: true,
    },
    { label: "AI answer explanations", on: flags.aiExplanations },
    { label: groups, on: true },
    {
      label:
        limits.squadMembers === Infinity
          ? "Unlimited members in your squads"
          : `Up to ${limits.squadMembers} members in each squad you run`,
      on: true,
    },
    { label: `${storageOf(limits.groupStorageBytes)} squad storage`, on: true },
    {
      label: `${storageOf(limits.vaultStorageBytes)} pod storage for notes, links and files`,
      on: true,
    },
    {
      label:
        limits.vaultMocksPerMonth > 0
          ? `${limits.vaultMocksPerMonth} mock tests a month from your own material, up to ${limits.pagesPerVaultMock} pages each`
          : "Mock tests from your own material",
      on: limits.vaultMocksPerMonth > 0,
    },
    {
      label: flags.priorityParsing
        ? "Priority parsing queue"
        : "Normal parsing queue",
      on: true,
    },
    { label: "Verified mark on your name and squads", on: flags.verifiedBadge },
  ];
}

/**
 * What a person over a limit keeps. Nothing is ever deleted when a plan ends: the extra
 * items stay and become read-only, oldest kept first (milestone 16).
 */
export function overLimitNote(kind: string, kept: number, have: number) {
  return have <= kept
    ? null
    : `You have ${have} ${kind}; your plan covers ${kept}. The rest stay, read-only, until you upgrade.`;
}
