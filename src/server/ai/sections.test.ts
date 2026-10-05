import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { marksIn, splitSections } from "./sections";

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), "fixtures/syllabus", name), "utf8");

const ldc = readFileSync(
  join(process.cwd(), "fixtures/syllabus/ldc-sample.txt"),
  "utf8",
);

describe("splitSections", () => {
  it("finds parts, their marks and the numbered sections inside them", () => {
    const sections = splitSections(ldc);
    expect(sections.map((s) => [s.part, s.partMarks, s.heading])).toEqual([
      [null, null, null], // the notification header before Part I
      ["Part I General Knowledge", 50, "History"],
      ["Part I General Knowledge", 50, "Geography"],
      ["Part I General Knowledge", 50, "Economics"],
      ["Part I General Knowledge", 50, "Civics"],
      ["Part I General Knowledge", 50, "Indian Constitution"],
      ["Part I General Knowledge", 50, "Arts, literature, culture, sports"],
      ["Part I General Knowledge", 50, "Basic facts of natural science"],
      ["Part I General Knowledge", 50, "Current affairs"],
      [
        "Part II Simple Arithmetic, Mental Ability and Test of Reasoning",
        20,
        "Simple Arithmetic, Mental Ability and Test of Reasoning",
      ],
      ["Part III General English", 10, "General English"],
      [
        "Part IV Regional Language - Malayalam",
        10,
        "Regional Language - Malayalam",
      ],
      [
        "Part V Special topic: IT and cyber laws",
        10,
        "Special topic: IT and cyber laws",
      ],
    ]);
    expect(sections[1].body).toMatch(/^Kerala - Arrival of Europeans/);
    expect(sections[8].body).toBe("");
  });

  it("treats numbered topic lists as content, not headings", () => {
    const sections = splitSections(
      "Part A Maths (30 marks)\n1. Fractions, decimals, percentage\n2. Ratio and proportion of quantities in daily life problems",
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].body.split("\n")).toHaveLength(2);
  });

  it("returns the whole text as one section when there are no headings", () => {
    expect(splitSections("Tenses, articles\nRivers of Kerala")).toEqual([
      {
        part: null,
        partMarks: null,
        group: null,
        heading: null,
        body: "Tenses, articles\nRivers of Kerala",
      },
    ]);
  });

  it("finds Malayalam parts (ഭാഗം), marks (മാർക്ക്) and numbered sections", () => {
    const ml = readFileSync(
      join(process.cwd(), "fixtures/syllabus/malayalam-sample.txt"),
      "utf8",
    );
    expect(
      splitSections(ml).map((s) => [s.part, s.partMarks, s.heading]),
    ).toEqual([
      [null, null, null],
      ["ഭാഗം 1 പൊതുവിജ്ഞാനം", 50, "ചരിത്രം"],
      ["ഭാഗം 1 പൊതുവിജ്ഞാനം", 50, "ഭൂമിശാസ്ത്രം"],
      ["ഭാഗം 1 പൊതുവിജ്ഞാനം", 50, "ഇന്ത്യൻ ഭരണഘടന"],
      ["ഭാഗം 2 ലഘുഗണിതം", 20, "ലഘുഗണിതം"],
      ["ഭാഗം 3 മലയാളം", 10, "മലയാളം"],
    ]);
  });

  it("reads a real Degree level LDC notification: marks table skipped, roman sections", () => {
    // Text as unpdf extracted it from the Kerala PSC PDF an owner uploaded.
    const sections = splitSections(fixture("degree-level-ldc.txt")).filter(
      (s) => s.heading,
    );
    expect(sections.map((s) => [s.heading, s.partMarks])).toEqual([
      ["History", 5],
      ["Geography", 5],
      ["Economics", 5],
      ["Indian constitution", 5],
      ["Kerala Governance and System of Administration", 10],
      ["Life Science and Public Health", 6],
      ["Physics", 3],
      ["Chemistry", 3],
      ["Arts, Sports, Literature and Culture", 5],
      ["Basics of Computer", 3],
      ["Important Acts", 5],
      ["Current Affairs", 15],
      ["Simple Arithmetic", 5],
      ["Mental Ability & Reasoning", 5],
      ["English Grammar", 5],
      ["Vocabulary", 5],
      ["Regional language", 10],
    ]);
    // Numbered lines stay topics inside their section.
    expect(sections[10].body).toContain("1. Right to information");
  });

  it("reads a real plus-two notification: 'Part I (1) ...', lettered sections, spaced marks", () => {
    const sections = splitSections(fixture("plus-two-prelims-2022.txt")).filter(
      (s) => s.heading,
    );
    expect(sections).toHaveLength(15);
    expect(sections.map((s) => s.partMarks)).toEqual([
      5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 10, 10, 10, 10,
    ]);
    expect(sections[2].heading).toBe("Part I (3)"); // its title was lost in the PDF
    expect(sections[12].heading).toBe("English Grammar"); // "( 1 0 M a r k s )"
  });

  it("reads marks written several ways", () => {
    expect(marksIn("Part I. General Knowledge (Marks: 50)")).toBe(50);
    expect(marksIn("PART II - ENGLISH (20 Marks)")).toBe(20);
    expect(marksIn("Paper 1: 100 marks")).toBe(100);
    expect(marksIn("Part III History")).toBeNull();
  });
});
