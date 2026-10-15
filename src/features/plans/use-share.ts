"use client";

import { useMemo } from "react";

import type { DraftSharing } from "@/lib/plans/draft";
import { splitMinutes } from "@/lib/plans/shares";

/**
 * This exam's slice of a week the user is still editing. The setup steps divide the day with
 * the same function the plan engine will be fed from, so what the user is promised here and
 * what they get are the same number rather than two guesses at it.
 */
export function useShare(
  sharing: DraftSharing,
  minutesByWeekday: readonly number[],
) {
  return useMemo(() => {
    const split = splitMinutes(minutesByWeekday, sharing.exams);
    const sum = (id: string) =>
      (split.get(id) ?? []).reduce((n, m) => n + m, 0);
    return {
      /** This exam's minutes for each weekday, Sunday first. */
      mine: split.get(sharing.examId) ?? [],
      mineWeekly: sum(sharing.examId),
      others: sharing.exams
        .filter((e) => e.id !== sharing.examId)
        .map((e) => ({
          id: e.id,
          title: sharing.titles[e.id] ?? "Your other exam",
          weeklyMinutes: sum(e.id),
        })),
      /** Another exam is running, so the share is worth mentioning at all. */
      shared: sharing.exams.length > 1,
    };
  }, [sharing, minutesByWeekday]);
}
