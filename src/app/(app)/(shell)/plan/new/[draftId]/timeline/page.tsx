import type { Metadata } from "next";

import { TimelineStep } from "@/features/plans/components/timeline-step";
import { loadDraft } from "@/features/plans/load-draft";

export const metadata: Metadata = { title: "Exam date · Create study plan" };

export default async function TimelinePage({
  params,
}: PageProps<"/plan/new/[draftId]/timeline">) {
  const draft = await loadDraft((await params).draftId);
  return (
    <TimelineStep draftId={draft.id} initial={draft.data} today={draft.today} />
  );
}
