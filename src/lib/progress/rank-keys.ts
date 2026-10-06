// Leaderboard periods (milestone 12). Weeks start on Monday in the user's calendar.

import { addDays, toDay, weekdayOf } from "@/lib/plan-engine";

export type RankPeriod = "week" | "month" | "all";

export function weekStart(day: string) {
  return addDays(day, -((weekdayOf(toDay(day)) + 6) % 7));
}

/** The Redis key of a board: global or one exam's, for the period holding `day`. */
export function rankKey(
  period: RankPeriod,
  day: string,
  examId?: string | null,
) {
  const scope = examId ? `rank:exam:${examId}` : "rank:global";
  if (period === "all") return `${scope}:all`;
  if (period === "week") return `${scope}:w:${weekStart(day)}`;
  return `${scope}:m:${day.slice(0, 7)}`;
}
