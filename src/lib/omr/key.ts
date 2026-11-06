// A paper's answer key: one entry per question. Pure.
//   0   not keyed yet
//   -1  cancelled (the board dropped the question)
//   >0  the accepted options as bits: bit 0 is A, so 1 = A, 4 = C, 5 = A or C.
// More than one bit is how a key accepts two answers, as boards sometimes do.

import { letters, OPTION_LETTERS, type Shape } from "./marks";

export const NO_KEY = 0;
export const CANCELLED = -1;

export type AnswerKey = number[];

export const blankKey = (questions: number): AnswerKey =>
  new Array<number>(questions).fill(NO_KEY);

const full = (options: number) => (1 << options) - 1;

/** A stored or posted key, the sheet's length, with only valid entries. */
export function normaliseKey(
  raw: readonly unknown[] | null | undefined,
  shape: Shape,
): AnswerKey {
  return blankKey(shape.questions).map((_, i) => {
    const value = raw?.[i];
    if (value === CANCELLED) return CANCELLED;
    return Number.isInteger(value) && (value as number) > 0
      ? (value as number) & full(shape.options)
      : NO_KEY;
  });
}

export const accepts = (entry: number, option: number) =>
  entry > 0 && (entry & (1 << option)) !== 0;

/** Tapping an option adds it to the accepted answers, or takes it away. */
export function toggleOption(key: AnswerKey, question: number, option: number) {
  const next = [...key];
  const entry = Math.max(key[question] ?? NO_KEY, NO_KEY);
  next[question] = entry ^ (1 << option);
  return next;
}

/** Cancel a question, or bring it back with no key. */
export function toggleCancelled(key: AnswerKey, question: number) {
  const next = [...key];
  next[question] = key[question] === CANCELLED ? NO_KEY : CANCELLED;
  return next;
}

export const keyedCount = (key: AnswerKey) =>
  key.filter((entry) => entry !== NO_KEY).length;

/** "C", "A or C", "Cancelled", or "No key". */
export function describeEntry(entry: number) {
  if (entry === CANCELLED) return "Cancelled";
  if (entry <= 0) return "No key";
  const accepted = OPTION_LETTERS.filter((_, o) => accepts(entry, o));
  return accepted.join(" or ");
}

export type ParsedKey =
  { ok: true; entries: Map<number, number> } | { ok: false; error: string };

/**
 * A key as people paste it from an answer key PDF or type it in. Two forms:
 *   ACDBB CADB...          one letter per question in order (spaces and commas ignored)
 *   1-A 2.C 3) D 4 AB 5 X  numbered; two letters accept both, X or * cancels
 * Returns the entries it found (question index to key entry) so the rest stay as they are.
 */
export function parseKey(text: string, shape: Shape): ParsedKey {
  const allowed = letters(shape.options).join("");
  const last = OPTION_LETTERS[shape.options - 1];
  const entryOf = (code: string) => {
    if (code === "X" || code === "*") return CANCELLED;
    let entry = 0;
    for (const ch of code) entry |= 1 << allowed.indexOf(ch);
    return entry;
  };
  const badLetter = (code: string) =>
    [...code].some((ch) => ch !== "X" && ch !== "*" && !allowed.includes(ch));
  const upper = text.toUpperCase();
  const entries = new Map<number, number>();

  if (/\d/.test(upper)) {
    const pair = /(\d{1,3})\s*[.):=\-]?\s*([A-Z*]{1,5})(?![A-Z])/g;
    for (const [, number, code] of upper.matchAll(pair)) {
      const question = Number(number) - 1;
      if (question < 0 || question >= shape.questions)
        return {
          ok: false,
          error: `Question ${number} isn't on this paper. It has ${shape.questions} questions.`,
        };
      if (badLetter(code!) || (code!.length > 1 && /[X*]/.test(code!)))
        return {
          ok: false,
          error: `Question ${number} says "${code}". Use letters A to ${last}, or X for a cancelled question.`,
        };
      entries.set(question, entryOf(code!));
    }
    // Digits but no pairs: probably a stray number.
    if (entries.size === 0)
      return {
        ok: false,
        error:
          "No answers found. Write them like 1-A 2-C, or just ACDB in order.",
      };
    return { ok: true, entries };
  }

  const codes = upper.replace(/[\s,;|/-]+/g, "");
  if (codes.length === 0) return { ok: false, error: "Paste the key first." };
  const stray = [...codes].find((ch) => badLetter(ch));
  if (stray)
    return {
      ok: false,
      error: `"${stray}" isn't an option. Use letters A to ${last}, or X for a cancelled question.`,
    };
  if (codes.length > shape.questions)
    return {
      ok: false,
      error: `That's ${codes.length} answers. This paper has ${shape.questions} questions.`,
    };
  [...codes].forEach((code, i) => entries.set(i, entryOf(code)));
  return { ok: true, entries };
}

/** The key with the pasted entries written over it. */
export function applyEntries(key: AnswerKey, entries: Map<number, number>) {
  const next = [...key];
  for (const [question, entry] of entries) next[question] = entry;
  return next;
}
