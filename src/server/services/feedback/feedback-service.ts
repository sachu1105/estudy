import type { Clock } from "@/lib/clock";
import type { RatingInput } from "@/lib/feedback/schemas";
import type { FeedbackRepository } from "@/server/repositories/feedback-repository";

export type FeedbackDeps = {
  feedback: Pick<FeedbackRepository, "ratingOf" | "rate" | "ratingSummary">;
  clock: Clock;
};

type Viewer = { id: string };

/** Rating the app: one rating per person, changeable, and the summary staff read. */
export function createFeedbackService(deps: FeedbackDeps) {
  return {
    /** The person's own rating, to fill the modal, or null before they've rated. */
    async mine(viewer: Viewer) {
      const rating = await deps.feedback.ratingOf(viewer.id);
      return rating && { stars: rating.stars, note: rating.note ?? "" };
    },

    async rate(viewer: Viewer, input: RatingInput) {
      await deps.feedback.rate(viewer.id, input, deps.clock.now());
      return { ok: true as const };
    },

    /** The average, how the stars spread, and the latest notes. */
    async summary() {
      const { groups, recent } = await deps.feedback.ratingSummary();
      const counts = [1, 2, 3, 4, 5].map(
        (stars) => groups.find((g) => g.stars === stars)?._count._all ?? 0,
      );
      const total = counts.reduce((a, b) => a + b, 0);
      const average = total
        ? counts.reduce((sum, n, i) => sum + n * (i + 1), 0) / total
        : null;
      return { counts, total, average, recent };
    },
  };
}
