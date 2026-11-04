import { CalendarClock, ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReplanCard } from "@/features/plans/components/replan-card";
import { taskStep, taskTitle } from "@/features/plans/task-text";
import { StreakButton } from "@/features/today/components/streak-button";
import { TodayHero } from "@/features/today/components/today-hero";
import { TodayIntro } from "@/features/today/components/today-intro";
import {
  TodayTasks,
  type TodayTask,
} from "@/features/today/components/today-tasks";
import { TODAY_INTRO_COOKIE } from "@/features/today/intro";
import type { ReplanDiff } from "@/lib/plan-engine";
import { formatDay } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { coverService, podService } from "@/server/services/pods";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Today" };

const TIMED = new Set(["STUDY", "REVISION", "CUSTOM"]);
const TESTS = new Set(["CHECK_TEST", "SECTION_MOCK", "FULL_MOCK"]);
const KIND = {
  STUDY: "study",
  REVISION: "revise",
  CHECK_TEST: "test",
  SECTION_MOCK: "test",
  FULL_MOCK: "test",
  CUSTOM: "own",
} as const;

export default async function TodayPage() {
  const user = await requireUser();
  const [view, jar] = await Promise.all([
    progressService.todayView(user),
    cookies(),
  ]);
  const date = formatDay(view.today, false);

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

  const tasks: (TodayTask & { examId: string | null })[] = view.tasks.map(
    (t) => ({
      id: t.id,
      examId: t.examId,
      title: taskTitle(t, t.topicName ?? "Topic", t.subjectName ?? "Subject"),
      step: taskStep(t, t.subjectName ?? "Subject"),
      subject:
        t.type === "FULL_MOCK"
          ? "Every subject"
          : (t.subjectName ?? "Your task"),
      subjectId: t.type === "FULL_MOCK" ? null : t.subjectId,
      kind: KIND[t.type],
      minutes: t.minutes,
      done: t.done,
      topicId: t.topicId,
      topicName: t.topicName,
      timed: TIMED.has(t.type),
      test: TESTS.has(t.type),
    }),
  );
  // Each subject shows its pod's cover, the same face it has on the pods pages.
  const pods = await podService.subjectPods(user, [
    ...new Set(tasks.flatMap((t) => (t.subjectId ? [t.subjectId] : []))),
  ]);
  const covers = Object.fromEntries(
    await Promise.all(
      pods.map(
        async (p) =>
          [p.subjectId!, await coverService.resolve(p.cover, p.id)] as const,
      ),
    ),
  );
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
  const daysLeft =
    view.daysLeft === null
      ? null
      : `${view.daysLeft} ${view.daysLeft === 1 ? "day" : "days"} left${focusExam ? ` for ${focusExam.title}` : ""}`;

  return (
    <>
      <PageHeader
        title="Today"
        description={daysLeft ? `${date} · ${daysLeft}` : date}
        inlineActions
        actions={
          <StreakButton
            streak={view.streak}
            frozen={view.streak.frozen.map((d) => formatDay(d, false))}
            today={view.today}
          />
        }
      />
      <div className="flex flex-col gap-6">
        {view.plans
          .filter((p) => p.diff)
          .map((p) => (
            <ReplanCard key={p.id} planId={p.id} diff={p.diff as ReplanDiff} />
          ))}

        <TodayHero
          minutesDone={view.minutesDone}
          minutesPlanned={view.minutesPlanned}
          topicsLeft={tasks.filter((t) => !t.done).length}
          next={next ?? null}
        />

        {jar.get(TODAY_INTRO_COOKIE) ? null : <TodayIntro />}

        <section className="flex flex-col gap-3" aria-labelledby="today-list">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="today-list" className="text-h3">
              {others.length > 0 && focusExam
                ? focusExam.title
                : "Today's subjects"}
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
          {focusTasks.length === 0 ? (
            <p className="rounded-card border border-border px-4 py-6 text-center text-body text-ink-muted">
              Nothing planned today. Rest, or read ahead in a pod.
            </p>
          ) : (
            <TodayTasks tasks={focusTasks} covers={covers} />
          )}
        </section>

        {others.map((exam) => (
          <section
            key={exam.examId}
            className="flex flex-col gap-3"
            aria-labelledby={`today-${exam.examId}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`today-${exam.examId}`} className="text-h3">
                {exam.title}
              </h2>
              <Link
                href={`/pods/exam/${exam.examId}/plan`}
                className="text-small font-medium text-accent-ink hover:underline"
              >
                Whole plan
              </Link>
            </div>
            <TodayTasks tasks={exam.tasks} covers={covers} />
          </section>
        ))}

        {view.nextMock ? (
          // Informational: the mock shows up as a task on its day.
          <p className="flex items-center gap-3 rounded-card border border-border px-4 py-3 text-small text-ink-muted">
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
          </p>
        ) : null}
      </div>
    </>
  );
}
