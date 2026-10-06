"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { planService, type GenerateOutcome } from "@/server/services/plans";

import {
  generateSchema,
  saveDraftSchema,
  startPlanSchema,
  type ActionResult,
} from "./schemas";

// requireUser() first (rule 9), zod on every input (rule 11), rate limited (rule 13).

const invalid = {
  ok: false,
  error: "That didn't work. Refresh and try again.",
} as const;

async function limited(
  rule: "planDraftPerUser" | "planGeneratePerUser",
  userId: string,
) {
  const result = await rateLimit([[rule, userId]]);
  return result.ok
    ? null
    : { ok: false as const, error: retryMessage(result.retryAfterMs) };
}

/** Opens the exam's plan setup (or the saved one) and says where it is. */
export async function startPlanAction(
  input: unknown,
): Promise<ActionResult<{ draftId: string }>> {
  const user = await requireUser();
  const parsed = startPlanSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited("planDraftPerUser", user.id);
  if (blocked) return blocked;
  const result = await planService.startDraft(user, parsed.data.syllabusId);
  return result.ok
    ? { ok: true, draftId: result.draftId }
    : { ok: false, error: result.message };
}

/** Autosave for every step: the whole setup each time. */
export async function savePlanDraftAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = saveDraftSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  const blocked = await limited("planDraftPerUser", user.id);
  if (blocked) return blocked;
  const result = await planService.saveDraft(
    user,
    parsed.data.draftId,
    parsed.data.data,
  );
  return result.ok ? { ok: true } : { ok: false, error: result.message };
}

export async function generatePlanAction(
  input: unknown,
): Promise<ActionResult<GenerateOutcome>> {
  const user = await requireUser();
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited("planGeneratePerUser", user.id);
  if (blocked) return blocked;
  const result = await planService.generate(
    user,
    parsed.data.draftId,
    parsed.data.fit,
  );
  if (!result.ok) return { ok: false, error: result.message };
  if (result.outcome === "PLAN") {
    revalidatePath("/plan", "layout");
    revalidatePath("/pods", "layout");
  }
  return result;
}

// ---- Re-plans and hand edits (milestone 7). Each re-makes the plan, so each returns
// the new plan's id for the page to move to.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const editSchema = z.object({
  taskId: z.uuid(),
  edit: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("MOVE"), date: isoDate }),
    z.object({
      kind: z.literal("RESIZE"),
      minutes: z.number().int().min(5).max(600),
    }),
    z.object({ kind: z.literal("LOCK") }),
  ]),
});
const customSchema = z.object({
  syllabusId: z.uuid(),
  date: isoDate,
  minutes: z.number().int().min(5).max(600),
  title: z.string().trim().min(1, "Give the task a name.").max(120),
});

type Replanned = ActionResult<{ planId: string | null; warning: boolean }>;

function replanned(
  result: Awaited<ReturnType<typeof planService.replan>>,
): Replanned {
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/plan", "layout");
  revalidatePath("/today");
  return "planId" in result
    ? { ok: true, planId: result.planId, warning: false }
    : { ok: true, planId: null, warning: true };
}

export async function replanAction(input: unknown): Promise<Replanned> {
  const user = await requireUser();
  const parsed = startPlanSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited("planGeneratePerUser", user.id);
  if (blocked) return blocked;
  return replanned(await planService.replan(user, parsed.data.syllabusId));
}

export async function editTaskAction(input: unknown): Promise<Replanned> {
  const user = await requireUser();
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited("planGeneratePerUser", user.id);
  if (blocked) return blocked;
  return replanned(
    await planService.editTask(user, parsed.data.taskId, parsed.data.edit),
  );
}

export async function resetTaskAction(input: unknown): Promise<Replanned> {
  const user = await requireUser();
  const parsed = z.object({ taskId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited("planGeneratePerUser", user.id);
  if (blocked) return blocked;
  return replanned(await planService.resetTask(user, parsed.data.taskId));
}

export async function addCustomTaskAction(input: unknown): Promise<Replanned> {
  const user = await requireUser();
  const parsed = customSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  const blocked = await limited("planGeneratePerUser", user.id);
  if (blocked) return blocked;
  const { syllabusId, ...task } = parsed.data;
  return replanned(await planService.addCustomTask(user, syllabusId, task));
}

export async function dismissDiffAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ planId: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid;
  await planService.dismissDiff(user, parsed.data.planId);
  revalidatePath("/plan", "layout");
  revalidatePath("/today");
  return { ok: true };
}
