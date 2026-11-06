import { describe, expect, it } from "vitest";

import {
  add,
  compare,
  frac,
  formatRule,
  formatScore,
  parseFraction,
  sub,
  times,
} from "./fraction";

describe("fraction", () => {
  it("keeps thirds exact: 30 wrong answers cost exactly 10", () => {
    expect(times(frac(1, 3), 30)).toEqual(frac(10));
    expect(sub(frac(68), times(frac(1, 3), 20))).toEqual(frac(184, 3));
    expect(add(frac(1, 3), frac(2, 3))).toEqual({ n: 1, d: 1 });
    expect(frac(2, -4)).toEqual({ n: -1, d: 2 });
    expect(frac(0, 5)).toEqual({ n: 0, d: 1 });
  });

  it("compares", () => {
    expect(compare(frac(184, 3), frac(61))).toBe(1);
    expect(compare(frac(122, 2), frac(61))).toBe(0);
    expect(compare(frac(-1, 3), frac(0))).toBe(-1);
  });

  it("shows a score to two places, dropping trailing zeros", () => {
    expect(formatScore(frac(184, 3))).toBe("61.33");
    expect(formatScore(frac(188, 3))).toBe("62.67");
    expect(formatScore(frac(125, 2))).toBe("62.5");
    expect(formatScore(frac(62))).toBe("62");
    expect(formatScore(frac(-4, 3))).toBe("−1.33");
    expect(formatScore(frac(0))).toBe("0");
  });

  it("shows a rule the way people write it", () => {
    expect(formatRule(frac(1))).toBe("1");
    expect(formatRule(frac(1, 4))).toBe("0.25");
    expect(formatRule(frac(1, 3))).toBe("1/3");
    expect(formatRule(frac(1, 2))).toBe("0.5");
  });

  it("reads what people type", () => {
    expect(parseFraction("1/3")).toEqual(frac(1, 3));
    expect(parseFraction(" 2 / 6 ")).toEqual(frac(1, 3));
    expect(parseFraction("0.25")).toEqual(frac(1, 4));
    expect(parseFraction(".5")).toEqual(frac(1, 2));
    expect(parseFraction("0.33")).toEqual(frac(33, 100));
    expect(parseFraction("45")).toEqual(frac(45));
    expect(parseFraction("0")).toEqual(frac(0));
    for (const bad of ["", ".", "-1", "1/0", "1/101", "abc", "1.2345", "1001"])
      expect(parseFraction(bad), bad).toBeNull();
  });
});
