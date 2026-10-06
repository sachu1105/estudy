import { ClipboardCheck, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BackLink } from "@/features/pods/components/back-link";
import {
  PlanCard,
  type ExamPlanState,
} from "@/features/pods/components/plan-card";
import { PodBoard } from "@/features/pods/components/pod-board";
import { isId } from "@/lib/ids";
import { toBoard, POD_STAGES, type Board } from "@/lib/pods/stages";
import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";
import { podService } from "@/server/services/pods";

export const metadata: Metadata = { title: "Exam" };

/** The exam pod: the whole syllabus, its plan and a pod for every subject in it. */
export default async function ExamPodPage({
  params,
}: PageProps<"/pods/exam/[syllabusId]">) {
  const user = await requireUser();
  const { syllabusId } = await params;
  const exam = isId(syllabusId)
    ? await podService.exam(user, syllabusId)
    : null;
  if (!exam) notFound();
  const [active, draft] = await Promise.all([
    planService.activeFor(user, exam.id),
    planService.draftFor(user, exam.id),
  ]);
  const planState: ExamPlanState = active
    ? {
        kind: "active",
        planId: active.id,
        endDate: active.endDate,
        plannedMinutes: active.plannedMinutes,
      }
    : draft
      ? { kind: "draft" }
      : { kind: "none" };

  const percent = exam.topics
    ? Math.round((exam.topicsDone / exam.topics) * 100)
    : 0;
  const subjects = exam.pods.length;
  const columns = toBoard(exam.pods);
  const board = Object.fromEntries(
    POD_STAGES.map((s) => [s, columns[s].map((p) => p.id)]),
  ) as Board;

  return (
    <>
      <BackLink href="/pods" label="Pods" />
      <PageHeader
        title={exam.title}
        description={
          exam.examName && exam.examName !== exam.title
            ? exam.examName
            : undefined
        }
        actions={
          exam.editable ? (
            <Button asChild variant="secondary">
              <Link href={`/syllabus/${exam.id}`}>
                <Pencil aria-hidden /> Edit syllabus
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 md:p-5">
            <ProgressRing
              value={percent}
              size={72}
              strokeWidth={7}
              label={`${exam.title} progress`}
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="font-heading text-h3 font-medium">
                {exam.topicsDone} of {exam.topics} topics done
              </p>
              <p className="text-small text-ink-muted">
                {subjects} subject{subjects === 1 ? "" : "s"} · {exam.items}{" "}
                item{exam.items === 1 ? "" : "s"} of material
              </p>
            </div>
          </div>
          <PlanCard syllabusId={exam.id} state={planState} />
        </div>

        <section aria-labelledby="subjects" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="subjects" className="text-h2">
              Subjects
            </h2>
            <p className="text-body text-ink-muted">
              Each subject is a pod. Drag them into the order you want to study
              them; your plan follows the board.
            </p>
          </div>
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

        <section
          aria-labelledby="exam-tests"
          className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 md:p-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
            <ClipboardCheck className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="exam-tests" className="text-h3">
              Full mock tests
            </h2>
            <p className="text-body text-ink-muted">
              Whole-exam mocks across every subject, with the real marks split.
              Coming with mock tests.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
