import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { ExamHostControls } from "@/features/omr/components/exam-host-controls";
import { ExamOverview } from "@/features/omr/components/exam-overview";
import { RankList } from "@/features/omr/components/rank-list";
import { isId } from "@/lib/ids";
import { times } from "@/lib/omr/fraction";
import { requireUser } from "@/server/auth/session";
import { examService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Exam" };

// A question paper shared into a squad as an exam: where it stands, the way in, and once
// results are out (or for whoever runs it) the rank list.
export default async function ExamPage({
  params,
}: PageProps<"/exams/[shareId]">) {
  const user = await requireUser();
  const { shareId } = await params;
  const exam = isId(shareId) ? await examService.view(user, shareId) : null;
  if (!exam) notFound();

  const format = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: user.timezone,
  });
  const max = times(exam.paper.marking.right, exam.paper.keyed);
  const mineRow = exam.results?.find((r) => r.mine) ?? null;

  return (
    <>
      <PageHeader
        title={exam.paper.title.replaceAll("_", " ")}
        description={`Exam in ${exam.squad.name} · #${exam.channel.name} · shared by ${exam.sharedBy}`}
      />
      <div className="flex flex-col gap-6">
        <ExamOverview
          id={exam.id}
          paper={exam.paper}
          status={exam.status}
          released={exam.released}
          host={exam.host}
          started={exam.started}
          when={{
            opens: format.format(exam.opensAt),
            closes: exam.closesAt ? format.format(exam.closesAt) : null,
            results: exam.resultsAt ? format.format(exam.resultsAt) : null,
          }}
          mine={exam.mine}
          myScore={
            mineRow && exam.released ? { score: mineRow.score, max } : null
          }
        />
        {exam.host ? (
          <ExamHostControls
            id={exam.id}
            released={exam.released}
            showNames={exam.showNames}
          />
        ) : null}
        {exam.results ? (
          <RankList
            max={max}
            rows={exam.results.map((r) => ({
              rank: r.rank,
              registerNo: r.registerNo,
              name: r.name,
              score: r.score,
              passed: r.passed,
              mine: r.mine,
            }))}
          />
        ) : (
          <p className="rounded-card border border-dashed border-border p-6 text-center text-small text-ink-muted">
            The rank list comes out with the results
            {exam.resultsAt ? `, at ${format.format(exam.resultsAt)}` : ""}.
          </p>
        )}
      </div>
    </>
  );
}
