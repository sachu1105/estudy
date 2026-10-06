// XP rules (product rules). Ranks use XP; the ledger is append-only.

/** 1 XP per verified study minute, at most this many a day. */
export const STUDY_XP_DAILY_CAP = 300;
export const TASK_XP = 10;
/** A small bonus on the day's first activity, growing with the streak. */
export const STREAK_XP_PER_DAY = 2;
export const STREAK_XP_CAP = 20;

/** XP for `minutes` more study, given the study XP already earned today. */
export function studyXp(minutes: number, earnedToday: number) {
  return Math.max(0, Math.min(minutes, STUDY_XP_DAILY_CAP - earnedToday));
}

export function streakXp(streak: number) {
  return streak >= 2 ? Math.min(STREAK_XP_CAP, streak * STREAK_XP_PER_DAY) : 0;
}
