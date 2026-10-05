import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkMalayalam, repairMalayalam } from "./malayalam";

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "fixtures/syllabus", name), "utf8");

describe("Malayalam text from PDFs", () => {
  it("leaves clean Malayalam alone", () => {
    const clean = fixture("malayalam-sample.txt");
    expect(checkMalayalam(clean).garbled).toBe(false);
    expect(repairMalayalam(clean)).toBe(clean);
  });

  it("detects the visual-order text of a real PSC PDF", () => {
    expect(checkMalayalam(fixture("plus-two-prelims-2022.txt")).garbled).toBe(
      true,
    );
  });

  it("puts vowel signs back after their consonant and reads the ാ glyph right", () => {
    // Lines as the real plus-two 2022 notification extracts them.
    const repaired = repairMalayalam(fixture("plus-two-prelims-2022.txt"));
    expect(repaired).toContain("കേരളം"); // was േകരളം
    expect(repaired).toContain("ലോകം"); // was േലോകം
    expect(repaired).toContain("സാമഹയ"); // was സോമഹയ (സാമൂഹ്യ; the ൂ is lost in the PDF)
    expect(repaired).toContain("കേരളതിലെ"); // was േകരളതിെല
    expect(checkMalayalam(repaired).garbled).toBe(false);
  });

  it("only moves word-initial signs in mostly-clean text", () => {
    const mixed = `${fixture("malayalam-sample.txt")}\nേചേരത്തെഴുതുക, േകരളം, േലാകം`;
    const repaired = repairMalayalam(mixed);
    expect(repaired).toContain("ചേ");
    expect(repaired).toContain("കേരളം");
    expect(repaired).toContain("കാലാവസ്ഥ"); // clean words untouched
  });
});
