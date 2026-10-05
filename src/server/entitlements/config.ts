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
  | "groupStorageBytes";

export type FlagFeature =
  "aiExplanations" | "fullAnalytics" | "topperComparison" | "priorityParsing";

export type Feature = LimitFeature | FlagFeature;

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
    },
    flags: {
      aiExplanations: true,
      fullAnalytics: true,
      topperComparison: true,
      priorityParsing: true,
    },
  },
};
