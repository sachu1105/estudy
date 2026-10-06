// The daily streak, derived from the logs (rule 6). Pure: the caller passes the days that
// had activity and today, both as the user's calendar days.

import { addDays, toDay, weekdayOf } from "@/lib/plan-engine";

/** A day counts once the user finishes a task or studies this many active minutes. */
export const STREAK_MINUTES = 10;

export type Streak = {
  /** Active days in the current run (frozen days keep it alive but don't add). */
  current: number;
  /** Today already counts. False means today is still open, not that the streak broke. */
  todayDone: boolean;
  /** Missed days a weekly freeze covered, newest first. */
  frozen: string[];
  /** Whether this week's freeze is still unused. */
  freezeLeft: boolean;
};

/** Monday of the week a day belongs to: one freeze per Monday-to-Sunday week. */
const weekOf = (day: number) => day - ((weekdayOf(day) + 6) % 7);

/**
 * Walks back from today. An active day adds one; a missed day is covered by its week's
 * freeze if that week hasn't used one, otherwise the run ends. Freezes only count when
 * they bridge to an earlier active day, so a freeze never props up a streak of nothing.
 */
export function computeStreak(
  activeDays: Iterable<string>,
  today: string,
): Streak {
  const active = new Set([...activeDays].map(toDay));
  const now = toDay(today);
  const todayDone = active.has(now);
  const earliest = Math.min(now, ...active);

  let current = 0;
  const frozenWeeks = new Set<number>();
  let pending: number[] = []; // freezes not yet backed by an earlier active day
  const frozen: number[] = [];
  for (let day = todayDone ? now : now - 1; day >= earliest; day--) {
    if (active.has(day)) {
      current++;
      frozen.push(...pending);
      pending = [];
      continue;
    }
    const week = weekOf(day);
    if (frozenWeeks.has(week)) break;
    frozenWeeks.add(week);
    pending.push(day);
  }
  const usedThisWeek = frozen.some((d) => weekOf(d) === weekOf(now));
  return {
    current,
    todayDone,
    frozen: frozen.map((d) => addDays(today, d - now)),
    freezeLeft: !usedThisWeek,
  };
}
