"use server";

import { revalidatePath } from "next/cache";

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
