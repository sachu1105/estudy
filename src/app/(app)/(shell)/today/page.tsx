import { CalendarClock, ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReplanCard } from "@/features/plans/components/replan-card";
import { taskStep, taskTitle } from "@/features/plans/task-text";
import { NextUp } from "@/features/today/components/next-up";
import { TodayStats } from "@/features/today/components/today-stats";
import { TodayTasks } from "@/features/today/components/today-tasks";
import type { ReplanDiff } from "@/lib/plan-engine";
import { formatDay } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Today" };

const TIMED = new Set(["STUDY", "REVISION", "CUSTOM"]);
const TESTS = new Set(["CHECK_TEST", "SECTION_MOCK", "FULL_MOCK"]);

export default async function TodayPage() {
  const user = await requireUser();
  const view = await progressService.todayView(user);
  const date = formatDay(view.today);

  if (!view.hasPlan)
    return (
      <>
        <PageHeader title="Today" description={date} />
        <EmptyState
          icon={CalendarClock}
          title="No plan yet"
          description="Make one from an exam pod and your tasks for each day show up here."
          action={
            <Button asChild variant="primary">
              <Link href="/pods">Go to your pods</Link>
            </Button>
          }
        />
      </>
    );

  const tasks = view.tasks.map((t) => ({
    id: t.id,
    examId: t.examId,
    title: taskTitle(t, t.topicName ?? "Topic", t.subjectName ?? "Subject"),
    step: taskStep(t, t.subjectName ?? "Subject"),
    subject:
      t.type === "FULL_MOCK" ? "Every subject" : (t.subjectName ?? "Your task"),
    minutes: t.minutes,
    done: t.done,
    topicId: t.topicId,
    topicName: t.topicName,
    timed: TIMED.has(t.type),
    test: TESTS.has(t.type),
  }));
  // The focus exam's work is the page; the rest is gathered under it. With one exam running
  // `others` is empty and nothing below changes.
  const focusTasks = view.focusExamId
    ? tasks.filter((t) => t.examId === view.focusExamId)
    : tasks;
  const others = view.exams
    .filter((e) => !e.focus)
    .map((e) => ({ ...e, tasks: tasks.filter((t) => t.examId === e.examId) }))
    .filter((e) => e.tasks.length > 0);
  const focusExam = view.exams.find((e) => e.focus) ?? null;
  // Next up follows the focus exam, falling back to whatever else is left today.
  const next = focusTasks.find((t) => !t.done) ?? tasks.find((t) => !t.done);
  const left = focusTasks.filter((t) => !t.done).length;

  return (
    <>
      <PageHeader title="Today" description={date} />
      <div className="flex flex-col gap-6">
        {view.plans
          .filter((p) => p.diff)
          .map((p) => (
            <ReplanCard key={p.id} planId={p.id} diff={p.diff as ReplanDiff} />
          ))}

        {next ? <NextUp task={next} /> : null}

        <TodayStats
          minutesDone={view.minutesDone}
          minutesPlanned={view.minutesPlanned}
          studiedMinutes={view.studiedMinutes}
          coverage={view.coverage}
          daysLeft={view.daysLeft}
          streak={view.streak}
          frozen={view.streak.frozen.map((d) => formatDay(d, false))}
          today={view.today}
          focusExam={others.length > 0 ? (focusExam?.title ?? null) : null}
        />

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-h3">
              {left > 0 ? `${left} left today` : "Today's tasks"}
            </h2>
            <Link
              href={
                view.focusExamId
                  ? `/pods/exam/${view.focusExamId}/plan`
                  : "/pods"
              }
              className="text-small font-medium text-accent-ink hover:underline"
            >
              Whole plan
            </Link>
          </div>
          {others.length > 0 && focusExam ? (
            <p className="-mt-1 text-small text-ink-muted">
              {focusExam.title} · your focus
            </p>
          ) : null}
          {focusTasks.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-body text-ink-muted">
                Nothing planned today. Rest, or read ahead in a pod.
              </p>
            </Card>
          ) : (
            <TodayTasks tasks={focusTasks} />
          )}
        </section>

        {others.map((exam) => (
          <section key={exam.examId} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-h3">{exam.title}</h2>
              <Link
                href={`/pods/exam/${exam.examId}/plan`}
                className="text-small font-medium text-accent-ink hover:underline"
              >
                Whole plan
              </Link>
            </div>
            <TodayTasks tasks={exam.tasks} />
          </section>
        ))}

        {view.nextMock ? (
          <Link
            href="/tests"
            className="flex items-center gap-3 rounded-card border border-border px-4 py-3 text-small text-ink-muted transition-colors duration-[120ms] hover:bg-surface-muted hover:text-ink"
          >
            <ClipboardCheck className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              Next mock test ·{" "}
              {view.nextMock.type === "FULL_MOCK"
                ? "Full mock"
                : `${view.nextMock.subjectName ?? "Section"} mock`}
            </span>
            <span className="shrink-0">
              {formatDay(view.nextMock.date, false)}
            </span>
          </Link>
        ) : null}
      </div>
    </>
  );
}
