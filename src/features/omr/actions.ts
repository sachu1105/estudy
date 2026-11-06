"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseFraction } from "@/lib/omr/fraction";
import { CANCELLED } from "@/lib/omr/key";
import {
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  OPTION_COUNTS,
  OPTION_LETTERS,
} from "@/lib/omr/marks";
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
      // The service cuts it to the paper's own shape.
      marks: z
        .array(
          z
            .int()
            .min(-1)
            .max(OPTION_LETTERS.length - 1),
        )
        .min(1)
        .max(MAX_QUESTIONS),
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

/** A mark typed as "1", "0.25" or "1/3". */
const mark = (message: string) =>
  z.string().transform((text, ctx) => {
    const value = parseFraction(text);
    if (value === null) ctx.addIssue({ code: "custom", message });
    return value ?? z.NEVER;
  });

const settingsSchema = z.object({
  id: z.uuid(),
  questionCount: z.int().min(MIN_QUESTIONS).max(MAX_QUESTIONS),
  optionCount: z.union(OPTION_COUNTS.map((n) => z.literal(n))),
  right: mark("Write the mark for a right answer as 1, 0.5 or 1/3."),
  wrong: mark("Write what a wrong answer costs as 0, 0.25 or 1/3."),
  cutoff: mark("Write the cut-off as a number, like 45 or 42.67.").nullable(),
  limitMin: z.int().min(1).max(MAX_LIMIT_MIN).nullable(),
  cancelRule: z.enum(["AWARD", "SCALE"]),
});

/** How the paper is marked: its shape, the marks, the cut-off and the time. */
export async function savePaperSettingsAction(input: unknown): Promise<Done> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? invalid.error,
    };
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const { id, ...settings } = parsed.data;
  const result = await omrService.saveSettings(user, id, settings);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/omr/${id}`, "layout");
  revalidatePath("/tests");
  return { ok: true };
}

/** The answer key, saved as it's filled in. */
export async function saveKeyAction(input: unknown): Promise<Done> {
  const user = await requireUser();
  const parsed = z
    .object({
      id: z.uuid(),
      answerKey: z
        .array(
          z
            .int()
            .min(CANCELLED)
            .max((1 << OPTION_LETTERS.length) - 1),
        )
        .min(1)
        .max(MAX_QUESTIONS),
      source: z.enum(["OWN", "OFFICIAL"]),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const { id, ...key } = parsed.data;
  const saved = await omrService.saveKey(user, id, key);
  if (!saved) return missing;
  revalidatePath(`/omr/${id}`, "layout");
  revalidatePath("/tests");
  return { ok: true };
}

/** Hand the sheet in; the page goes on to its result. */
export async function submitSheetAction(
  input: unknown,
): Promise<{ ok: true; submissionId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid;
  const result = await rateLimit([["testPerUser", user.id]]);
  if (!result.ok)
    return { ok: false, error: retryMessage(result.retryAfterMs) };
  const handed = await omrService.submit(user, parsed.data.id);
  if (!handed.ok) return { ok: false, error: handed.message };
  revalidatePath("/tests");
  return { ok: true, submissionId: handed.submissionId };
}
