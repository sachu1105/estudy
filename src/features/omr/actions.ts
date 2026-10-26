"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { OMR_QUESTIONS } from "@/lib/omr/marks";
import { MAX_LIMIT_MIN, type TimerView } from "@/lib/omr/timer";
import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { omrService } from "@/server/services/omr";

// requireUser() first (rule 9), zod on input (rule 11), rate limited (rule 13).

type Done = { ok: true } | { ok: false; error: string };
const invalid = {
  ok: false as const,
  error: "That didn't work. Refresh and try again.",
};
const missing = {
  ok: false as const,
  error: "That paper doesn't exist or isn't yours.",
};

async function limited(userId: string) {
  const result = await rateLimit([["podWritePerUser", userId]]);
  return result.ok
    ? null
    : { ok: false as const, error: retryMessage(result.retryAfterMs) };
}

/** The whole sheet, saved as the user marks it. */
export async function saveMarksAction(input: unknown): Promise<Done> {
  const user = await requireUser();
  const parsed = z
    .object({
      id: z.uuid(),
      marks: z.array(z.int().min(-1).max(3)).length(OMR_QUESTIONS),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const saved = await omrService.saveMarks(
    user,
    parsed.data.id,
    parsed.data.marks,
  );
  return saved ? { ok: true } : missing;
}

const timerSchema = z.object({
  id: z.uuid(),
  timer: z.discriminatedUnion("op", [
    z.object({
      op: z.literal("start"),
      limitMin: z.int().min(1).max(MAX_LIMIT_MIN).nullable(),
    }),
    z.object({ op: z.literal("reset") }),
  ]),
});

/** Start or reset the sheet's timer; returns it as the server sees it. */
export async function timerAction(
  input: unknown,
): Promise<{ ok: true; timer: TimerView } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = timerSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const timer = await omrService.timer(user, parsed.data.id, parsed.data.timer);
  return timer ? { ok: true, timer } : missing;
}

export async function renameSheetAction(input: unknown): Promise<Done> {
  const user = await requireUser();
  const parsed = z
    .object({ id: z.uuid(), title: z.string().trim().min(1).max(120) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Give the paper a name." };
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const done = await omrService.rename(user, parsed.data.id, parsed.data.title);
  if (!done) return missing;
  revalidatePath("/tests");
  return { ok: true };
}

/** The paper and its marks, gone for good. */
export async function deleteSheetAction(input: unknown): Promise<Done> {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const done = await omrService.remove(user, parsed.data.id);
  if (!done) return missing;
  revalidatePath("/tests");
  return { ok: true };
}
