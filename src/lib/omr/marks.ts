// An OMR answer sheet: 100 questions, options A-D. Pure, shared by the server and the
// sheet the user marks. A mark is -1 for blank or 0-3 for A-D.

export const OMR_QUESTIONS = 100;
export const OMR_OPTIONS = ["A", "B", "C", "D"] as const;
export const BLANK = -1;

export type Marks = number[];

export const blankMarks = (): Marks =>
  new Array<number>(OMR_QUESTIONS).fill(BLANK);

/** Any stored or posted list, made exactly 100 long with only -1..3 in it. */
export function normaliseMarks(raw: readonly unknown[] | null | undefined) {
  return blankMarks().map((_, i) => {
    const value = raw?.[i];
    return Number.isInteger(value) &&
      (value as number) >= 0 &&
      (value as number) < OMR_OPTIONS.length
      ? (value as number)
      : BLANK;
  });
}

/** Marking the option already marked clears the bubble, like rubbing it out. */
export function toggleMark(marks: Marks, question: number, option: number) {
  const next = [...marks];
  next[question] = marks[question] === option ? BLANK : option;
  return next;
}

export const markedCount = (marks: Marks) =>
  marks.filter((m) => m !== BLANK).length;
