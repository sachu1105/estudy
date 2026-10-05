import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { minhash, postOf, SAME_SYLLABUS, similarity } from "./fingerprint";

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "fixtures/syllabus", name), "utf8");

describe("syllabus fingerprints", () => {
  const ldc = fixture("degree-level-ldc.txt");

  it("is deterministic and identical for identical text", () => {
    expect(minhash(ldc)).toEqual(minhash(ldc));
    expect(similarity(minhash(ldc), minhash(ldc))).toBe(1);
  });

  it("treats the same syllabus for another post as the same", () => {
    // Same detailed syllabus, a different post in the heading and a changed line.
    const other = ldc
      .replace("LD CLERK [KWA]", "ASSISTANT GRADE II")
      .replace("Foreign policy.", "Foreign policy and treaties.");
    expect(similarity(minhash(ldc), minhash(other))).toBeGreaterThanOrEqual(
      SAME_SYLLABUS,
    );
  });

  it("tells different syllabuses apart", () => {
    const s = similarity(
      minhash(ldc),
      minhash(fixture("plus-two-prelims-2022.txt")),
    );
    expect(s).toBeLessThan(SAME_SYLLABUS);
  });

  it("reads the post from the heading", () => {
    expect(postOf(ldc)).toMatch(/^LD CLERK \[KWA\], COMPUTER PROGRAMMER/);
    expect(postOf(fixture("plus-two-prelims-2022.txt"))).toBe(
      "PLUS TWO LEVEL COMMON PRELIMINARY EXAMINATION 2022",
    );
    expect(postOf("Tenses, articles")).toBeNull();
  });
});
