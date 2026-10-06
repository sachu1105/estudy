import type { Metadata } from "next";

import { TimeStep } from "@/features/plans/components/time-step";
import { loadDraft } from "@/features/plans/load-draft";

export const metadata: Metadata = { title: "Your time · Create study plan" };

export default async function TimePage({
  params,
}: PageProps<"/plan/new/[draftId]/time">) {
  const draft = await loadDraft((await params).draftId);
  return (
    <TimeStep draftId={draft.id} initial={draft.data} today={draft.today} />
  );
}
