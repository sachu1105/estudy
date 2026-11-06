// An OMR answer sheet: its questions, each with options A, B and on. Pure, shared by the
// server and the sheet the user marks. A mark is -1 for blank or 0.. for A, B, and on.

export const OPTION_LETTERS = ["A", "B", "C", "D", "E"] as const;
export const OPTION_COUNTS = [4, 5] as const;
export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 200;
export const BLANK = -1;

/** How a sheet is printed: how many questions, and options per question. */
export type Shape = { questions: number; options: number };
/** Kerala PSC's OMR papers: 100 questions, A to D. */
export const DEFAULT_SHAPE: Shape = { questions: 100, options: 4 };

export type Marks = number[];

export const letters = (options: number) => OPTION_LETTERS.slice(0, options);

export const blankMarks = (questions = DEFAULT_SHAPE.questions): Marks =>
  new Array<number>(questions).fill(BLANK);

/** Any stored or posted list, made exactly the sheet's length with only valid marks. */
export function normaliseMarks(
  raw: readonly unknown[] | null | undefined,
  shape: Shape = DEFAULT_SHAPE,
) {
  return blankMarks(shape.questions).map((_, i) => {
    const value = raw?.[i];
    return Number.isInteger(value) &&
      (value as number) >= 0 &&
      (value as number) < shape.options
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
