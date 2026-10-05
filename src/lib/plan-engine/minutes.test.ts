import { describe, expect, it } from "vitest";

import {
  dayCapacity,
  revisionMinutes,
  revisionOffsets,
  reviewDayCount,
  round5,
  studyMinutes,
} from "./minutes";

describe("minutes", () => {
  it("rounds to the nearest 5 without floating point", () => {
    expect(round5(37)).toBe(35);
    expect(round5(37.5 * 2, 2)).toBe(40);
    expect(round5(1_125_000, 10_000)).toBe(115);
  });

  it("applies intensity and confidence multipliers from CLAUDE.md", () => {
    // weight 3, difficulty 3 -> base 30 + 24 + 16 = 70
    expect(studyMinutes(3, 3, "STEADY", 3)).toBe(70);
    expect(studyMinutes(3, 3, "INTENSE", 3)).toBe(90); // 70 * 1.3 = 91 -> 90
    expect(studyMinutes(3, 3, "LIGHT", 3)).toBe(55); // 52.5 -> 55
    expect(studyMinutes(3, 3, "STEADY", 1)).toBe(110); // 70 * 1.6 = 112 -> 110
    expect(studyMinutes(3, 3, "STEADY", 5)).toBe(35);
    expect(studyMinutes(1, 1, "LIGHT", 5)).toBe(15); // never below one minimum block
  });

  it("orders confidence and intensity monotonically", () => {
    for (let c = 1; c < 5; c++) {
      expect(studyMinutes(4, 4, "STEADY", c as 1)).toBeGreaterThan(
        studyMinutes(4, 4, "STEADY", (c + 1) as 2),
      );
    }
    expect(studyMinutes(4, 4, "INTENSE", 3)).toBeGreaterThan(
      studyMinutes(4, 4, "STEADY", 3),
    );
    expect(studyMinutes(4, 4, "STEADY", 3)).toBeGreaterThan(
      studyMinutes(4, 4, "LIGHT", 3),
    );
  });

  it("gives low confidence and weak topics extra revision touches", () => {
    expect(revisionOffsets(3, false)).toEqual([3, 10, 30]);
    expect(revisionOffsets(2, false)).toEqual([1, 3, 10, 30]);
    expect(revisionOffsets(4, true)).toEqual([3, 6, 10, 30]);
    expect(revisionMinutes(40)).toBe(10);
    expect(revisionMinutes(110)).toBe(20);
  });

  it("keeps a 10% buffer and reserves 15% of the horizon", () => {
    expect(dayCapacity(120)).toBe(108);
    expect(dayCapacity(0)).toBe(0);
    expect(reviewDayCount(30)).toBe(5);
    expect(reviewDayCount(180)).toBe(27);
    expect(reviewDayCount(3)).toBe(0);
  });
});
