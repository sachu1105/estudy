// When each of the three reminders is due. Pure: the worker passes the person's local
// time and what they have done today, and gets back what to send (milestone 16).
//
// Exactly three kinds exist, and each one is sent at most once a day:
//   SESSION  at the start of the study window the person chose
//   STREAK   in the evening, only when nothing has been logged today
//   WEEKLY   when the week's summary is ready
// Quiet hours hold everything back; a reminder inside them is dropped, not queued.

export type ReminderKind = "SESSION" | "STREAK" | "WEEKLY";

export type Prefs = {
  sessionReminder: boolean;
  streakAtRisk: boolean;
  weeklySummary: boolean;
  byEmail: boolean;
  byPush: boolean;
  /** Local minutes from midnight. */
  windowStartMin: number;
  quietFromMin: number;
  quietToMin: number;
};

export type Facts = {
  /** Local minutes from midnight, in the person's own timezone. */
  nowMin: number;
  /** 1 = Monday … 7 = Sunday, locally. */
  weekday: number;
  /** Anything studied or ticked today. */
  studiedToday: boolean;
  /** They have a streak worth saving. */
  streak: number;
  /** A weekly summary is waiting and hasn't been announced. */
  weeklyReady: boolean;
  /** Kinds already sent today, so nothing repeats. */
  sentToday: ReminderKind[];
};

/** The hour the streak warning goes out, if nothing has been logged by then. */
export const STREAK_HOUR_MIN = 20 * 60;
/** A reminder is sent within this many minutes of its time, never later. */
export const WINDOW_MIN = 30;

/** Quiet hours may wrap past midnight (22:00 to 07:00). */
export function inQuietHours(nowMin: number, fromMin: number, toMin: number) {
  if (fromMin === toMin) return false;
  return fromMin < toMin
    ? nowMin >= fromMin && nowMin < toMin
    : nowMin >= fromMin || nowMin < toMin;
}

const due = (nowMin: number, atMin: number) =>
  nowMin >= atMin && nowMin < atMin + WINDOW_MIN;

/** The kinds to send right now, in the order they matter. */
export function remindersDue(prefs: Prefs, facts: Facts): ReminderKind[] {
  if (!prefs.byEmail && !prefs.byPush) return [];
  if (inQuietHours(facts.nowMin, prefs.quietFromMin, prefs.quietToMin))
    return [];
  const sent = new Set(facts.sentToday);
  const out: ReminderKind[] = [];

  if (
    prefs.weeklySummary &&
    facts.weeklyReady &&
    !sent.has("WEEKLY") &&
    facts.weekday === 1 &&
    due(facts.nowMin, prefs.windowStartMin)
  )
    out.push("WEEKLY");

  if (
    prefs.sessionReminder &&
    !sent.has("SESSION") &&
    !facts.studiedToday &&
    due(facts.nowMin, prefs.windowStartMin)
  )
    out.push("SESSION");

  // Only when there is a streak to lose, and nothing has been done all day.
  if (
    prefs.streakAtRisk &&
    !sent.has("STREAK") &&
    !facts.studiedToday &&
    facts.streak > 0 &&
    due(facts.nowMin, STREAK_HOUR_MIN)
  )
    out.push("STREAK");

  return out;
}

/** Minutes from midnight for a "HH:MM" string, or null when it isn't one. */
export function minutesOf(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function timeOf(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  return `${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
