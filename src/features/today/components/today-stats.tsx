"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { StreakChip } from "@/components/blocks/streak-chip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { STREAK_MINUTES } from "@/lib/progress/streak";
import { STREAK_XP_CAP, STREAK_XP_PER_DAY } from "@/lib/progress/xp";
import { cn } from "@/lib/utils/cn";

type TodayStatsProps = {
  minutesDone: number;
  minutesPlanned: number;
  studiedMinutes: number;
  coverage: { done: number; total: number };
  daysLeft: number | null;
  streak: { current: number; todayDone: boolean; freezeLeft: boolean };
  frozen: string[];
  today: string;
};

/**
 * Four numbers, one line. They used to be four full-height cards that pushed the
 * day's work off the screen; here they sit above it and stay out of its way.
 */
export function TodayStats({
  minutesDone,
  minutesPlanned,
  studiedMinutes,
  coverage,
  daysLeft,
  streak,
  frozen,
  today,
}: TodayStatsProps) {
  const covered = coverage.total
    ? Math.round((coverage.done / coverage.total) * 100)
    : 0;
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4">
      <Cell
        label="Minutes today"
        value={`${minutesDone}/${minutesPlanned}`}
        hint={
          studiedMinutes > 0 ? `${studiedMinutes} min timed` : "Of today's plan"
        }
        bar={minutesPlanned ? (minutesDone / minutesPlanned) * 100 : 0}
      />
      <Cell
        label="Streak"
        value={
          <StreakChip
            days={streak.current}
            celebrateKey={streak.todayDone ? today : null}
          />
        }
        hint={
          streak.todayDone
            ? "Today counts"
            : streak.current > 0
              ? "Keep it going today"
              : "Start one today"
        }
        aside={<StreakHelp frozen={frozen} freezeLeft={streak.freezeLeft} />}
      />
      <Cell
        label="Covered"
        value={`${covered}%`}
        hint={`${coverage.done} of ${coverage.total} topics`}
        bar={covered}
      />
      <Cell
        label="Days left"
        value={daysLeft ?? "–"}
        hint="Until your plan ends"
      />
    </div>
  );
}

function Cell({
  label,
  value,
  hint,
  bar,
  aside,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  bar?: number;
  aside?: ReactNode;
}) {
  const plain = typeof value === "string" || typeof value === "number";
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-surface p-4">
      <div className="flex items-start justify-between gap-1">
        <span className="text-micro text-ink-muted uppercase">{label}</span>
        {aside}
      </div>
      <span
        className={cn(
          "flex h-8 items-center",
          plain && "font-mono text-h2 font-medium text-ink tabular-nums",
        )}
      >
        {value}
      </span>
      {bar === undefined ? null : (
        <span className="h-1 overflow-hidden rounded-full bg-surface-muted">
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-[300ms]"
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </span>
      )}
      <span className="text-small text-balance text-ink-muted">{hint}</span>
    </div>
  );
}

/** Rule 14: nothing about the streak is hidden. */
function StreakHelp({
  frozen,
  freezeLeft,
}: {
  frozen: string[];
  freezeLeft: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger
        className="-m-2 -mt-2.5 grid size-9 place-items-center rounded-control text-ink-subtle hover:text-ink"
        aria-label="How your streak works"
      >
        <Info className="size-4" aria-hidden />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How your streak works</DialogTitle>
          <DialogDescription>
            Counted from what you did, in your own timezone.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body">
          <li>
            A day counts when you finish a task or study for {STREAK_MINUTES}{" "}
            minutes.
          </li>
          <li>
            Today stays open until midnight; it never breaks your streak early.
          </li>
          <li>
            Each week (Monday to Sunday) one missed day is covered by a free
            freeze, automatically. A second missed day that week ends the run.
          </li>
          <li>
            The first thing you do each day earns {STREAK_XP_PER_DAY} XP per
            streak day, up to {STREAK_XP_CAP}.
          </li>
          <li>
            {freezeLeft
              ? "This week's freeze is unused."
              : "This week's freeze is used."}
          </li>
          {frozen.length > 0 ? (
            <li>Freezes kept your streak on: {frozen.join(", ")}.</li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
