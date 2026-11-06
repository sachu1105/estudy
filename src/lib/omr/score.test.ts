import { describe, expect, it } from "vitest";

import { frac } from "./fraction";
import { CANCELLED, NO_KEY } from "./key";
import { BLANK } from "./marks";
import { DEFAULT_MARKING, type Marking } from "./marking";
import { scoreSheet } from "./score";

// A = 1, B = 2, C = 4, D = 8 in a key; 0..3 on a sheet.
const A = 1;
const B = 2;
const C = 4;

const psc = (over: Partial<Marking> = {}): Marking => ({
  ...DEFAULT_MARKING,
  ...over,
});

describe("scoreSheet", () => {
  it("gives +1 for right and takes 1/3 for wrong, exactly", () => {
    // 68 right, 20 wrong, 12 blank out of 100.
    const key = new Array(100).fill(A);
    const marks = [
      ...new Array(68).fill(0),
      ...new Array(20).fill(1),
      ...new Array(12).fill(BLANK),
    ];
    const s = scoreSheet(marks, key, psc({ cutoff: frac(60) }));
    expect([s.right, s.wrong, s.blank, s.unkeyed]).toEqual([68, 20, 12, 0]);
    expect(s.lost).toEqual(frac(20, 3));
    expect(s.score).toEqual(frac(184, 3));
    expect(s.max).toEqual(frac(100));
    expect(s.passed).toBe(true);
    expect(scoreSheet(marks, key, psc({ cutoff: frac(62) })).passed).toBe(
      false,
    );
  });

  it("accepts either answer when the key allows two", () => {
    const s = scoreSheet([0, 2, 1], [A | C, A | C, A | C], psc());
    expect(s.outcomes).toEqual(["right", "right", "wrong"]);
  });

  it("gives everyone a cancelled question's mark under AWARD", () => {
    const s = scoreSheet([1, BLANK, 0], [CANCELLED, CANCELLED, A], psc());
    expect(s.outcomes).toEqual(["cancelled", "cancelled", "right"]);
    expect(s.score).toEqual(frac(3));
    expect(s.max).toEqual(frac(3));
  });

  it("leaves cancelled questions out and scales under SCALE", () => {
    // 4 questions, 1 cancelled: 2 right of the 3 that stand, scaled to 4.
    const s = scoreSheet(
      [0, 0, 1, 0],
      [A, A, A, CANCELLED],
      psc({ wrong: frac(0), cancelled: "SCALE" }),
    );
    expect(s.score).toEqual(frac(8, 3));
    expect(s.max).toEqual(frac(4));
  });

  it("doesn't score unkeyed questions or decide the cut-off until the key is whole", () => {
    const s = scoreSheet([0, 1, 1], [A, NO_KEY, B], psc({ cutoff: frac(1) }));
    expect(s.outcomes).toEqual(["right", "unkeyed", "right"]);
    expect(s.score).toEqual(frac(2));
    expect(s.max).toEqual(frac(2));
    expect(s.passed).toBeNull();
  });

  it("can go below zero", () => {
    const s = scoreSheet([1, 1, 1], [A, A, A], psc());
    expect(s.score).toEqual(frac(-1));
  });

  it("is the same every time for the same input", () => {
    const run = () =>
      JSON.stringify(scoreSheet([0, 1, BLANK], [A, C, B], psc()));
    expect(run()).toBe(run());
  });
});
