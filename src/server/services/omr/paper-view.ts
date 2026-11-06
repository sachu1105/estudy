import { frac } from "@/lib/omr/fraction";
import { keyedCount, normaliseKey } from "@/lib/omr/key";
import { normaliseMarks, type Shape } from "@/lib/omr/marks";
import type { Marking } from "@/lib/omr/marking";
import { scoreSheet } from "@/lib/omr/score";
import type { PaperRow } from "@/server/repositories/paper-repository";

// A paper as the services hand it out, and a sheet marked against its key.

export type KeySource = "OWN" | "OFFICIAL";

export const shapeOf = (p: PaperRow): Shape => ({
  questions: p.questionCount,
  options: p.optionCount,
});

export const markingOf = (p: PaperRow): Marking => ({
  right: frac(p.rightNum, p.rightDen),
  wrong: frac(p.wrongNum, p.wrongDen),
  cutoff:
    p.cutoffNum === null || p.cutoffDen === null
      ? null
      : frac(p.cutoffNum, p.cutoffDen),
  cancelled: p.cancelRule,
});

/** A paper as the pages get it: everything but the file and the key itself. */
export function paperView(p: PaperRow) {
  const key = normaliseKey(p.answerKey, shapeOf(p));
  return {
    id: p.id,
    title: p.title,
    pageCount: p.pageCount,
    shape: shapeOf(p),
    marking: markingOf(p),
    limitMin: p.limitMin,
    keySource: p.keySource as KeySource,
    keyed: keyedCount(key),
    keyUpdatedAt: p.keyUpdatedAt,
  };
}
export type PaperView = ReturnType<typeof paperView>;

/** A hand-in marked against the paper's current key. */
export function scored(p: PaperRow, marks: number[]) {
  const shape = shapeOf(p);
  return scoreSheet(
    normaliseMarks(marks, shape),
    normaliseKey(p.answerKey, shape),
    markingOf(p),
  );
}
