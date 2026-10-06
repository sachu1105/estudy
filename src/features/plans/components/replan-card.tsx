"use client";

import { RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ReplanDiff } from "@/lib/plan-engine";

import { dismissDiffAction } from "../actions";

/**
 * What the last re-plan changed, shown once. Plain numbers, no blame: missed work is
 * simply part of the new plan (rule 7, no overdue anywhere).
 */
export function ReplanCard({
  planId,
  diff,
}: {
  planId: string;
  diff: ReplanDiff;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const lines = [
    diff.minutesPlanned > 0
      ? `You studied ${diff.minutesDone} of ${diff.minutesPlanned} planned minutes since the last plan.`
      : null,
    diff.topicsMoved.length > 0
      ? `${diff.topicsMoved.length} topic${diff.topicsMoved.length === 1 ? "" : "s"} moved to new days.`
      : null,
    diff.weakTopicIds.length > 0
      ? `${diff.weakTopicIds.length} topic${diff.weakTopicIds.length === 1 ? "" : "s"} got an extra revision after a check test under 60%.`
      : null,
    diff.coverageBefore !== null && diff.coverageBefore !== diff.coverageAfter
      ? `Syllabus covered by the plan: ${diff.coverageBefore}% to ${diff.coverageAfter}%.`
      : null,
  ].filter((l): l is string => l !== null);

  return (
    <section
      aria-labelledby="replan-card"
      className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 md:p-5"
    >
      <RefreshCw
        className="mt-0.5 size-5 shrink-0 text-ink-muted"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="replan-card" className="text-h3">
          Your plan was made fresh from today
        </h2>
        <ul className="flex flex-col gap-0.5 text-body text-ink-muted">
          {(lines.length > 0
            ? lines
            : ["Everything is on track; the days ahead were rebuilt."]
          ).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await dismissDiffAction({ planId });
            router.refresh();
          })
        }
      >
        <X aria-hidden />
      </Button>
    </section>
  );
}
