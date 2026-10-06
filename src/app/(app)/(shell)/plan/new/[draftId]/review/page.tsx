import type { Metadata } from "next";

import { ReviewStep } from "@/features/plans/components/review-step";
import { loadDraft } from "@/features/plans/load-draft";

export const metadata: Metadata = { title: "Review · Create study plan" };

export default async function ReviewPage({
  params,
}: PageProps<"/plan/new/[draftId]/review">) {
  const draft = await loadDraft((await params).draftId);
  return (
    <ReviewStep
      draftId={draft.id}
      initial={draft.data}
      today={draft.today}
      subjects={draft.subjects.length}
    />
  );
}
