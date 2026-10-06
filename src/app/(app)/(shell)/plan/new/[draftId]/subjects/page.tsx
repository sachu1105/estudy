import type { Metadata } from "next";

import { SubjectsStep } from "@/features/plans/components/subjects-step";
import { loadDraft } from "@/features/plans/load-draft";

export const metadata: Metadata = { title: "Subjects · Create study plan" };

export default async function SubjectsPage({
  params,
}: PageProps<"/plan/new/[draftId]/subjects">) {
  const draft = await loadDraft((await params).draftId);
  return (
    <SubjectsStep
      draftId={draft.id}
      syllabusId={draft.syllabus.id}
      initial={draft.data}
      today={draft.today}
      subjects={draft.subjects.map((s) => ({
        id: s.subjectId,
        name: s.name,
        stage: s.stage,
        topics: s.topics.map((t) => ({
          weight: t.weight,
          difficulty: t.difficulty,
          done: t.done,
        })),
      }))}
    />
  );
}
