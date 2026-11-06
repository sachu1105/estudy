// A handed-in sheet, marked against the key. Pure and deterministic: the same marks, key
// and marking always give the same result, and nothing is stored, so a corrected key
// corrects every result.

import { BLANK, type Marks } from "./marks";
import { accepts, CANCELLED, NO_KEY, type AnswerKey } from "./key";
import {
  compare,
  div,
  frac,
  mul,
  sub,
  times,
  ZERO,
  type Fraction,
} from "./fraction";
import type { Marking } from "./marking";

export type Outcome = "right" | "wrong" | "blank" | "cancelled" | "unkeyed";

export type Score = {
  outcomes: Outcome[];
  right: number;
  wrong: number;
  /** Keyed questions left blank. */
  blank: number;
  cancelled: number;
  /** Questions with no key yet: not scored either way. */
  unkeyed: number;
  /** What right answers earned (cancelled ones included under AWARD). */
  earned: Fraction;
  /** What negative marking took off. */
  lost: Fraction;
  score: Fraction;
  /** The full mark over the questions that are keyed. */
  max: Fraction;
  /** Against the cut-off, once every question is keyed; null otherwise. */
  passed: boolean | null;
};

export function scoreSheet(
  marks: Marks,
  key: AnswerKey,
  marking: Marking,
): Score {
  const outcomes = key.map((entry, q): Outcome => {
    if (entry === CANCELLED) return "cancelled";
    if (entry === NO_KEY) return "unkeyed";
    const mark = marks[q] ?? BLANK;
    if (mark === BLANK) return "blank";
    return accepts(entry, mark) ? "right" : "wrong";
  });
  const count = (o: Outcome) => outcomes.filter((x) => x === o).length;
  const right = count("right");
  const wrong = count("wrong");
  const cancelled = count("cancelled");
  const unkeyed = count("unkeyed");
  const keyed = key.length - unkeyed;

  const award = marking.cancelled === "AWARD" ? cancelled : 0;
  const earned = times(marking.right, right + award);
  const lost = times(marking.wrong, wrong);
  let score = sub(earned, lost);
  // Scaled: worked out over the questions that stand, then up to the full total.
  if (marking.cancelled === "SCALE" && cancelled > 0 && keyed > cancelled)
    score = mul(score, div(frac(keyed), frac(keyed - cancelled)));
  if (marking.cancelled === "SCALE" && keyed === cancelled) score = ZERO;

  const max = times(marking.right, keyed);
  return {
    outcomes,
    right,
    wrong,
    blank: count("blank"),
    cancelled,
    unkeyed,
    earned,
    lost,
    score,
    max,
    passed:
      marking.cutoff === null || unkeyed > 0 || keyed === 0
        ? null
        : compare(score, marking.cutoff) >= 0,
  };
}
