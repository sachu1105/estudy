import { describe, expect, it } from "vitest";

import { structureByRules } from "./rules";

const names = (tree: ReturnType<typeof structureByRules>) =>
  tree?.subjects.map((s) => [s.name, s.topics.map((t) => t.name)]);

describe("structureByRules", () => {
  it("reads parts as subjects and their lists as topics, weighting by stated marks", () => {
    const tree = structureByRules(
      [
        "Kerala PSC LD Clerk - Detailed syllabus",
        "Part I: General Knowledge (50 marks)",
        "History: Kerala renaissance, freedom struggle, social reformers",
        "Geography: Rivers of Kerala, climate, soils",
        "Part II: Simple Arithmetic and Mental Ability (20 marks)",
        "Number system, fractions, percentage, ratio and proportion",
        "Part III: General English (10 marks)",
        "Parts of speech, tenses, synonyms and antonyms",
      ].join("\n"),
    );
    expect(names(tree)).toEqual([
      [
        "General Knowledge",
        [
          "Kerala renaissance",
          "freedom struggle",
          "social reformers",
          "Rivers of Kerala",
          "climate",
          "soils",
        ],
      ],
      [
        "Simple Arithmetic and Mental Ability",
        ["Number system", "fractions", "percentage", "ratio and proportion"],
      ],
      [
        "General English",
        ["Parts of speech", "tenses", "synonyms and antonyms"],
      ],
    ]);
    // 50/6 marks a topic against a median of 5: more than the 10/3 of English.
    const [gk, , english] = tree!.subjects;
    expect(gk!.topics[0]!.weight).toBeGreaterThan(english!.topics[0]!.weight);
  });

  it("reads a plain notes-style list: headings over bullets, and labelled lines", () => {
    const tree = structureByRules(
      [
        "History",
        "1. Ancient India",
        "2. Medieval India",
        "Geography:",
        "- Rivers",
        "- Climate",
        "Current affairs: sports, awards",
      ].join("\n"),
    );
    expect(names(tree)).toEqual([
      ["History", ["Ancient India", "Medieval India"]],
      ["Geography", ["Rivers", "Climate"]],
      ["Current affairs", ["sports", "awards"]],
    ]);
  });

  it("puts a list with no headings under the syllabus title", () => {
    const tree = structureByRules(
      "Fractions, decimals, percentage\nRatio and proportion",
      "Arithmetic",
    );
    expect(names(tree)).toEqual([
      [
        "Arithmetic",
        ["Fractions", "decimals", "percentage", "Ratio and proportion"],
      ],
    ]);
  });

  it("leaves out the notification's fine print", () => {
    const tree = structureByRules(
      [
        "Vocabulary:",
        "- Synonyms",
        "- Antonyms",
        "It may be noted that apart from the topics detailed above,",
        "questions from other topics prescribed for the post may also appear.",
      ].join("\n"),
    );
    expect(names(tree)).toEqual([["Vocabulary", ["Synonyms", "Antonyms"]]]);
  });

  it("is deterministic", () => {
    const text = "Part I: History\nKerala, India\nPart II: English\nGrammar";
    expect(JSON.stringify(structureByRules(text))).toBe(
      JSON.stringify(structureByRules(text)),
    );
  });

  it("returns null for empty text", () => {
    expect(structureByRules("   ")).toBeNull();
  });
});
