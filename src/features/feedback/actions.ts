"use server";

import { ratingSchema } from "@/lib/feedback/schemas";
import { requireUser } from "@/server/auth/session";
import { rateLimit, retryMessage } from "@/server/ratelimit";
import { feedbackService } from "@/server/services/feedback";

// Rating the app, from the feedback modal. requireUser() first (rule 9), zod on input
// (rule 11), rate limited (rule 13).

export type FeedbackResult = { ok: true } | { ok: false; error: string };

/** The person's own rating, read when the modal opens. */
export async function myRatingAction() {
  const user = await requireUser();
  return feedbackService.mine(user);
}

export async function rateAppAction(input: unknown): Promise<FeedbackResult> {
  const user = await requireUser();
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check it and try again.",
    };
  const limited = await rateLimit([["feedbackPerUser", user.id]]);
  if (!limited.ok)
    return { ok: false, error: retryMessage(limited.retryAfterMs) };
  return feedbackService.rate(user, parsed.data);
}
