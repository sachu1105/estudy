// The plans table from CLAUDE.md. Admin-editable from milestone 12; read only here.
// Infinity means unlimited.

export const PLANS = ["FREE", "PRO", "ELITE"] as const;
export type PlanName = (typeof PLANS)[number];

const MB = 1024 * 1024;
const GB = 1024 * MB;

export type LimitFeature =
  | "syllabusUploads"
  | "activePlans"
  | "afterTaskMocksPerDay"
  | "sectionMocksPerWeek"
  | "groupsCreated"
  | "groupsJoined"
  | "groupStorageBytes"
  | "vaultStorageBytes"
  | "vaultFolders"
  | "vaultMocksPerMonth"
  | "pagesPerVaultMock";

export type FlagFeature =
  "aiExplanations" | "fullAnalytics" | "topperComparison" | "priorityParsing";

export type Feature = LimitFeature | FlagFeature;

/**
 * Paid features stay locked during the free launch (BILLING_ENABLED=false). They resolve
 * against the user's real subscription: PRO or ELITE, paid or granted by an admin.
 */
export const PAID_ONLY: ReadonlySet<Feature> = new Set<Feature>([
  "vaultMocksPerMonth",
  "pagesPerVaultMock",
]);

type PlanConfig = {
  limits: Record<LimitFeature, number>;
  flags: Record<FlagFeature, boolean>;
};

export const planConfig: Record<PlanName, PlanConfig> = {
  FREE: {
    limits: {
      syllabusUploads: 1,
      activePlans: 1,
      afterTaskMocksPerDay: 3,
      sectionMocksPerWeek: 1,
      groupsCreated: 1,
      groupsJoined: 3,
      groupStorageBytes: 50 * MB,
      vaultStorageBytes: 200 * MB,
      vaultFolders: Infinity,
      vaultMocksPerMonth: 0,
      pagesPerVaultMock: 0,
    },
    flags: {
      aiExplanations: false,
      fullAnalytics: false,
      topperComparison: false,
      priorityParsing: false,
    },
  },
  PRO: {
    limits: {
      syllabusUploads: 5,
      activePlans: 3,
      afterTaskMocksPerDay: Infinity,
      sectionMocksPerWeek: Infinity,
      groupsCreated: 5,
      groupsJoined: 10,
      groupStorageBytes: 1 * GB,
      vaultStorageBytes: 5 * GB,
      vaultFolders: Infinity,
      vaultMocksPerMonth: 30,
      pagesPerVaultMock: 40,
    },
    flags: {
      aiExplanations: true,
      fullAnalytics: true,
      topperComparison: false,
      priorityParsing: false,
    },
  },
  ELITE: {
    limits: {
      syllabusUploads: Infinity,
      activePlans: Infinity,
      afterTaskMocksPerDay: Infinity,
      sectionMocksPerWeek: Infinity,
      groupsCreated: Infinity,
      groupsJoined: Infinity,
      groupStorageBytes: 5 * GB,
      vaultStorageBytes: 20 * GB,
      vaultFolders: Infinity,
      vaultMocksPerMonth: 100,
      pagesPerVaultMock: 150,
    },
    flags: {
      aiExplanations: true,
      fullAnalytics: true,
      topperComparison: true,
      priorityParsing: true,
    },
  },
};
