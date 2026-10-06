"use client";

import { Info } from "lucide-react";

import { StreakChip } from "@/components/blocks/streak-chip";
import { Card } from "@/components/ui/card";
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

/** The streak, and how it's counted (rule 14: nothing about it is hidden). */
export function StreakTile({
  current,
  todayDone,
  freezeLeft,
  frozen,
  today,
}: {
  current: number;
  todayDone: boolean;
  freezeLeft: boolean;
  frozen: string[];
  today: string;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-micro text-ink-muted uppercase">Streak</span>
        <Dialog>
          <DialogTrigger
            className="-m-2 grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink md:size-9"
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
                A day counts when you finish a task or study for{" "}
                {STREAK_MINUTES} minutes.
              </li>
              <li>
                Today stays open until midnight; it never breaks your streak
                early.
              </li>
              <li>
                Each week (Monday to Sunday) one missed day is covered by a free
                freeze, automatically. A second missed day that week ends the
                run.
              </li>
              <li>
                The first thing you do each day earns {STREAK_XP_PER_DAY} XP per
                streak day, up to {STREAK_XP_CAP}.
              </li>
              {frozen.length > 0 ? (
                <li>Freezes kept your streak on: {frozen.join(", ")}.</li>
              ) : null}
            </ul>
          </DialogContent>
        </Dialog>
      </div>
      <StreakChip
        days={current}
        celebrateKey={todayDone ? today : null}
        className="h-10 self-start px-3 text-body"
      />
      <span className="text-small text-ink-muted">
        {todayDone
          ? "Today counts. "
          : current > 0
            ? "Finish a task today to keep it going. "
            : "Finish a task today to start one. "}
        {freezeLeft
          ? "This week's freeze is unused."
          : "This week's freeze is used."}
      </span>
    </Card>
  );
}
