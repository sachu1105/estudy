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
  "squadMembers",
  "channelsPerSquad",
  "vaultStorageBytes",
  "vaultFolders",
  "vaultMocksPerMonth",
  "pagesPerVaultMock",
] as const;

export const FLAG_FEATURES = [
  "aiExplanations",
  "priorityParsing",
  "sellInSquads",
  "verifiedBadge",
] as const;

/** null means unlimited (JSON has no Infinity). */
const limitValue = z.number().int().min(0).max(1e13).nullable();

/** Changes over the built-in plans table; anything left out keeps its default. */
export const entitlementOverridesSchema = z.partialRecord(
  z.enum(PLAN_NAMES),
  z.object({
    limits: z.partialRecord(z.enum(LIMIT_FEATURES), limitValue).default({}),
    // Flags saved before a feature was removed (analytics) are dropped, not rejected.
    flags: z
      .preprocess(
        (v) =>
          v && typeof v === "object"
            ? Object.fromEntries(
                Object.entries(v).filter(([k]) =>
                  (FLAG_FEATURES as readonly string[]).includes(k),
                ),
              )
            : v,
        z.partialRecord(z.enum(FLAG_FEATURES), z.boolean()),
      )
      .default({}),
  }),
);

export const billingSchema = z.object({ enabled: z.boolean() });

/**
 * What a paid plan costs a month (paise) and the Razorpay plan that charges it. Left out,
 * a plan keeps its built-in price and the env plan id. Razorpay charges what its own plan
 * says, so a new price comes with a new Razorpay plan id.
 */
export const PAID_PLAN_NAMES = ["PRO", "ELITE"] as const;
export const planPricesSchema = z.partialRecord(
  z.enum(PAID_PLAN_NAMES),
  z.object({
    pricePaise: z.number().int().min(100).max(10_000_000),
    /** "" = the env RAZORPAY_PLAN_* id. */
    razorpayPlanId: z
      .string()
      .trim()
      .regex(/^(plan_[A-Za-z0-9]{1,40})?$/),
  }),
);

/** The plan the pricing cards lift up as the one to pick. */
export const featuredPlanSchema = z.object({ plan: z.enum(PLAN_NAMES) });

export const announcementSchema = z.object({
  active: z.boolean(),
  text: z.string().trim().max(200),
  tone: z.enum(["info", "important"]),
});

/**
 * Paid squads and channels. Off by default: nobody is offered a price field until an
 * admin turns it on. Off again, sales pause; everyone who paid keeps what they paid for.
 */
export const paidSquadsSchema = z.object({ enabled: z.boolean() });

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

/**
 * The four jobs AI may do (CLAUDE.md rule 17). `built` is false until the feature exists;
 * its switch is shown, disabled, so the admin sees what is coming.
 */
export const AI_JOBS = {
  syllabus: { label: "Reading syllabuses", built: true },
  questions: { label: "Writing mock test questions", built: false },
  pyq: { label: "Parsing previous year papers", built: false },
  suggestions: { label: "Suggesting notes and websites", built: false },
} as const;
export type AiJob = keyof typeof AI_JOBS;
const aiJobNames = Object.keys(AI_JOBS) as [AiJob, ...AiJob[]];

/**
 * The AI master switch. Off by default: syllabuses are read by headings and lists (no
 * model), and every other part of the app runs on plain algorithms anyway. While it is
 * on, each job can still be turned off by itself (jobs default to on).
 */
export const aiSettingSchema = z.object({
  enabled: z.boolean(),
  jobs: z.partialRecord(z.enum(aiJobNames), z.boolean()).default({}),
});

export const AI_PROVIDERS = {
  anthropic: {
    label: "Claude (Anthropic)",
    readsDocuments: true,
    needsKey: true,
    defaultUrl: "https://api.anthropic.com",
  },
  openai: {
    label: "OpenAI-compatible",
    readsDocuments: false,
    needsKey: true,
    defaultUrl: "https://api.openai.com/v1",
  },
  ollama: {
    label: "Ollama (local)",
    readsDocuments: false,
    needsKey: false,
    defaultUrl: "http://127.0.0.1:11434",
  },
} as const;
export type AiProviderKind = keyof typeof AI_PROVIDERS;

/**
 * Which model the AI jobs call. The API key is stored only sealed (AES-GCM, see
 * server/crypto/secret-box) with a short hint for the admin; it is never sent to a
 * browser, not even to the admin who saved it (rule 1).
 */
export const aiProviderSchema = z.object({
  kind: z.enum(
    Object.keys(AI_PROVIDERS) as [AiProviderKind, ...AiProviderKind[]],
  ),
  model: z.string().trim().min(1).max(200),
  baseUrl: z.url().max(500).nullable(),
  priceInputPerMTok: z.number().min(0).max(10_000),
  priceOutputPerMTok: z.number().min(0).max(10_000),
  apiKey: z
    .object({ sealed: z.string().min(1), hint: z.string().max(20) })
    .nullable(),
});

/** The instructions (system prompt) each AI task runs with. Left out = the built-in one. */
export const AI_PROMPTS = {
  structureSyllabus: {
    label: "Reading a syllabus from its text",
    job: "syllabus",
  },
  structureDocument: {
    label: "Reading a syllabus from PDF pages or a photo",
    job: "syllabus",
  },
} as const satisfies Record<string, { label: string; job: AiJob }>;
export type AiPromptKey = keyof typeof AI_PROMPTS;

export const aiPromptsSchema = z.partialRecord(
  z.enum(Object.keys(AI_PROMPTS) as [AiPromptKey, ...AiPromptKey[]]),
  z.string().trim().min(20).max(20_000),
);

export const settingSchemas = {
  entitlements: entitlementOverridesSchema,
  billing: billingSchema,
  featuredPlan: featuredPlanSchema,
  planPrices: planPricesSchema,
  announcement: announcementSchema,
  maintenance: maintenanceSchema,
  flags: featureFlagsSchema,
  ai: aiSettingSchema,
  paidSquads: paidSquadsSchema,
  aiProvider: aiProviderSchema,
  aiPrompts: aiPromptsSchema,
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<
  (typeof settingSchemas)[K]
>;
