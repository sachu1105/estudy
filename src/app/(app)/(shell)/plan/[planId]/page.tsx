import { PartyPopper, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/features/pods/components/back-link";
import { PlanDay } from "@/features/plans/components/plan-day";
import { ReplanButton } from "@/features/plans/components/replan-button";
import { ReplanCard } from "@/features/plans/components/replan-card";
import { isId } from "@/lib/ids";
import {
  toDay,
  type CoverageWarning,
  type ReplanDiff,
} from "@/lib/plan-engine";
import { formatDay } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";

export const metadata: Metadata = { title: "Study plan" };

export default async function PlanPage({
  params,
  searchParams,
}: PageProps<"/plan/[planId]">) {
  const user = await requireUser();
  const { planId } = await params;
  const isNew = (await searchParams).new === "1";
  const plan = isId(planId) ? await planService.get(user, planId) : null;
  if (!plan) notFound();
  // Edits and re-plans make a new plan; old links land on the current one.
  if (plan.status === "ARCHIVED" && plan.syllabusVersionId) {
    const current = await planService.activeFor(user, plan.syllabusVersionId);
    if (current) redirect(`/plan/${current.id}`);
  }
  const active = plan.status === "ACTIVE";
  const warning = plan.replanWarning as CoverageWarning | null;
  const draft = plan.syllabusVersionId
    ? await planService.draftFor(user, plan.syllabusVersionId)
    : null;

  const end = plan.endDate;
  const start = plan.startDate;
  const totalDays = toDay(end) - toDay(start) + 1;
  const tiles: [string, string][] = [
    ["Ends", formatDay(end)],
    ["Days", String(totalDays)],
    ["Hours planned", String(Math.round(plan.plannedMinutes / 60))],
    [
      "Review from",
      plan.reviewStartDate ? formatDay(plan.reviewStartDate, false) : "—",
    ],
  ];

  return (
    <>
      {plan.syllabusVersionId ? (
        <BackLink
          href={`/pods/exam/${plan.syllabusVersionId}`}
          label={plan.title}
        />
      ) : (
        <BackLink href="/plan" label="Plans" />
      )}
      <PageHeader
        title="Study plan"
        description={`${plan.title} · from ${formatDay(start, false)}${plan.status === "ARCHIVED" ? " · replaced by a newer plan" : ""}`}
        actions={
          draft && active && plan.syllabusVersionId ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <ReplanButton syllabusId={plan.syllabusVersionId} />
              <Button asChild variant="secondary">
                <Link href={`/plan/new/${draft.id}/timeline`}>
                  <SlidersHorizontal aria-hidden /> Change plan
                </Link>
              </Button>
            </div>
          ) : null
        }
      />

      <div className="flex flex-col gap-8">
        {active && plan.replanDiff && !plan.diffSeenAt && !isNew ? (
          <ReplanCard planId={plan.id} diff={plan.replanDiff as ReplanDiff} />
        ) : null}
        {active && warning && draft ? (
          <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 md:flex-row md:items-center md:p-5">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2 className="text-h3">The rest no longer fits</h2>
              <p className="text-body text-ink-muted">
                From today the syllabus needs about{" "}
                {Math.round(warning.requiredMinutes / 60)} h and you have about{" "}
                {Math.round(warning.availableMinutes / 60)} h. This plan stays
                as it is until you pick what to change.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href={`/plan/new/${draft.id}/review`}>See the options</Link>
            </Button>
          </section>
        ) : null}
        {isNew ? (
          <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:flex-row md:items-center md:p-5">
            <PartyPopper className="size-6 shrink-0 text-accent" aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2 className="text-h3">Your plan is ready</h2>
              <p className="text-body text-ink-muted">
                {totalDays} days, {Math.round(plan.plannedMinutes / 60)} hours,{" "}
                {plan.subjects} subjects. Open any task&apos;s &quot;Why
                this?&quot; to see how it was worked out.
              </p>
            </div>
            <Button asChild variant="primary">
              <a href="#days">Start with today</a>
            </Button>
          </section>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div
              key={label}
              className="rounded-card border border-border bg-surface p-4"
            >
              <dt className="text-micro text-ink-muted uppercase">{label}</dt>
              <dd className="font-heading text-h3 font-medium">{value}</dd>
            </div>
          ))}
        </dl>

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

        <section
          id="days"
          aria-labelledby="days-heading"
          className="flex scroll-mt-20 flex-col gap-6"
        >
          <h2 id="days-heading" className="text-h2">
            The next 7 days
          </h2>
          {plan.days.length === 0 ? (
            <p className="text-body text-ink-muted">
              This plan has finished. Make a new one from the exam pod.
            </p>
          ) : (
            plan.days.map((day) => (
              <PlanDay
                key={day.id}
                date={day.date}
                today={plan.today}
                phase={day.phase}
                plannedMinutes={day.plannedMinutes}
                tasks={day.tasks}
                subjectNames={plan.subjectNames}
                topicNames={plan.topicNames}
                editing={
                  active && plan.syllabusVersionId
                    ? { syllabusId: plan.syllabusVersionId, end: plan.endDate }
                    : null
                }
              />
            ))
          )}
        </section>
      </div>
    </>
  );
}
