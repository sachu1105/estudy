import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { OmrWorkspace } from "@/features/omr/components/omr-workspace";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { examService, omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Answer sheet" };

// A question paper beside its answer sheet: the person's own sitting, or (with ?exam=)
// their one sitting in a squad exam. An exam they can't sit right now (not open yet,
// closed, handed in, or theirs to run) goes back to the exam's page.
export default async function OmrPage({
  params,
  searchParams,
}: PageProps<"/omr/[paperId]">) {
  const user = await requireUser();
  const { paperId } = await params;
  const { exam: examParam } = await searchParams;
  if (!isId(paperId)) notFound();

  if (typeof examParam === "string" && isId(examParam)) {
    const sitting = await examService.open(user, examParam);
    if (!sitting || sitting.exam.paper.id !== paperId) notFound();
    if (sitting.kind !== "sitting") redirect(`/exams/${examParam}`);
    const { paper } = sitting.exam;
    return (
      <OmrWorkspace
        key={`${paper.id}-${examParam}`}
        paper={{
          id: paper.id,
          title: paper.title,
          shape: paper.shape,
          marking: paper.marking,
          limitMin: paper.limitMin,
          keyed: paper.keyed,
          owner: false,
        }}
        exam={{
          id: examParam,
          registerNo: sitting.exam.mine?.registerNo ?? null,
          closesAt: sitting.exam.closesAt?.toISOString() ?? null,
        }}
        initialMarks={sitting.marks}
        initialTimer={sitting.timer}
      />
    );
  }

  const opened = await omrService.get(user, paperId);
  if (!opened) notFound();
  const { paper } = opened;
  return (
    <OmrWorkspace
      key={paper.id}
      paper={{
        id: paper.id,
        title: paper.title,
        shape: paper.shape,
        marking: paper.marking,
        limitMin: paper.limitMin,
        keyed: paper.keyed,
        owner: opened.owner,
      }}
      initialMarks={opened.marks}
      initialTimer={opened.timer}
    />
  );
}
