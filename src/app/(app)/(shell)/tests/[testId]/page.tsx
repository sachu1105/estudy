import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BackLink } from "@/features/pods/components/back-link";
import { ReviewQuestion } from "@/features/tests/components/review-question";
import { isId } from "@/lib/ids";
import { formatMinutes } from "@/lib/plans/format";
import { requireUser } from "@/server/auth/session";
import { testService } from "@/server/services/tests";

export const metadata: Metadata = { title: "Test results" };

export default async function TestResult({
  params,
}: PageProps<"/tests/[testId]">) {
  const user = await requireUser();
  const { testId } = await params;
  if (!isId(testId)) notFound();
  const review = await testService.review(user, testId);
  if (!review) {
    // Not submitted yet: back to the player (or a 404 if it isn't theirs).
    const open = await testService.forPlayer(user, testId);
    if (!open) notFound();
    redirect(`/test/${testId}`);
  }
  const { attempt, test } = review;
  const percent = Math.round(attempt.accuracy * 100);
  const facts: [string, string][] = [
    ["Right", String(attempt.correct)],
    ["Wrong", String(attempt.wrong)],
    ["Left blank", String(attempt.skipped)],
    ["Time", formatMinutes(Math.max(1, Math.round(attempt.durationSec / 60)))],
  ];

  return (
    <>
      <BackLink href="/tests" label="Tests" />
      <PageHeader
        title={test.title}
        description="Your answers, the right ones, and why."
      />
      <section className="mb-8 flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center md:p-5">
        <ProgressRing value={percent} size={96} strokeWidth={8} label="Score" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-heading text-h2">
            <span className="font-mono tabular-nums">{attempt.score}</span> of{" "}
            <span className="font-mono tabular-nums">{attempt.total}</span>
            {test.negativeMarking ? (
              <span className="ml-2 text-small font-normal text-ink-muted">
                after negative marking
              </span>
            ) : null}
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-micro text-ink-muted uppercase">{label}</dt>
                <dd className="font-mono text-body tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {test.type === "CHECK" && attempt.accuracy < 0.6 ? (
            <p className="text-small text-ink-muted">
              Under 60%: this topic gets an extra revision at your next re-plan.
            </p>
          ) : null}
        </div>
        <Button asChild variant="primary">
          <Link href="/today">Back to today</Link>
        </Button>
      </section>
      <ol className="flex flex-col gap-4">
        {review.questions.map((q, i) => (
          <ReviewQuestion key={q.id} number={i + 1} question={q} />
        ))}
      </ol>
    </>
  );
}
