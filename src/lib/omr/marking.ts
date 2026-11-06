// How a paper is marked: what a right answer earns, what a wrong one costs, the cut-off,
// and what a cancelled question is worth. Pure.

import { formatRule, frac, type Fraction } from "./fraction";

export type CancelRule = "AWARD" | "SCALE";

export type Marking = {
  right: Fraction;
  /** Taken off for each wrong answer; zero for no negative marking. */
  wrong: Fraction;
  cutoff: Fraction | null;
  cancelled: CancelRule;
};

export type MarkingPreset = {
  key: string;
  label: string;
  right: Fraction;
  wrong: Fraction;
};

/** The common schemes, one tap each. Anything else is "Custom". */
export const MARKING_PRESETS: readonly MarkingPreset[] = [
  { key: "psc", label: "PSC style", right: frac(1), wrong: frac(1, 3) },
  { key: "quarter", label: "Quarter off", right: frac(1), wrong: frac(1, 4) },
  { key: "ssc", label: "Two marks", right: frac(2), wrong: frac(1, 2) },
  { key: "none", label: "No negative", right: frac(1), wrong: frac(0) },
];

export const DEFAULT_MARKING: Marking = {
  right: frac(1),
  wrong: frac(1, 3),
  cutoff: null,
  cancelled: "AWARD",
};

const same = (a: Fraction, b: Fraction) => a.n === b.n && a.d === b.d;

/** The preset this marking matches, or null for custom. */
export const presetOf = (m: Pick<Marking, "right" | "wrong">) =>
  MARKING_PRESETS.find((p) => same(p.right, m.right) && same(p.wrong, m.wrong))
    ?.key ?? null;

export const CANCEL_RULES: {
  value: CancelRule;
  label: string;
  hint: string;
}[] = [
  {
    value: "AWARD",
    label: "Everyone gets the mark",
    hint: "A cancelled question counts as right for everyone.",
  },
  {
    value: "SCALE",
    label: "Leave it out and scale",
    hint: "The score is worked out over the rest, then scaled up to the full total.",
  },
];

/** "+1 / −1/3", "+2 / −0.5", "+1, no negative marking". */
export function describeMarking(m: Pick<Marking, "right" | "wrong">) {
  const right = `+${formatRule(m.right)}`;
  return m.wrong.n === 0
    ? `${right}, no negative marking`
    : `${right} / −${formatRule(m.wrong)}`;
}
