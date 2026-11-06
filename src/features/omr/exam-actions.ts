"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MAX_QUESTIONS, OPTION_LETTERS } from "@/lib/omr/marks";
import type { TimerView } from "@/lib/omr/timer";
import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage, type RuleName } from "@/server/ratelimit";
import { examService } from "@/server/services/omr";

// A squad exam's one ranked sitting, and running the exam. requireUser() first (rule 9),
// zod on input (rule 11), rate limited (rule 13); the service checks the squad and channel.

type Failed = { ok: false; error: string };

async function guard<S extends z.ZodType>(
  input: unknown,
  schema: S,
  rule: RuleName,
) {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      fail: {
        ok: false,
        error: "That didn't work. Refresh and try again.",
      } as Failed,
    };
  const limited = await rateLimit([[rule, user.id]]);
  if (!limited.ok)
    return {
      fail: { ok: false, error: retryMessage(limited.retryAfterMs) } as Failed,
    };
  return { fail: null, user, data: parsed.data as z.infer<S> };
}

const exam = { id: z.uuid() };

/** Start the sitting's clock: once, for good. */
export async function startExamAction(
  input: unknown,
): Promise<{ ok: true; timer: TimerView } | Failed> {
  const g = await guard(input, z.object(exam), "testPerUser");
  if (g.fail) return g.fail;
  const result = await examService.start(g.user, g.data.id);
  return result.ok ? result : { ok: false, error: result.message };
}

/** The sheet, saved as it's marked. */
export async function saveExamMarksAction(
  input: unknown,
): Promise<{ ok: true } | Failed> {
  const g = await guard(
    input,
    z.object({
      ...exam,
      marks: z
        .array(
          z
            .int()
            .min(-1)
            .max(OPTION_LETTERS.length - 1),
        )
        .min(1)
        .max(MAX_QUESTIONS),
    }),
    "podWritePerUser",
  );
  if (g.fail) return g.fail;
  const result = await examService.saveMarks(g.user, g.data.id, g.data.marks);
  return result.ok ? { ok: true } : { ok: false, error: result.message };
}

/** Hand the sitting in, for the rank list. */
export async function submitExamAction(
  input: unknown,
): Promise<{ ok: true; submissionId: string } | Failed> {
  const g = await guard(input, z.object(exam), "testPerUser");
  if (g.fail) return g.fail;
  const result = await examService.submit(g.user, g.data.id);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/exams/${g.data.id}`);
  return result;
}

/** Whoever shared it: results out now, names on the list, or stop sharing. */
export async function manageExamAction(
  input: unknown,
): Promise<{ ok: true } | Failed> {
  const g = await guard(
    input,
    z.object({
      ...exam,
      change: z.discriminatedUnion("op", [
        z.object({ op: z.literal("publish") }),
        z.object({ op: z.literal("names"), show: z.boolean() }),
        z.object({ op: z.literal("stop") }),
      ]),
    }),
    "groupPerUser",
  );
  if (g.fail) return g.fail;
  const result = await examService.manage(g.user, g.data.id, g.data.change);
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/exams/${g.data.id}`);
  revalidatePath("/tests");
  return { ok: true };
}
