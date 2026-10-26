import { describe, expect, it } from "vitest";

import {
  BLANK,
  OMR_QUESTIONS,
  blankMarks,
  markedCount,
  normaliseMarks,
  toggleMark,
} from "./marks";

describe("omr marks", () => {
  it("is always 100 questions of blank or A-D", () => {
    expect(blankMarks()).toHaveLength(OMR_QUESTIONS);
    const marks = normaliseMarks([0, 3, 4, -2, 1.5, "1", null]);
    expect(marks).toHaveLength(OMR_QUESTIONS);
    expect(marks.slice(0, 7)).toEqual([
      0,
      3,
      BLANK,
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ]);
    expect(normaliseMarks(new Array(150).fill(2))).toHaveLength(OMR_QUESTIONS);
    expect(normaliseMarks(null)).toEqual(blankMarks());
  });

  it("marks, changes and clears a bubble", () => {
    let marks = toggleMark(blankMarks(), 4, 2);
    expect(marks[4]).toBe(2);
    marks = toggleMark(marks, 4, 0);
    expect(marks[4]).toBe(0);
    expect(markedCount(marks)).toBe(1);
    marks = toggleMark(marks, 4, 0);
    expect(marks[4]).toBe(BLANK);
    expect(markedCount(marks)).toBe(0);
  });
});
