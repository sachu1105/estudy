import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { RatingSummary } from "@/features/feedback/components/admin/rating-summary";
import { formatWhen } from "@/lib/admin/format";
import { requireAdmin } from "@/server/services/admin";
import { feedbackService } from "@/server/services/feedback";

export const metadata: Metadata = { title: "Feedback · Admin" };

/** How people rate the app, and the notes they left with it. */
export default async function AdminFeedback() {
  await requireAdmin("feedback");
  const ratings = await feedbackService.summary();

  return (
    <>
      <PageHeader
        title="Feedback"
        description="How people rate studypods, and what they said with it."
      />
      <RatingSummary
        counts={ratings.counts}
        total={ratings.total}
        average={ratings.average}
        recent={ratings.recent.map((r) => ({
          stars: r.stars,
          note: r.note,
          by: r.user.displayName,
          when: formatWhen(r.updatedAt),
        }))}
      />
    </>
  );
}
