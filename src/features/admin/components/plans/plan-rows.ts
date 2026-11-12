import type {
  FLAG_FEATURES,
  LIMIT_FEATURES,
  PLAN_NAMES,
} from "@/lib/settings/schemas";

export type Plan = (typeof PLAN_NAMES)[number];
export type Limit = (typeof LIMIT_FEATURES)[number];
export type Flag = (typeof FLAG_FEATURES)[number];
/** null = unlimited. */
export type PlanTable = Record<
  Plan,
  { limits: Record<Limit, number | null>; flags: Record<Flag, boolean> }
>;

export const MB = 1024 * 1024;
export const isBytes = (f: Limit) => f.endsWith("Bytes");
/** A storage limit in GB, for limits of 1 GB and up; null below that or with no limit. */
export const inGb = (bytes: number | null) =>
  bytes !== null && bytes >= 1024 * MB
    ? `${(bytes / 1024 / MB).toLocaleString("en-IN", { maximumFractionDigits: 1 })} GB`
    : null;

export type Row =
  | { kind: "limit"; feature: Limit; label: string; unit?: string }
  | { kind: "flag"; feature: Flag; label: string };

/**
 * Each plan card's rows, in names people know (the code's "vault" is the pods of the
 * app, "groups" are squads): the limits, then the on/off features.
 */
export const ROWS: Row[] = [
  { kind: "limit", feature: "syllabusUploads", label: "Syllabus uploads" },
  { kind: "limit", feature: "activePlans", label: "Active study plans" },
  {
    kind: "limit",
    feature: "afterTaskMocksPerDay",
    label: "Check tests",
    unit: "a day",
  },
  {
    kind: "limit",
    feature: "sectionMocksPerWeek",
    label: "Section and full mocks",
    unit: "a week",
  },
  { kind: "limit", feature: "groupsCreated", label: "Squads they create" },
  { kind: "limit", feature: "groupsJoined", label: "Squads they join" },
  {
    kind: "limit",
    feature: "squadMembers",
    label: "Members in a squad they own",
  },
  {
    kind: "limit",
    feature: "channelsPerSquad",
    label: "Channels in a squad they own",
  },
  { kind: "limit", feature: "groupStorageBytes", label: "Squad storage" },
  { kind: "limit", feature: "vaultFolders", label: "Pods" },
  { kind: "limit", feature: "vaultStorageBytes", label: "Pod storage" },
  {
    kind: "limit",
    feature: "vaultMocksPerMonth",
    label: "Mocks from their material",
    unit: "a month",
  },
  {
    kind: "limit",
    feature: "pagesPerVaultMock",
    label: "Pages in each of those mocks",
  },
  { kind: "flag", feature: "aiExplanations", label: "AI answer explanations" },
  {
    kind: "flag",
    feature: "priorityParsing",
    label: "Priority syllabus reading",
  },
  {
    kind: "flag",
    feature: "sellInSquads",
    label: "Charge for their squad or channels",
  },
  { kind: "flag", feature: "verifiedBadge", label: "Verified mark" },
];

/** Boxes that differ between two tables, counted the way the save bar shows them. */
export function countChanges(a: PlanTable, b: PlanTable) {
  let n = 0;
  for (const plan of Object.keys(a) as Plan[])
    for (const row of ROWS)
      if (
        row.kind === "limit"
          ? a[plan].limits[row.feature] !== b[plan].limits[row.feature]
          : a[plan].flags[row.feature] !== b[plan].flags[row.feature]
      )
        n++;
  return n;
}
