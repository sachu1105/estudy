import { AlertCircle, CalendarClock, Clock, ListMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CoverageWarning as Warning } from "@/lib/plan-engine";
import { formatMinutes } from "@/lib/plans/format";

/**
 * The work doesn't fit the time. Honest numbers and three ways forward; the plan is
 * never squeezed in silently (rule: never compress).
 */
export function CoverageWarning({
  warning,
  extraDays,
  extraPerStudyDay,
  busy,
  onAddTime,
  onPartial,
  onMoveDate,
}: {
  warning: Warning;
  extraDays: number;
  extraPerStudyDay: number;
  busy: boolean;
  onAddTime: () => void;
  onPartial: () => void;
  onMoveDate: () => void;
}) {
  const need = Math.round(warning.requiredMinutes / 60);
  const have = Math.round(warning.availableMinutes / 60);
  return (
    <section
      aria-labelledby="coverage"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5"
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 size-5 shrink-0 text-ink-muted"
          aria-hidden
        />
        <div className="flex flex-col gap-1">
          <h2 id="coverage" className="text-h3">
            {warning.reason === "WORKLOAD"
              ? "The syllabus needs more time than you have"
              : "There's time, but not on the days it's needed"}
          </h2>
          <p className="text-body text-ink-muted">
            It needs about {need} h and you have about {have} h. As it is,
            you&apos;d cover about{" "}
            <span className="font-mono tabular-nums">
              {warning.projectedCoveragePercent}%
            </span>
            . Pick one:
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={onAddTime}
          className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal"
        >
          <Clock aria-hidden /> Add {formatMinutes(extraPerStudyDay)} a study
          day
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={onPartial}
          className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal"
        >
          <ListMinus aria-hidden /> Leave out the least important topics
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={onMoveDate}
          className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal"
        >
          <CalendarClock aria-hidden /> Give it about {extraDays} more days
        </Button>
      </div>
    </section>
  );
}
