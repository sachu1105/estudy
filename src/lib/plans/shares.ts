// How one user's day is divided between the exams they are preparing for. The plan engine
// stays a per-exam function (CLAUDE.md rule 3): it is handed one exam's slice of each
// weekday and knows nothing of the others. Pure: no server, next or prisma imports.
//
// Integer arithmetic only, like the engine's minutes, so the split is identical on every
// machine and the same roles always produce the same plan.

import { floor5, MIN_BLOCK } from "@/lib/plan-engine";

export type ExamRole = "FOCUS" | "ALONGSIDE" | "PAUSED";

/** An exam competing for the user's time. */
export type ShareExam = {
  /** The syllabus version the exam pod is built from. */
  id: string;
  role: ExamRole;
  /** Last study day, for a stable order between exams. Null sorts last. */
  endDate: string | null;
};

/**
 * Percent of the day for each scheduled exam, focus first. Alone, an exam takes the whole
 * day. Beyond that the focus keeps the larger share and the rest divide what is left, so
 * adding a third exam never costs the focus more than it costs the others.
 */
export function percentagesFor(alongsideCount: number): number[] {
  if (alongsideCount <= 0) return [100];
  if (alongsideCount === 1) return [70, 30];
  if (alongsideCount === 2) return [60, 20, 20];
  const each = Math.floor(40 / alongsideCount);
  const rest = Array.from({ length: alongsideCount }, () => each);
  return [100 - each * alongsideCount, ...rest];
}

/**
 * The exams that get time, focus first, then by how soon they end, then by id. Exactly one
 * exam leads: with no focus set, the soonest-ending one leads, so a missing role can never
 * make the split non-deterministic.
 */
export function scheduledExams(exams: readonly ShareExam[]): ShareExam[] {
  const running = exams.filter((e) => e.role !== "PAUSED");
  const byDate = [...running].sort(
    (a, b) =>
      Number(a.endDate === null) - Number(b.endDate === null) ||
      (a.endDate ?? "").localeCompare(b.endDate ?? "") ||
      a.id.localeCompare(b.id),
  );
  const lead = byDate.find((e) => e.role === "FOCUS") ?? byDate[0];
  if (!lead) return [];
  return [lead, ...byDate.filter((e) => e.id !== lead.id)];
}

/** One day's minutes divided between the scheduled exams, leader first. Sums to `total`. */
function splitDay(total: number, count: number): number[] {
  const slices = Array.from({ length: count }, () => 0);
  if (count === 0 || total <= 0) return slices;

  const pct = percentagesFor(count - 1);
  for (let i = 0; i < count; i++) slices[i] = floor5((total * pct[i]) / 100);
  // Rounding each slice down leaves crumbs. They go to the leader, so the day adds up
  // exactly and the answer never depends on the order the others were listed in.
  slices[0] += total - slices.reduce((sum, m) => sum + m, 0);

  // A slice too small to hold one study block would only fragment the day. It collapses
  // into the leader, which is why two exams on a 30-minute day behave like one.
  for (let i = 1; i < count; i++) {
    if (slices[i] < MIN_BLOCK) {
      slices[0] += slices[i];
      slices[i] = 0;
    }
  }
  return slices;
}

/**
 * Each exam's minutes for every weekday, Sunday first, keyed by exam id. Paused exams get
 * nothing. Every weekday's slices add up to exactly what the user gave that day, so two
 * plans can never book the same minute twice.
 */
export function splitMinutes(
  minutesByWeekday: readonly number[],
  exams: readonly ShareExam[],
): Map<string, number[]> {
  const order = scheduledExams(exams);
  const week = minutesByWeekday.map((m) => Math.max(0, Math.trunc(m)));
  const split = new Map<string, number[]>(
    exams.map((e) => [e.id, week.map(() => 0)]),
  );
  week.forEach((total, weekday) => {
    const slices = splitDay(total, order.length);
    order.forEach((exam, i) => {
      split.get(exam.id)![weekday] = slices[i];
    });
  });
  return split;
}

/** The exam that leads the day: the focus, or the soonest-ending one when none is set. */
export function focusOf(exams: readonly ShareExam[]): ShareExam | null {
  return scheduledExams(exams)[0] ?? null;
}
