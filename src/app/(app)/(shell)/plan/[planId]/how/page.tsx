import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { BackLink } from "@/features/pods/components/back-link";
import { HowRules } from "@/features/plans/components/how-rules";
import { HowSubjects } from "@/features/plans/components/how-subjects";
import { isId } from "@/lib/ids";
import { BUFFER_PCT, toDay } from "@/lib/plan-engine";
import { formatDay, formatMinutes } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { planService } from "@/server/services/plans";

export const metadata: Metadata = { title: "How your plan was built" };

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Rule 14: every input and rule behind the plan, in plain words and real numbers. */
export default async function HowPage({
  params,
}: PageProps<"/plan/[planId]/how">) {
  const user = await requireUser();
  const { planId } = await params;
  const plan = isId(planId) ? await planService.explain(user, planId) : null;
  if (!plan) notFound();
  const { input } = plan;
  const days = toDay(plan.endDate) - toDay(plan.startDate) + 1;
  const week = input.availability.minutesByWeekday;
  const facts: [string, string][] = [
    [
      "Plan runs",
      `${formatDay(plan.startDate)} to ${formatDay(plan.endDate)}, ${days} days`,
    ],
    [
      "Why it ends then",
      input.examDate
        ? `The day before your exam on ${formatDay(input.examDate)}, or your chosen number of days if that's sooner.`
        : "The number of days you chose.",
    ],
    [
      "Review starts",
      plan.reviewStartDate
        ? formatDay(plan.reviewStartDate)
        : "No separate review window",
    ],
    [
      "Time each week",
      `${week.map((m, i) => `${WEEK[i]} ${m ? formatMinutes(m) : "rest"}`).join(", ")}. The plan fills ${100 - BUFFER_PCT}% of it.`,
    ],
    [
      "Best times",
      input.availability.preferredWindows
        .map((w) => w.toLowerCase())
        .join(", then "),
    ],
    [
      "New to PSC",
      input.beginnerMode ? "Yes: gentler first week, basics first" : "No",
    ],
    [
      "Your own edits",
      plan.edits ? `${plan.edits} kept by every re-plan` : "None",
    ],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href={`/plan/${plan.id}`} label="Study plan" />
      <PageHeader
        title="How your plan was built"
        description={`${plan.title}. Every number below came from what you entered and the rules at the end.`}
      />
      <div className="flex flex-col gap-10">
        <dl className="divide-y divide-border rounded-card border border-border bg-surface">
          {facts.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4"
            >
              <dt className="text-small text-ink-muted sm:w-40 sm:shrink-0">
                {label}
              </dt>
              <dd className="text-body">{value}</dd>
            </div>
          ))}
        </dl>
        <HowSubjects input={input} adjustments={plan.adjustments} />
        {plan.leftOut.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-h2">Left out to fit your time</h2>
            <p className="text-body text-ink-muted">
              You chose to leave out the least important topics: lowest weight
              first.
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-body">
              {plan.leftOut.map((t) => (
                <li key={t.topicId}>
                  {t.topicName} ({t.subjectName})
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <HowRules />
      </div>
    </div>
  );
}
