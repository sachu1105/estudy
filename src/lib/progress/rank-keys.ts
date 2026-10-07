// The squad rank's weekly board. Weeks start on Monday in the user's calendar.

import { addDays, toDay, weekdayOf } from "@/lib/plan-engine";

export function weekStart(day: string) {
  return addDays(day, -((weekdayOf(toDay(day)) + 6) % 7));
}

/** The Redis key of the weekly XP board for the week holding `day`. */
export function weekKey(day: string) {
  return `rank:global:w:${weekStart(day)}`;
}
