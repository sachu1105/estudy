import { describe, expect, it } from "vitest";

import {
  parseImport,
  pickQuestions,
  scoreAnswers,
  spreadQuestions,
  topicKey,
} from "./questions";

describe("questions", () => {
  it("reduces topic names so syllabuses share one pool, Malayalam too", () => {
    expect(topicKey(" The Preamble. ")).toBe("the preamble");
    expect(topicKey("PREAMBLE")).toBe(topicKey("preamble"));
    expect(topicKey("കേരള നവോത്ഥാനം")).toBe("കേരള നവോത്ഥാനം");
  });

  it("imports CSV with quotes and a header, and reports bad rows by line", () => {
    const csv = [
      "topic,difficulty,question,a,b,c,d,answer,explanation,source",
      'Preamble,2,"Which word was added by the 42nd amendment, in 1976?",Socialist,Republic,Sovereign,Democratic,A,"Added with ""secular"".",Kerala PSC 2019',
      "Preamble,9,Bad difficulty,a,b,c,d,A,,",
      "Preamble,2,Duplicate options here,a,a,c,d,B,,",
    ].join("\n");
    const { questions, errors } = parseImport(csv);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      topicName: "Preamble",
      correctIndex: 0,
      explanation: 'Added with "secular".',
      sourceRef: "Kerala PSC 2019",
    });
    expect(questions[0]!.body).toContain("42nd amendment, in 1976");
    expect(errors.map((e) => e.line)).toEqual([3, 4]);
  });

  it("imports a JSON array", () => {
    const { questions, errors } = parseImport(
      JSON.stringify([
        {
          topicName: "Rivers",
          difficulty: 3,
          body: "The longest river in Kerala is?",
          options: ["Periyar", "Bharathapuzha", "Pamba", "Chaliyar"],
          correctIndex: 0,
        },
      ]),
    );
    expect(errors).toEqual([]);
    expect(questions[0]).toMatchObject({ language: "EN", explanation: null });
  });

  it("picks the least seen questions first", () => {
    const pool = ["a", "b", "c", "d"].map((id) => ({ id }));
    const seen = new Map([
      ["a", 3],
      ["b", 1],
    ]);
    const picked = pickQuestions(pool, 2, seen, () => 0.5).map((q) => q.id);
    expect(picked.sort()).toEqual(["c", "d"]);
  });

  it("scores with and without negative marking", () => {
    const qs = [0, 1, 2, 3].map((i) => ({ id: `q${i}`, correctIndex: 0 }));
    const answers = new Map<string, number | null>([
      ["q0", 0],
      ["q1", 0],
      ["q2", 2],
      ["q3", null],
    ]);
    expect(scoreAnswers(qs, answers, false)).toEqual({
      total: 4,
      correct: 2,
      wrong: 1,
      skipped: 1,
      score: 2,
      accuracy: 0.5,
    });
    expect(scoreAnswers(qs, answers, true).score).toBe(1.67);
  });
});

describe("spreading a mock across topics", () => {
  const pool = (key: string, n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `${key}${i}`, topicKey: key }));

  it("gives heavier topics more questions, and never runs over the pool", () => {
    const all = [...pool("a", 10), ...pool("b", 10), ...pool("c", 10)];
    const picked = spreadQuestions(
      all,
      [
        { key: "a", weight: 3 },
        { key: "b", weight: 2 },
        { key: "c", weight: 1 },
      ],
      12,
      new Map(),
      () => 0.5,
    );
    const count = (k: string) => picked.filter((q) => q.topicKey === k).length;
    expect(picked).toHaveLength(12);
    expect(count("a")).toBe(6);
    expect(count("b")).toBe(4);
    expect(count("c")).toBe(2);
    expect(new Set(picked.map((q) => q.id)).size).toBe(12);

    // A thin pool: fewer questions than asked, all of them used once.
    const thin = spreadQuestions(
      pool("a", 3),
      [{ key: "a", weight: 5 }],
      10,
      new Map(),
      () => 0.5,
    );
    expect(thin).toHaveLength(3);
  });
});
