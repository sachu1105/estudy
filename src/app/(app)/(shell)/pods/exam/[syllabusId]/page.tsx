import type { Metadata } from "next";

import { PodBoard } from "@/features/pods/components/pod-board";
import { loadExam } from "@/features/pods/load-exam";
import { toBoard, POD_STAGES, type Board } from "@/lib/pods/stages";

export const metadata: Metadata = { title: "Exam" };

/** The exam's subjects as a board. The plan reads the board's order. */
export default async function ExamSubjectsPage({
  params,
}: PageProps<"/pods/exam/[syllabusId]">) {
  const { syllabusId } = await params;
  const { exam } = await loadExam(syllabusId);
  const columns = toBoard(exam.pods);
  const board = Object.fromEntries(
    POD_STAGES.map((s) => [s, columns[s].map((p) => p.id)]),
  ) as Board;

  return (
    <section aria-label="Subjects" className="flex flex-col gap-3">
      <p className="text-small text-ink-muted">
        Drag subjects between columns, or use a subject&apos;s menu. Your plan
        follows the board.
      </p>
      <PodBoard
        syllabusId={exam.id}
        pods={exam.pods.map((p) => ({
          id: p.id,
          name: p.name,
          topics: p.topics.length,
          topicsDone: p.topicsDone,
          items: p.items,
        }))}
        initialBoard={board}
      />
    </section>
  );
}
