"use client";

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

type StreakButtonProps = {
  streak: { current: number; todayDone: boolean; freezeLeft: boolean };
  frozen: string[];
  today: string;
};

/**
 * The streak sits beside the page title and opens how it is counted (rule 14: nothing
 * about the streak is hidden).
 */
export function StreakButton({ streak, frozen, today }: StreakButtonProps) {
  const status = streak.todayDone
    ? "Today counts."
    : streak.current > 0
      ? "Do one task today to keep it going."
      : "Do one task today to start one.";
  return (
    <Dialog>
      <DialogTrigger
        className="-m-1.5 rounded-full p-1.5"
        aria-label={`${streak.current} day streak. How your streak works`}
      >
        <StreakChip
          days={streak.current}
          celebrateKey={streak.todayDone ? today : null}
        />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{streak.current} day streak</DialogTitle>
          <DialogDescription>{status}</DialogDescription>
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
            {streak.freezeLeft
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
