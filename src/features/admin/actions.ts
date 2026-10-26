"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { QUEUE_NAMES, adminQueues } from "@/server/queue";
import {
  announcementSchema,
  billingSchema,
  entitlementOverridesSchema,
  featuredPlanSchema,
  AI_PROMPTS,
  AI_PROVIDERS,
  aiSettingSchema,
  featureFlagsSchema,
  maintenanceSchema,
} from "@/lib/settings/schemas";
import { editableTreeSchema } from "@/lib/syllabus/tree";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import {
  adminService,
  aiSettings,
  requireAdmin,
} from "@/server/services/admin";
import { saveSetting } from "@/server/settings";

// Every action: the staff role and area first (rule 9), zod on input (rule 11), and an
// audit row for every change (milestone 15, item 10).

export type AdminResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: string };

const invalid = { ok: false as const, error: "Check the form and try again." };
const done = <T extends object>(
  result: ({ ok: true } & T) | { ok: false; message: string },
  ...paths: string[]
): AdminResult<T> => {
  if (!result.ok) return { ok: false, error: result.message };
  for (const path of paths) revalidatePath(path);
  return result;
};

const reason = z
  .string()
  .trim()
  .min(3, "Give a reason (it goes in the audit log).")
  .max(300);

// ---- Users ---------------------------------------------------------------------

