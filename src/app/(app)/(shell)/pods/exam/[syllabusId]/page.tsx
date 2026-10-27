import type { Metadata } from "next";

import { PodBoard } from "@/features/pods/components/pod-board";
import { loadExam } from "@/features/pods/load-exam";
import { toBoard, POD_STAGES, type Board } from "@/lib/pods/stages";
import { coverService } from "@/server/services/pods";

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
  const covers = await Promise.all(
    exam.pods.map((p) => coverService.resolve(p.cover, p.id)),
  );

  return (
    <section aria-label="Subjects" className="flex flex-col gap-3">
      <p className="text-small text-ink-muted">
        <span className="lg:hidden">
          Swipe between columns. Hold a subject to drag it up or down, or onto a
          tab to move it there.
        </span>
        <span className="hidden lg:inline">
          Drag subjects between columns, or use a subject&apos;s menu.
        </span>{" "}
        Your plan follows the board.
      </p>
      <PodBoard
        syllabusId={exam.id}
        pods={exam.pods.map((p, i) => ({
          id: p.id,
          name: p.name,
          topics: p.topics.length,
          topicsDone: p.topicsDone,
          items: p.items,
          cover: covers[i]!,
        }))}
        initialBoard={board}
      />
    </section>
  );
}
