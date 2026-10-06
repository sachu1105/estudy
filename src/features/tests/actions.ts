"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { testService } from "@/server/services/tests";

// requireUser() first (rule 9), zod on input (rule 11), rate limited (rule 13).

type Started = { ok: true; testId: string } | { ok: false; error: string };
const invalid = {
  ok: false as const,
  error: "That didn't work. Refresh and try again.",
};

async function limited(userId: string) {
  const result = await rateLimit([["testPerUser", userId]]);
  return result.ok
    ? null
    : { ok: false as const, error: retryMessage(result.retryAfterMs) };
}

const started = (
  r: { ok: true; testId: string } | { ok: false; message: string },
): Started =>
  r.ok ? { ok: true, testId: r.testId } : { ok: false, error: r.message };

async function start(
  kind: "task" | "topic" | "subject" | "exam",
  input: unknown,
): Promise<Started> {
  const user = await requireUser();
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const { id } = parsed.data;
  switch (kind) {
    case "task":
      return started(await testService.startForTask(user, id));
    case "topic":
      return started(await testService.practiceTopic(user, id));
    case "subject":
      return started(await testService.sectionMock(user, id));
    case "exam":
      return started(await testService.fullMock(user, id));
  }
}

/** A plan task's check test or mock (resumed if already open). */
export async function startTaskTestAction(input: unknown) {
  return start("task", input);
}
/** Five questions on one topic, outside the plan. */
export async function practiceTopicAction(input: unknown) {
  return start("topic", input);
}
export async function sectionMockAction(input: unknown) {
  return start("subject", input);
}
export async function fullMockAction(input: unknown) {
  return start("exam", input);
}

const answersSchema = z
  .array(
    z.object({
      questionId: z.uuid(),
      chosenIndex: z.number().int().min(0).max(3).nullable(),
      flagged: z.boolean(),
    }),
  )
  .max(200);

/** Scoring happens here, on the server, never in the browser (milestone 8). */
export async function submitTestAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = z
    .object({ testId: z.uuid(), answers: answersSchema })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const result = await testService.submit(
    user,
    parsed.data.testId,
    parsed.data.answers,
  );
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/today");
  revalidatePath("/tests", "layout");
  revalidatePath("/pods", "layout");
  return { ok: true };
}

export async function reportQuestionAction(
  input: unknown,
): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = z
    .object({
      questionId: z.uuid(),
      reason: z.enum(["WRONG_ANSWER", "UNCLEAR", "TYPO", "OTHER"]),
      note: z.string().trim().max(500).nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return invalid;
  const blocked = await limited(user.id);
  if (blocked) return blocked;
  const { questionId, reason, note } = parsed.data;
  const result = await testService.report(
    user,
    questionId,
    reason,
    note || null,
  );
  return result.ok
    ? { ok: true, already: result.already }
    : { ok: false, error: result.message };
}
