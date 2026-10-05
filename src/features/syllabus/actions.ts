"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { reviewService, uploadService } from "@/server/services/syllabus";

import {
  pasteTextSchema,
  treeActionSchema,
  versionActionSchema,
  type ActionResult,
} from "./schemas";

// Every action: requireUser() first (rule 9), zod on the input (rule 11), rate limits on
// anything that can start an AI job or write often (rule 13).

const invalid = {
  ok: false,
  error: "Check the highlighted fields and try again.",
} as const;

function firstIssue(error: { issues: { message: string }[] }) {
  return {
    ok: false as const,
    error: error.issues[0]?.message ?? invalid.error,
  };
}

export async function submitPastedTextAction(
  input: unknown,
): Promise<ActionResult<{ versionId: string }>> {
  const user = await requireUser();
  const parsed = pasteTextSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const limited = await rateLimit([["parsePerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  const result = await uploadService.submitText(user, parsed.data);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/syllabus");
  return { ok: true, versionId: result.versionId };
}

export async function saveDraftAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = treeActionSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const limited = await rateLimit([["syllabusSavePerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  const result = await reviewService.saveDraft(
    user,
    parsed.data.versionId,
    parsed.data.tree,
  );
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/syllabus/${parsed.data.versionId}`, "layout");
  return { ok: true };
}

export async function confirmSyllabusAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = treeActionSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const result = await reviewService.confirm(
    user,
    parsed.data.versionId,
    parsed.data.tree,
  );
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/syllabus");
  return { ok: true };
}

/** Reads the syllabus again with the latest parser; the user confirmed losing edits. */
export async function rereadSyllabusAction(
  input: unknown,
): Promise<ActionResult<{ jobId: string }>> {
  const user = await requireUser();
  const parsed = versionActionSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const limited = await rateLimit([["parsePerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  const result = await reviewService.reread(user, parsed.data.versionId);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/syllabus/${parsed.data.versionId}`);
  return { ok: true, jobId: result.jobId };
}

export async function retryParseAction(
  input: unknown,
): Promise<ActionResult<{ jobId: string }>> {
  const user = await requireUser();
  const parsed = versionActionSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const limited = await rateLimit([["parsePerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  const result = await reviewService.retry(user, parsed.data.versionId);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/syllabus/${parsed.data.versionId}`);
  return { ok: true, jobId: result.jobId };
}

export async function deleteSyllabusAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = versionActionSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const result = await reviewService.remove(user, parsed.data.versionId);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/syllabus");
  return { ok: true };
}
