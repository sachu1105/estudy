import { Flame, Star } from "lucide-react";
import type { Metadata } from "next";

import { StatTile } from "@/components/blocks/stat-tile";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { AccuracyTrend } from "@/features/progress/components/accuracy-trend";
import { MinutesChart } from "@/features/progress/components/minutes-chart";
import { SubjectBreakdown } from "@/features/progress/components/subject-breakdown";
import { StartTestButton } from "@/features/tests/components/start-test-button";
import { requireUser } from "@/server/auth/session";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Progress" };

/** Everything here is worked out from what you did (rule 6: from the logs). */
export default async function ProgressPage() {
  const user = await requireUser();
  const view = await progressService.progressView(user);
  const coverage = view.coverage.total
    ? Math.round((view.coverage.done / view.coverage.total) * 100)
    : 0;
  const levelPercent = Math.round(
    (view.xp.intoLevel / view.xp.levelSize) * 100,
  );

  return (
    <>
      <PageHeader
        title="Progress"
        description="Worked out from what you actually did."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Streak"
          icon={Flame}
          numeral="mono"
          value={view.streak.current}
          hint={`Best: ${view.streak.best} days`}
        />
        <Card className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between">
            <span className="text-micro text-ink-muted uppercase">Level</span>
            <Star className="size-4 text-ink-subtle" aria-hidden />
          </div>
          <span className="font-heading text-display font-semibold tabular-nums">
            {view.xp.level}
          </span>
          <span
            className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-label="Towards the next level"
            aria-valuenow={levelPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${levelPercent}%` }}
            />
          </span>
          <span className="text-small text-ink-muted">
            {view.xp.total} XP · {view.xp.levelSize - view.xp.intoLevel} to the
            next level
          </span>
        </Card>
        <Card className="flex items-center gap-4 p-5 md:col-span-2 lg:col-span-2">
          <ProgressRing
            value={coverage}
            size={80}
            strokeWidth={8}
            label="Syllabus covered"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-micro text-ink-muted uppercase">Covered</span>
            <span className="text-body">
              {view.coverage.done} of {view.coverage.total} topics in your plans
              are done.
            </span>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-5 md:col-span-2">
          <h2 className="text-h3">Minutes a day</h2>
          <MinutesChart days={view.minutes} />
        </Card>
        <Card className="flex flex-col gap-3 p-5 md:col-span-2">
          <h2 className="text-h3">Test accuracy</h2>
          <AccuracyTrend attempts={view.attempts} />
        </Card>

        <Card className="flex flex-col gap-3 p-5 md:col-span-2">
          <h2 className="text-h3">Weakest topics</h2>
          {view.weakest.length === 0 ? (
            <p className="text-body text-ink-muted">
              After a few tests, the topics to work on show here.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {view.weakest.map((w) => (
                <li
                  key={w.topicKey}
                  className="flex flex-wrap items-center gap-3 py-2"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body">{w.topic}</span>
                    <span className="text-small text-ink-muted">
                      {w.subject ? `${w.subject} · ` : ""}
                      <span className="font-mono tabular-nums">
                        {Math.round(w.accuracy * 100)}%
                      </span>{" "}
                      of {w.answers} answers
                    </span>
                  </span>
                  {w.id ? (
                    <StartTestButton
                      kind="topic"
                      id={w.id}
                      label="Practice"
                      icon={false}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex flex-col gap-3 p-5 md:col-span-2">
          <h2 className="text-h3">Subjects</h2>
          <SubjectBreakdown subjects={view.subjects} />
        </Card>
      </div>
    </>
  );
}
