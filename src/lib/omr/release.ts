// What someone who doesn't own a paper sees after handing it in: the paper's owner sets
// when scores come out (straight after each hand-in, or at a time) and whether the key
// ever does (or the score only). The owner always sees everything. Pure: `now` is passed
// in (rule 12).

export type PaperRelease = {
  /** Null: each score comes out as its sheet is handed in. */
  resultsAt: Date | null;
  /** The score only: never the key or the question-by-question review. */
  keyHidden: boolean;
};

/** Scores are out for people who don't own the paper. */
export const resultsOut = (r: PaperRelease, now: Date) =>
  r.resultsAt === null || now >= r.resultsAt;

/** The key (and the review against it) is out for people who don't own the paper. */
export const keyOut = (r: PaperRelease, now: Date) =>
  !r.keyHidden && resultsOut(r, now);

/**
 * The later of two results times, where null means "right away": a squad exam's results
 * wait for the paper's own time too, so sharing never shows a score early.
 */
export function laterResults(a: Date | null, b: Date | null): Date | null {
  if (a === null) return b;
  if (b === null) return a;
  return a >= b ? a : b;
}
