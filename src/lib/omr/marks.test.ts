import { describe, expect, it } from "vitest";

import {
  BLANK,
  DEFAULT_SHAPE,
  blankMarks,
  markedCount,
  normaliseMarks,
  toggleMark,
} from "./marks";

describe("omr marks", () => {
  it("is 100 questions of blank or A-D unless the paper says otherwise", () => {
    expect(blankMarks()).toHaveLength(DEFAULT_SHAPE.questions);
    const marks = normaliseMarks([0, 3, 4, -2, 1.5, "1", null]);
    expect(marks).toHaveLength(100);
    expect(marks.slice(0, 7)).toEqual([
      0,
      3,
      BLANK,
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ]);
    expect(normaliseMarks(new Array(150).fill(2))).toHaveLength(100);
    expect(normaliseMarks(null)).toEqual(blankMarks());
  });

  it("follows the paper's shape: 120 questions, A to E", () => {
    const marks = normaliseMarks([4, 5, 0], { questions: 120, options: 5 });
    expect(marks).toHaveLength(120);
    expect(marks.slice(0, 3)).toEqual([4, BLANK, 0]);
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
