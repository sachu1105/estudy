"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { noteDocSchema, type DocNode } from "@/lib/notes/doc";
import { itemService, podService } from "@/server/services/pods";

import {
  addLinkSchema,
  addNoteSchema,
  arrangeBoardSchema,
  itemIdSchema,
  itemTopicsSchema,
  newPodSchema,
  podIdSchema,
  renameItemSchema,
  renamePodSchema,
  saveNoteSchema,
  topicDoneSchema,
  adoptSyllabusSchema,
  type ActionResult,
} from "./schemas";

// requireUser() first (rule 9), zod on every input (rule 11), writes rate limited (rule 13).

const invalid = {
  ok: false,
  error: "That didn't work. Refresh and try again.",
} as const;

async function limited(userId: string) {
  const result = await rateLimit([["podWritePerUser", userId]]);
  return result.ok
    ? null
    : { ok: false as const, error: retryMessage(result.retryAfterMs) };
}

export async function setTopicDoneAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = topicDoneSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const { podId, topicId, done } = parsed.data;
  const result = await podService.setTopicDone(user, podId, topicId, done);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}

/** A drag on the exam board: saves every column's order in one go. */
export async function arrangeBoardAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = arrangeBoardSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const { syllabusId, board } = parsed.data;
  const result = await podService.arrangeBoard(user, syllabusId, board);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}

export async function createPodAction(
  input: unknown,
): Promise<ActionResult<{ podId: string }>> {
  const user = await requireUser();
  const parsed = newPodSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await podService.createCustom(user, parsed.data.name);
  revalidatePath("/pods");
  return { ok: true, podId: result.podId };
}

export async function renamePodAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = renamePodSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const result = await podService.rename(
    user,
    parsed.data.podId,
    parsed.data.name,
  );
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}

export async function deletePodAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = podIdSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const result = await podService.remove(user, parsed.data.podId);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}

/** "Use this syllabus" from the catalogue: its subjects become the user's pods. */
export async function adoptSyllabusAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = adoptSyllabusSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const result = await podService.syncFromSyllabus(user, parsed.data.versionId);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}

// --- Material: notes, links, mapping to topics, trash ---------------------------------

export async function addNoteAction(
  input: unknown,
): Promise<ActionResult<{ itemId: string }>> {
  const user = await requireUser();
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await itemService.addNote(user, parsed.data);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true, itemId: result.itemId };
}

export async function saveNoteAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = saveNoteSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const doc = noteDocSchema.safeParse(parsed.data.doc);
  if (!doc.success) return { ok: false, error: doc.error.issues[0].message };
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await itemService.saveNote(user, {
    itemId: parsed.data.itemId,
    title: parsed.data.title,
    doc: doc.data as DocNode,
  });
  return result.ok ? { ok: true } : { ok: false, error: result.message };
}

export async function addLinkAction(
  input: unknown,
): Promise<ActionResult<{ itemId: string }>> {
  const user = await requireUser();
  const parsed = addLinkSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await itemService.addLink(user, parsed.data);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true, itemId: result.itemId };
}

export async function renameItemAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = renameItemSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const result = await itemService.rename(
    user,
    parsed.data.itemId,
    parsed.data.title,
  );
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}

export async function setItemTopicsAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = itemTopicsSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await itemService.setTopics(
    user,
    parsed.data.itemId,
    parsed.data.topicIds,
  );
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}

export async function trashItemAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = itemIdSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const result = await itemService.trash(user, parsed.data.itemId);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}

export async function restoreItemAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = itemIdSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const result = await itemService.restore(user, parsed.data.itemId);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/pods", "layout");
  return { ok: true };
}
