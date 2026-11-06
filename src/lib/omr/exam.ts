// A question paper shared as an exam: when it's open, when results come out, and when a
// sitting's clock runs out. Pure: `now` is passed in (rule 12).

export type ExamWindow = {
  opensAt: Date;
  closesAt: Date | null;
  /** Null: each result comes out as the sheet is handed in. */
  resultsAt: Date | null;
};

export type ExamStatus = "upcoming" | "open" | "closed";

export function examStatus(w: ExamWindow, now: Date): ExamStatus {
  if (now < w.opensAt) return "upcoming";
  if (w.closesAt !== null && now >= w.closesAt) return "closed";
  return "open";
}

/** Results (and the key) are out. */
export const released = (w: ExamWindow, now: Date) =>
  w.resultsAt === null || now >= w.resultsAt;

/**
 * When a sitting started now runs out: the paper's time, cut short by the exam's close.
 * Someone who starts late gets until the close, never past it. Null: no limit at all.
 */
export function sittingEndsAt(
  now: Date,
  limitMin: number | null,
  closesAt: Date | null,
): Date | null {
  const byLimit =
    limitMin === null ? null : new Date(now.getTime() + limitMin * 60_000);
  if (byLimit === null) return closesAt;
  if (closesAt === null) return byLimit;
  return byLimit < closesAt ? byLimit : closesAt;
}

/** Register numbers start here, like a hall ticket's. */
export const FIRST_REGISTER_NO = 1001;

export type ReleaseChoice = "now" | "close" | "at";

/**
 * The results time from the sharer's choice: right away (null), when the exam closes, or
 * at a time. Null for an invalid mix (when it closes, but it never closes).
 */
export function resultsAtFor(
  choice: ReleaseChoice,
  closesAt: Date | null,
  at: Date | null,
): { resultsAt: Date | null } | null {
  if (choice === "now") return { resultsAt: null };
  if (choice === "close") return closesAt ? { resultsAt: closesAt } : null;
  return at ? { resultsAt: at } : null;
}
