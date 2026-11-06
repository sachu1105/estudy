import { describe, expect, it } from "vitest";

import {
  accepts,
  applyEntries,
  blankKey,
  CANCELLED,
  describeEntry,
  keyedCount,
  NO_KEY,
  normaliseKey,
  parseKey,
  toggleCancelled,
  toggleOption,
} from "./key";

const shape = { questions: 10, options: 4 };

describe("answer key", () => {
  it("keys one answer, two answers, or a cancelled question", () => {
    let key = toggleOption(blankKey(10), 0, 2);
    expect(describeEntry(key[0]!)).toBe("C");
    key = toggleOption(key, 0, 0);
    expect(describeEntry(key[0]!)).toBe("A or C");
    expect(accepts(key[0]!, 0) && accepts(key[0]!, 2)).toBe(true);
    expect(accepts(key[0]!, 1)).toBe(false);
    key = toggleOption(key, 0, 0);
    key = toggleOption(key, 0, 2);
    expect(key[0]).toBe(NO_KEY);
    key = toggleCancelled(key, 1);
    expect(describeEntry(key[1]!)).toBe("Cancelled");
    // Tapping an option on a cancelled question keys it again.
    expect(toggleOption(key, 1, 3)[1]).toBe(8);
    expect(keyedCount(key)).toBe(1);
  });

  it("cleans a stored key to the paper's shape", () => {
    expect(normaliseKey([16 | 2, -1, -5, 1.5, "1"], shape)).toEqual([
      2,
      CANCELLED,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);
  });

  it("reads a key pasted in order", () => {
    const parsed = parseKey("acdb, b x", shape);
    expect(parsed.ok && [...parsed.entries.values()]).toEqual([
      1,
      4,
      8,
      2,
      2,
      CANCELLED,
    ]);
    expect(parseKey("ABCDEABCDE", shape)).toMatchObject({ ok: false });
    expect(parseKey("ABCDABCDABC", shape)).toEqual({
      ok: false,
      error: "That's 11 answers. This paper has 10 questions.",
    });
    expect(parseKey("  ", shape)).toMatchObject({ ok: false });
  });

  it("reads a numbered key, filling only the questions it names", () => {
    const parsed = parseKey("Answer key\n1-A 2. c\n3) D 4 AB 10:*", shape);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(Object.fromEntries(parsed.entries)).toEqual({
      0: 1,
      1: 4,
      2: 8,
      3: 3,
      9: CANCELLED,
    });
    const key = applyEntries(toggleOption(blankKey(10), 5, 1), parsed.entries);
    expect(key[5]).toBe(2);
    expect(parseKey("11-A", shape)).toMatchObject({ ok: false });
    expect(parseKey("1-E", shape)).toMatchObject({ ok: false });
    expect(parseKey("1-E", { questions: 10, options: 5 })).toMatchObject({
      ok: true,
    });
    expect(parseKey("2024", shape)).toMatchObject({ ok: false });
  });
});