export async function setUserStatusAction(input: unknown) {
  const by = await requireAdmin("users");
  const parsed = z
    .object({
      userId: z.uuid(),
      status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
      reason,
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  const { userId, status } = parsed.data;
  return done(
    await adminService.setStatus(by, userId, status, parsed.data.reason),
    `/admin/users/${userId}`,
  );
}

export async function setUserRoleAction(input: unknown) {
  const by = await requireAdmin("roles");
  const parsed = z
    .object({
      userId: z.uuid(),
      role: z.enum(["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  return done(
    await adminService.setRole(by, parsed.data.userId, parsed.data.role),
    `/admin/users/${parsed.data.userId}`,
  );
}

export async function grantPlanAction(input: unknown) {
  const by = await requireAdmin("users");
  const parsed = z
    .object({
      userId: z.uuid(),
      plan: z.enum(["FREE", "PRO", "ELITE"]),
      months: z.number().int().min(1).max(36).nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const { userId, plan, months } = parsed.data;
  return done(
    await adminService.grantPlan(by, userId, plan, months),
    `/admin/users/${userId}`,
  );
}

export async function resetStreakAction(input: unknown) {
  const by = await requireAdmin("users");
  const parsed = z.object({ userId: z.uuid(), reason }).safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  return done(
    await adminService.resetStreak(by, parsed.data.userId, parsed.data.reason),
    `/admin/users/${parsed.data.userId}`,
  );
}

// ---- Exams and catalogue -------------------------------------------------------

const examSchema = z.object({
  name: z.string().trim().min(2, "Give the exam a name.").max(120),
  board: z.string().trim().min(2, "Name the board, like Kerala PSC.").max(60),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((d) => d || null),
});

export async function saveExamAction(input: unknown) {
  const by = await requireAdmin("exams");
  const parsed = examSchema
    .extend({ id: z.uuid().nullable() })
    .safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  const { id, ...exam } = parsed.data;
  const result = id
    ? await adminService.updateExam(by, id, exam)
    : await adminService.createExam(by, exam);
  return done(result, "/admin/catalogue", "/syllabus/catalogue");
}

export async function deleteExamAction(input: unknown) {
  const by = await requireAdmin("exams");
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: invalid.error };
  const result = await adminService.deleteExam(by, parsed.data.id);
  return done(result, "/admin/catalogue", "/syllabus/catalogue");
}

export async function promoteAction(input: unknown) {
  const by = await requireAdmin("exams");
  const parsed = z
    .object({
      sourceId: z.uuid(),
      title: z.string().trim().min(2, "Give it a title.").max(200),
      examId: z.uuid().nullable(),
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  const { sourceId, ...rest } = parsed.data;
  return done(
    await adminService.promote(by, sourceId, rest),
    "/admin/catalogue",
  );
}

/** Builds a catalogue syllabus from pasted text (read by rules, no AI) or from blank. */
export async function buildSyllabusAction(input: unknown) {
  const by = await requireAdmin("exams");
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Give it a title.").max(200),
      examId: z.uuid("Pick the exam this syllabus is for."),
      text: z
        .string()
        .max(200_000, "That's more text than a syllabus usually has.")
        .nullable(),
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  return done(
    await adminService.buildSyllabus(by, parsed.data),
    "/admin/catalogue",
  );
}

/** The builder's autosave. No audit row per save; building and approving are logged. */
export async function saveCatalogueTreeAction(
  input: unknown,
): Promise<AdminResult> {
  const by = await requireAdmin("exams");
  const parsed = z
    .object({ versionId: z.uuid(), tree: editableTreeSchema })
    .safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  const limited = await rateLimit([["syllabusSavePerUser", by.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  return done(
    await adminService.saveCatalogueTree(
      parsed.data.versionId,
      parsed.data.tree,
    ),
    "/admin/catalogue",
  );
}

export async function reviewAction(input: unknown) {
  const by = await requireAdmin("catalogue");
  const parsed = z
    .object({
      versionId: z.uuid(),
      approve: z.boolean(),
      note: z.string().trim().max(1000).nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const { versionId, ...decision } = parsed.data;
  return done(
    await adminService.review(by, versionId, decision),
    "/admin/catalogue",
    `/admin/catalogue/${versionId}`,
    "/syllabus/catalogue",
    "/admin",
  );
}

// ---- Site settings and plans ---------------------------------------------------

const settings = {
  announcement: { area: "settings", schema: announcementSchema },
  maintenance: { area: "settings", schema: maintenanceSchema },
  flags: { area: "settings", schema: featureFlagsSchema },
  entitlements: { area: "plans", schema: entitlementOverridesSchema },
  billing: { area: "plans", schema: billingSchema },
  featuredPlan: { area: "plans", schema: featuredPlanSchema },
  ai: { area: "ai", schema: aiSettingSchema },
} as const;

export async function saveSettingAction(
  key: keyof typeof settings,
  input: unknown,
): Promise<AdminResult> {
  const entry = settings[key];
  if (!entry) return invalid;
  const by = await requireAdmin(entry.area);
  const parsed = entry.schema.safeParse(input);
  if (!parsed.success) return invalid;
  await saveSetting(key, parsed.data as never, by.id);
  await adminService.logSetting(by, key);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---- Jobs ------------------------------------------------------------------------

export async function jobAction(input: unknown): Promise<AdminResult> {
  const by = await requireAdmin("jobs");
  const parsed = z
    .object({
      queue: z.enum(QUEUE_NAMES),
      jobId: z.string().min(1).max(100),
      action: z.enum(["retry", "discard"]),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const { queue, jobId, action } = parsed.data;
  const ok =
    action === "retry"
      ? await adminQueues.retry(queue, jobId)
      : await adminQueues.discard(queue, jobId);
  if (!ok) return { ok: false, error: "That job is gone already." };
  await adminService.logJob(by, action, queue, jobId);
  revalidatePath("/admin/jobs");
  return { ok: true };
}

// ---- Reports (milestone 13) --------------------------------------------------------

export async function decideReportAction(input: unknown): Promise<AdminResult> {
  const by = await requireAdmin("reports");
  const parsed = z
    .object({
      type: z.enum([
        "GROUP",
        "GROUP_ITEM",
        "GROUP_TEST",
        "USER",
        "POST",
        "REPLY",
        "MESSAGE",
      ]),
      id: z.uuid(),
      hide: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const { type, id, hide } = parsed.data;
  return done(
    await adminService.decideReport(by, type, id, hide),
    "/admin/reports",
    "/admin",
  );
}

// ---- AI (super admins only) -------------------------------------------------------

const price = z.coerce
  .number({ error: "Prices are numbers, in US dollars per million tokens." })
  .min(0)
  .max(10_000);

export async function saveAiProviderAction(
  input: unknown,
): Promise<AdminResult> {
  const by = await requireAdmin("ai");
  const parsed = z
    .object({
      kind: z.enum(
        Object.keys(AI_PROVIDERS) as [
          keyof typeof AI_PROVIDERS,
          ...(keyof typeof AI_PROVIDERS)[],
        ],
      ),
      model: z.string().trim().min(1, "Enter the model name.").max(200),
      baseUrl: z
        .string()
        .trim()
        .max(500)
        .transform((s) => s || null)
        .pipe(z.url("Enter a full URL, starting with https://").nullable()),
      priceInputPerMTok: price,
      priceOutputPerMTok: price,
      apiKey: z.discriminatedUnion("action", [
        z.object({ action: z.literal("keep") }),
        z.object({ action: z.literal("remove") }),
        z.object({
          action: z.literal("replace"),
          value: z
            .string()
            .trim()
            .min(8, "That doesn't look like an API key.")
            .max(500),
        }),
      ]),
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  return done(await aiSettings.saveProvider(by, parsed.data), "/admin/ai");
}

export async function saveAiPromptsAction(
  input: unknown,
): Promise<AdminResult> {
  const by = await requireAdmin("ai");
  const parsed = z
    .partialRecord(
      z.enum(
        Object.keys(AI_PROMPTS) as [
          keyof typeof AI_PROMPTS,
          ...(keyof typeof AI_PROMPTS)[],
        ],
      ),
      z
        .string()
        .max(20_000, "Keep a prompt under 20,000 characters.")
        .nullable(),
    )
    .safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  const short = Object.values(parsed.data).find(
    (text) => text && text.trim().length > 0 && text.trim().length < 20,
  );
  if (short)
    return {
      ok: false,
      error:
        "A prompt that short can't guide the model. Write more, or reset it.",
    };
  return done(await aiSettings.savePrompts(by, parsed.data), "/admin/ai");
}
