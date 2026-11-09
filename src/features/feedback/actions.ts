"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ideaDecisionSchema,
  ideaSchema,
  problemDecisionSchema,
  problemSchema,
  ratingSchema,
} from "@/lib/feedback/schemas";
import { requestMeta, requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage, type RuleName } from "@/server/ratelimit";
import { requireAdmin } from "@/server/services/admin";
import { feedbackService } from "@/server/services/feedback";

// Feedback. Every action: requireUser() or requireAdmin() first (rule 9), zod on input
// (rule 11), and the people's side rate limited (rule 13).

export type FeedbackResult<T = object> =
  ({ ok: true } & T) | { ok: false; error: string };

const PAGE = "/feedback";

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check it and try again.";
}

async function guard<S extends z.ZodType>(
  input: unknown,
  schema: S,
  rule: RuleName,
) {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { fail: { ok: false as const, error: firstIssue(parsed.error) } };
  const limited = await rateLimit([[rule, user.id]]);
  if (!limited.ok)
    return {
      fail: { ok: false as const, error: retryMessage(limited.retryAfterMs) },
    };
  return { fail: null, user, data: parsed.data as z.infer<S> };
}

function out<T extends object>(
  result: ({ ok: true } & T) | { ok: false; message: string },
  ...paths: string[]
): FeedbackResult<T> {
  if (!result.ok) return { ok: false, error: result.message };
  for (const path of paths) revalidatePath(path);
  return result;
}

export async function rateAppAction(input: unknown): Promise<FeedbackResult> {
  const g = await guard(input, ratingSchema, "feedbackPerUser");
  if (g.fail) return g.fail;
  return out(await feedbackService.rate(g.user, g.data), PAGE);
}

export async function suggestIdeaAction(
  input: unknown,
): Promise<FeedbackResult<{ id: string }>> {
  const g = await guard(input, ideaSchema, "feedbackPerUser");
  if (g.fail) return g.fail;
  return out(await feedbackService.suggest(g.user, g.data), PAGE);
}

export async function voteIdeaAction(
  input: unknown,
): Promise<FeedbackResult<{ votes: number }>> {
  const g = await guard(
    input,
    z.object({ id: z.uuid(), on: z.boolean() }),
    "reactPerUser",
  );
  if (g.fail) return g.fail;
  // No revalidate: the button already shows the new count, and the page reads it fresh.
  return out(await feedbackService.vote(g.user, g.data.id, g.data.on));
}

export async function reportProblemAction(
  input: unknown,
): Promise<FeedbackResult<{ id: string }>> {
  const g = await guard(input, problemSchema, "feedbackPerUser");
  if (g.fail) return g.fail;
  const { userAgent } = await requestMeta();
  return out(await feedbackService.report(g.user, g.data, userAgent), PAGE);
}

// ---- Staff (Admin > Feedback) -------------------------------------------------------

const ADMIN_PAGE = "/admin/feedback";

export async function postTeamIdeaAction(
  input: unknown,
): Promise<FeedbackResult<{ id: string }>> {
  const staff = await requireAdmin("feedback");
  const parsed = ideaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return out(
    await feedbackService.postTeamIdea(staff, parsed.data),
    ADMIN_PAGE,
    PAGE,
  );
}

export async function decideIdeaAction(
  input: unknown,
): Promise<FeedbackResult> {
  const staff = await requireAdmin("feedback");
  const parsed = ideaDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return out(
    await feedbackService.decideIdea(staff, parsed.data),
    ADMIN_PAGE,
    PAGE,
  );
}

export async function decideProblemAction(
  input: unknown,
): Promise<FeedbackResult> {
  const staff = await requireAdmin("feedback");
  const parsed = problemDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return out(
    await feedbackService.decideProblem(staff, parsed.data),
    ADMIN_PAGE,
    PAGE,
  );
}
