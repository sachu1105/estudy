import { ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { PausedPlan } from "@/features/pods/components/paused-plan";
import { PlanInvite } from "@/features/pods/components/plan-invite";
import { loadExam } from "@/features/pods/load-exam";
import { PlanDay } from "@/features/plans/components/plan-day";
import { PlanMonth } from "@/features/plans/components/plan-month";
import { ReplanButton } from "@/features/plans/components/replan-button";
import { ReplanCard } from "@/features/plans/components/replan-card";
import {
  addDays,
  type CoverageWarning,
  type ReplanDiff,
} from "@/lib/plan-engine";
import { formatDay } from "@/lib/plans/format";
import { planService } from "@/server/services/plans";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Study plan" };

/**
 * The exam's plan, inside its pod: the days ahead a week at a time, or a month on one
 * screen. The calendar used to be a page of its own; it is this plan's month view now.
 */
export default async function ExamPlanPage({
  params,
  searchParams,
}: PageProps<"/pods/exam/[syllabusId]/plan">) {
  const { syllabusId } = await params;
  const { user, exam, plan: state, rank } = await loadExam(syllabusId);
  if (state.kind === "paused")
    return <PausedPlan syllabusId={exam.id} title={exam.title} />;
  if (state.kind !== "active")
    return <PlanInvite syllabusId={exam.id} draft={state.kind === "draft"} />;

  const query = await searchParams;
  const isNew = query.new === "1";
  const month =
    query.view === "month"
      ? typeof query.month === "string" && /^\d{4}-\d{2}$/.test(query.month)
        ? query.month
        : progressService.today(user).slice(0, 7)
      : null;
  const from =
    typeof query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.from)
      ? query.from
      : undefined;
  const base = `/pods/exam/${exam.id}/plan`;

  const [plan, draft, calendar] = await Promise.all([
    planService.get(user, state.planId, 7, from),
    planService.draftFor(user, exam.id),
    month ? progressService.calendar(user, month, exam.id) : null,
  ]);
  if (!plan) return <PlanInvite syllabusId={exam.id} draft={false} />;
  const warning = plan.replanWarning as CoverageWarning | null;
  const facts = [
    `${Math.round(plan.plannedMinutes / 60)} h planned`,
    // Only when something else is competing for the day; alone, it would read as noise.
    rank?.shared ? `${rank.sharePercent}% of your day` : null,
    `from ${formatDay(plan.startDate, false)}`,
    plan.reviewStartDate
      ? `review from ${formatDay(plan.reviewStartDate, false)}`
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {plan.replanDiff && !plan.diffSeenAt && !isNew ? (
        <ReplanCard planId={plan.id} diff={plan.replanDiff as ReplanDiff} />
      ) : null}
      {warning && draft ? (
        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:flex-row md:items-center md:p-5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-h3">The rest no longer fits</h2>
            <p className="text-body text-ink-muted">
              From today the syllabus needs about{" "}
              {Math.round(warning.requiredMinutes / 60)} h and you have about{" "}
              {Math.round(warning.availableMinutes / 60)} h. This plan stays as
              it is until you pick what to change.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href={`/plan/new/${draft.id}/review`}>See the options</Link>
          </Button>
        </section>
      ) : null}
      {isNew ? (
        <section className="flex flex-col gap-4 rounded-card border border-border bg-accent-soft p-4 md:flex-row md:items-center md:p-5">
          <PartyPopper
            className="size-6 shrink-0 text-accent-ink"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-h3">Your plan is ready</h2>
            <p className="text-body text-ink-muted">
              {Math.round(plan.plannedMinutes / 60)} hours across{" "}
              {plan.subjects} subjects. Open any task&apos;s &quot;Why
              this?&quot; to see how it was worked out.
            </p>
          </div>
          <Button asChild variant="primary">
            <Link href="/today">Start with today</Link>
          </Button>
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <nav
          aria-label="Plan view"
          className="inline-flex self-start rounded-control bg-surface-muted p-1"
        >
          {[
            { href: base, label: "Week", active: !month },
            { href: `${base}?view=month`, label: "Month", active: !!month },
          ].map((v) => (
            <Link
              key={v.label}
              href={v.href}
              aria-current={v.active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center rounded-[9px] px-4 font-heading text-small font-medium transition-colors duration-[200ms] md:h-8",
                v.active
                  ? "bg-surface text-ink shadow-sm dark:bg-border"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {v.label}
            </Link>
          ))}
        </nav>
        <ReplanButton syllabusId={exam.id} />
      </div>

      <p className="-mt-2 text-small text-ink-muted">
        {facts.join(" · ")} ·{" "}
        <Link
          href={`/plan/${plan.id}/how`}
          className="font-medium text-accent-ink hover:underline"
        >
          How your plan was built
        </Link>
      </p>

      {plan.leftOut.length > 0 ? (
        <details className="rounded-card border border-border bg-surface p-4">
          <summary className="cursor-pointer text-body font-medium">
            {plan.leftOut.length} topic{plan.leftOut.length === 1 ? "" : "s"}{" "}
            left out to fit your time
          </summary>
          <ul className="mt-3 flex flex-col gap-1 text-small text-ink-muted">
            {plan.leftOut.map((t) => (
              <li key={t.topicId}>
                {t.topicName} <span className="text-ink-subtle">·</span>{" "}
                {t.subjectName}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {calendar && month ? (
        <PlanMonth month={month} planHref={base} view={calendar} />
      ) : (
        <section
          id="days"
          aria-labelledby="days-heading"
          className="flex scroll-mt-20 flex-col gap-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="days-heading" className="text-h2">
              {plan.from === plan.today
                ? "The next 7 days"
                : `From ${formatDay(plan.from, false)}`}
            </h2>
            <nav aria-label="Weeks" className="flex gap-2">
              {plan.from !== plan.today ? (
                <Button asChild variant="ghost">
                  <Link
                    href={`${base}?from=${
                      addDays(plan.from, -7) < plan.today
                        ? plan.today
                        : addDays(plan.from, -7)
                    }#days`}
                  >
                    <ChevronLeft aria-hidden /> Earlier
                  </Link>
                </Button>
              ) : null}
              {addDays(plan.from, 7) <= plan.endDate ? (
                <Button asChild variant="ghost">
                  <Link href={`${base}?from=${addDays(plan.from, 7)}#days`}>
                    Later <ChevronRight aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </nav>
          </div>
          {plan.days.length === 0 ? (
            <p className="text-body text-ink-muted">
              This plan has finished. Make a new one from the menu above.
            </p>
          ) : (
            plan.days.map((day) => (
              <PlanDay
                // By date: an edit re-makes the plan, and days opened stay open.
                key={day.date}
                date={day.date}
                today={plan.today}
                phase={day.phase}
                plannedMinutes={day.plannedMinutes}
                tasks={day.tasks}
                subjectNames={plan.subjectNames}
                topicNames={plan.topicNames}
                editing={{ syllabusId: exam.id, end: plan.endDate }}
              />
            ))
          )}
        </section>
      )}
    </div>
  );
}
