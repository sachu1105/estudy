import { CalendarClock, ClipboardCheck, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatTile } from "@/components/blocks/stat-tile";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { taskTitle } from "@/features/plans/task-text";
import { StreakTile } from "@/features/today/components/streak-tile";
import { TodayTasks } from "@/features/today/components/today-tasks";
import { formatDay } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Today" };

const TIMED = new Set(["STUDY", "REVISION", "CUSTOM"]);

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

  const examOf = new Map(view.plans.map((p) => [p.id, p.title]));
  const tasks = view.tasks.map((t) => ({
    id: t.id,
    title: taskTitle(t, t.topicName ?? "Topic", t.subjectName ?? "Subject"),
    subject: [
      t.type === "FULL_MOCK" ? "Every subject" : (t.subjectName ?? "Your task"),
      // With more than one exam planned, say which one.
      view.plans.length > 1 ? examOf.get(t.planId) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    minutes: t.minutes,
    done: t.done,
    topicId: t.topicId,
    timed: TIMED.has(t.type),
  }));
  const next = tasks.find((t) => t.timed && !t.done);
  const coverage = view.coverage.total
    ? Math.round((view.coverage.done / view.coverage.total) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title="Today"
        description={date}
        actions={
          next ? (
            <Button asChild variant="primary" className="w-full sm:w-auto">
              <Link href={`/study/${next.id}`}>Start next task</Link>
            </Button>
          ) : null
        }
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col gap-3 p-4 md:col-span-2 md:p-5 lg:row-span-2">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-h2">Today&apos;s tasks</h2>
            <Link
              href={`/plan/${view.plans[0]!.id}`}
              className="text-small font-medium text-accent-ink hover:underline"
            >
              Whole plan
            </Link>
          </div>
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-body text-ink-muted">
              Nothing planned today. Rest, or read ahead in a pod.
            </p>
          ) : (
            <TodayTasks tasks={tasks} />
          )}
        </Card>
        <StreakTile
          current={view.streak.current}
          todayDone={view.streak.todayDone}
          freezeLeft={view.streak.freezeLeft}
          frozen={view.streak.frozen.map((d) => formatDay(d, false))}
          today={view.today}
        />
        <StatTile
          label="Minutes today"
          icon={Timer}
          numeral="mono"
          value={`${view.minutesDone}/${view.minutesPlanned}`}
          hint={
            view.studiedMinutes > 0
              ? `${view.studiedMinutes} min timed in study sessions`
              : "Ticked tasks out of today's plan"
          }
        />
        <StatTile
          label="Days left"
          icon={CalendarClock}
          numeral="mono"
          value={view.daysLeft ?? "–"}
          hint="Until your plan ends"
        />
        <Card className="flex items-center gap-4 p-5">
          <ProgressRing
            value={coverage}
            size={72}
            strokeWidth={7}
            label="Topics covered"
          />
          <div className="flex flex-col">
            <span className="text-micro text-ink-muted uppercase">Covered</span>
            <span className="text-body">
              {view.coverage.done} of {view.coverage.total} topics
            </span>
          </div>
        </Card>
        <StatTile
          label="Next mock test"
          icon={ClipboardCheck}
          value={
            <span className="text-h3">
              {view.nextMock
                ? view.nextMock.type === "FULL_MOCK"
                  ? "Full mock"
                  : `${view.nextMock.subjectName ?? "Section"} mock`
                : "None yet"}
            </span>
          }
          hint={
            view.nextMock
              ? formatDay(view.nextMock.date, false)
              : "Section mocks come once a subject is studied and revised"
          }
        />
      </div>
    </>
  );
}
