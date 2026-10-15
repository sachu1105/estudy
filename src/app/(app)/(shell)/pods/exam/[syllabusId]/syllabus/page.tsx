import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { loadExam } from "@/features/pods/load-exam";
import { RereadNote } from "@/features/syllabus/components/reread-note";
import { SyllabusEditor } from "@/features/syllabus/components/syllabus-editor";
import { toEditableTree } from "@/features/syllabus/to-tree";
import { canReadAgain, reviewService } from "@/server/services/syllabus";

export const metadata: Metadata = { title: "Syllabus" };

/**
 * The user's own syllabus, edited inside its exam pod. Changes save as they're made and
 * the subject pods follow; ticks and material are kept (catalogue syllabuses have no tab).
 */
export default async function ExamSyllabusPage({
  params,
}: PageProps<"/pods/exam/[syllabusId]/syllabus">) {
  const { syllabusId } = await params;
  const { user, exam } = await loadExam(syllabusId);
  if (!exam.editable) notFound();
  const version = await reviewService.get(user, exam.id);
  if (!version) notFound();

  return (
    <div className="flex flex-col gap-5">
      {(await canReadAgain(version)) ? (
        <RereadNote versionId={version.id} />
      ) : null}
      <SyllabusEditor
        versionId={version.id}
        initialTree={toEditableTree(version.subjects)}
        sourceText={version.parse?.extractedText ?? ""}
        warnings={version.parse?.warnings ?? []}
      />
    </div>
  );
}
