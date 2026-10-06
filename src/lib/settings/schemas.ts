// Runtime settings an admin edits (milestone 15). Shared by the admin forms and the
// server that reads them; every stored value is parsed with these on read (rule 11).

import { z } from "zod";

export const PLAN_NAMES = ["FREE", "PRO", "ELITE"] as const;

export const LIMIT_FEATURES = [
  "syllabusUploads",
  "activePlans",
  "afterTaskMocksPerDay",
  "sectionMocksPerWeek",
  "groupsCreated",
  "groupsJoined",
  "groupStorageBytes",
  "vaultStorageBytes",
  "vaultFolders",
  "vaultMocksPerMonth",
  "pagesPerVaultMock",
] as const;

export const FLAG_FEATURES = [
  "aiExplanations",
  "fullAnalytics",
  "topperComparison",
  "priorityParsing",
] as const;

/** null means unlimited (JSON has no Infinity). */
const limitValue = z.number().int().min(0).max(1e13).nullable();

/** Changes over the built-in plans table; anything left out keeps its default. */
export const entitlementOverridesSchema = z.partialRecord(
  z.enum(PLAN_NAMES),
  z.object({
    limits: z.partialRecord(z.enum(LIMIT_FEATURES), limitValue).default({}),
    flags: z.partialRecord(z.enum(FLAG_FEATURES), z.boolean()).default({}),
  }),
);

export const billingSchema = z.object({ enabled: z.boolean() });

export const announcementSchema = z.object({
  active: z.boolean(),
  text: z.string().trim().max(200),
  tone: z.enum(["info", "important"]),
});

export const maintenanceSchema = z.object({
  on: z.boolean(),
  message: z.string().trim().max(300),
});

/** Switches for parts of the app an admin may need to turn off in a hurry. */
export const FEATURE_FLAGS = {
  syllabusUploads: "New syllabus uploads",
  weeklyReplan: "Sunday re-plan for everyone",
  linkPreviews: "Fetching link previews",
} as const;
export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const featureFlagsSchema = z.partialRecord(
  z.enum(Object.keys(FEATURE_FLAGS) as [FeatureFlag, ...FeatureFlag[]]),
  z.boolean(),
);

export const settingSchemas = {
  entitlements: entitlementOverridesSchema,
  billing: billingSchema,
  announcement: announcementSchema,
  maintenance: maintenanceSchema,
  flags: featureFlagsSchema,
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<
  (typeof settingSchemas)[K]
>;
