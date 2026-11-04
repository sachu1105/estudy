import { CircleCheck, Play } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { buttonVariants } from "@/components/ui/button";
import { formatMinutes } from "@/lib/plans/format";

import { StartTask } from "./start-task";
import type { TodayTask } from "./today-tasks";

type TodayHeroProps = {
  minutesDone: number;
  minutesPlanned: number;
  topicsLeft: number;
  next: TodayTask | null;
};

/**
 * The whole day in one card: how much of it is done, and the one thing to do now. Today's
 * only filled accent button lives here, so the page answers "what next?" at a glance.
 */
export function TodayHero({
  minutesDone,
  minutesPlanned,
  topicsLeft,
  next,
}: TodayHeroProps) {
  const percent = minutesPlanned
    ? Math.min(100, Math.round((minutesDone / minutesPlanned) * 100))
    : 0;

  return (
    <Card className="flex flex-col gap-5 p-4 sm:p-5 md:flex-row md:items-center md:gap-6">
      <div className="flex items-center gap-4 md:w-72 md:shrink-0">
        <ProgressRing
          value={percent}
          size={72}
          strokeWidth={7}
          label="Today's study done"
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-micro text-ink-muted uppercase">
            Today&apos;s study
          </span>
          <span className="font-heading text-h2 font-semibold text-ink">
            {formatMinutes(minutesPlanned)}
          </span>
          <span className="text-small text-ink-muted">
            {topicsLeft > 0
              ? `${topicsLeft} to go · ${formatMinutes(minutesDone)} done`
              : "All done"}
          </span>
        </div>
      </div>

      {next ? (
        <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-control bg-accent-soft p-3 pl-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-micro text-accent-ink uppercase">
              Up next
            </span>
            <span className="truncate text-body font-medium text-ink">
              {next.topicName ?? next.title}
            </span>
            <span className="truncate text-small text-ink-muted">
              {next.subject} · {next.step} · {next.minutes} min
            </span>
          </div>
          <StartTask
            task={next}
            className={buttonVariants({
              variant: "primary",
              className: "w-full sm:w-auto",
            })}
          >
            <Play aria-hidden />
            Start
          </StartTask>
        </div>
      ) : (
        <p className="flex flex-1 items-center gap-2 rounded-control bg-success-soft px-4 py-3 text-body text-success-ink">
          <CircleCheck className="size-5 shrink-0" aria-hidden />
          Done for today. Rest, or read ahead in a pod.
        </p>
      )}
    </Card>
  );
}
