import { describe, expect, it, vi } from "vitest";

import { chunkText, normaliseText } from "./chunk";
import { costMicros, createHostedProvider } from "./hosted";
import { createOllamaProvider } from "./ollama";
import {
  extractJson,
  generateValidated,
  structureSyllabus,
  isGrounded,
} from "./structure";
import { aiChunkSchema, mergeChunks } from "./syllabus-tree";
import { AiOutputError, type AIProvider, type AiUsageEntry } from "./types";

/** A provider that replies with the queued strings, one per call. */
function scripted(...replies: string[]) {
  const calls: string[] = [];
  const provider: AIProvider = {
    name: "fake",
    model: "scripted",
    async generate(request) {
      calls.push(request.prompt);
      // The last reply repeats, so extra calls (coverage retries) get an answer too.
      const text = replies.length > 1 ? replies.shift() : replies[0];
      if (text === undefined) throw new Error("no reply left");
      return {
        text,
        inputTokens: 10,
        outputTokens: 5,
        costMicros: 3,
        durationMs: 1,
      };
    },
  };
  return { provider, calls };
}

const valid = JSON.stringify({
  subjects: [
    {
      name: "General English",
      topics: [
        { name: "Tenses", weight: 2, difficulty: 2, foundational: true },
      ],
    },
  ],
});

const request = {
  purpose: "STRUCTURE_SYLLABUS" as const,
  promptVersion: "test@1",
  system: "s",
  prompt: "p",
  jsonSchema: {},
  maxOutputTokens: 100,
};

describe("chunking", () => {
  it("cleans text and splits at line breaks within the limit", () => {
    expect(normaliseText("a\r\n\r\n\r\n\tb  c\u0000")).toBe("a\n\nb c");
    const text = Array.from(
      { length: 50 },
      (_, i) => `Line ${i} ${"x".repeat(80)}`,
    ).join("\n");
    const chunks = chunkText(text, 1000);
    expect(chunks.length).toBeGreaterThan(4);
    expect(chunks.every((c) => c.length <= 1000)).toBe(true);
    expect(chunks.join("\n")).toBe(text);
  });

  it("splits a single line longer than a chunk", () => {
    expect(chunkText("y".repeat(2500), 1000).map((c) => c.length)).toEqual([
      1000, 1000, 500,
    ]);
  });
});

describe("AI output", () => {
  it("finds JSON inside code fences and chatter", () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```')).toEqual({
      a: 1,
    });
    expect(() => extractJson("no json")).toThrow();
  });

  it("accepts near-miss types but rejects out-of-range values", () => {
    const ok = aiChunkSchema.safeParse({
      subjects: [
        {
          name: " Maths ",
          topics: [
            {
              name: "Ratio",
              weight: "4",
              difficulty: 2.6,
              foundational: "true",
            },
          ],
        },
      ],
    });
    expect(ok.success && ok.data.subjects[0]).toEqual({
      name: "Maths",
      part: null,
      partMarks: null,
      topics: [{ name: "Ratio", weight: 4, difficulty: 3, foundational: true }],
    });
    expect(
      aiChunkSchema.safeParse({
        subjects: [
          { name: "M", topics: [{ name: "R", weight: 9, difficulty: 1 }] },
        ],
      }).success,
    ).toBe(false);
  });

  it("merges subjects across chunks and drops duplicate topics", () => {
    const t = (name: string) => ({
      name,
      weight: 3,
      difficulty: 3,
      foundational: false,
    });
    const s = (name: string, topics: ReturnType<typeof t>[]) => ({
      name,
      part: null,
      partMarks: null,
      topics,
    });
    const tree = mergeChunks([
      { subjects: [s("General Knowledge", [t("Rivers"), t("Climate")])] },
      {
        subjects: [
          s("general  knowledge", [t("rivers"), t("Soils")]),
          s("English", []),
        ],
      },
    ]);
    expect(
      tree?.subjects.map((x) => [x.name, x.topics.map((y) => y.name)]),
    ).toEqual([
      ["General Knowledge", ["Rivers", "Climate", "Soils"]],
      ["English", ["English"]],
    ]);
    expect(mergeChunks([{ subjects: [] }])).toBeNull();
  });

  it("keeps Malayalam topics that differ only by a vowel sign", () => {
    const t = (name: string) => ({
      name,
      weight: 3,
      difficulty: 3,
      foundational: false,
    });
    const tree = mergeChunks([
      {
        subjects: [
          {
            name: "മലയാളം",
            part: null,
            partMarks: null,
            // കല (art) and കാല (time) differ only by the vowel sign ാ.
            topics: [t("കല"), t("കാല"), t("കല")],
          },
        ],
      },
    ]);
    expect(tree!.subjects[0].topics.map((x) => x.name)).toEqual(["കല", "കാല"]);
  });

  it("weights topics by the syllabus's own marks per topic, shared across a part", () => {
    const t = (name: string) => ({
      name,
      weight: 5,
      difficulty: 3,
      foundational: false,
    });
    const many = (n: number) => Array.from({ length: n }, (_, i) => t(`T${i}`));
    const tree = mergeChunks([
      {
        subjects: [
          // Part I: 50 marks over 40 topics in two subjects -> 1.25 marks a topic
          {
            name: "History",
            part: "Part I General Knowledge",
            partMarks: 50,
            topics: many(20),
          },
          {
            name: "Geography",
            part: "Part I General Knowledge",
            partMarks: 50,
            topics: many(20),
          },
          // 20 marks over 10 topics -> 2 a topic, the most, so weight 5
          {
            name: "Arithmetic",
            part: "Part II",
            partMarks: 20,
            topics: many(10),
          },
          // 10 marks over 10 topics -> 1 a topic
          {
            name: "English",
            part: "Part III",
            partMarks: 10,
            topics: many(10),
          },
        ],
      },
    ])!;
    expect(tree.subjects.map((x) => x.topics[0].weight)).toEqual([3, 3, 4, 3]);
    expect(tree.subjects[0]).not.toHaveProperty("part");
  });

  it("doesn't let one outlier flatten every other weight (real Degree level LDC)", () => {
    const t = (name: string) => ({
      name,
      weight: 3,
      difficulty: 3,
      foundational: false,
    });
    const many = (n: number) => Array.from({ length: n }, (_, i) => t(`T${i}`));
    const subject = (name: string, marks: number, topics: number) => ({
      name,
      part: `group ${name}`,
      partMarks: marks,
      topics: many(topics),
    });
    const tree = mergeChunks([
      {
        subjects: [
          // Marks and topic counts from the real Degree level LDC parse.
          subject("History", 5, 29),
          subject("Geography", 5, 37),
          subject("Economics", 5, 12),
          subject("Indian constitution", 5, 44),
          subject("Kerala governance", 10, 21),
          subject("Life science", 6, 7),
          subject("Physics", 3, 53),
          subject("Chemistry", 3, 18),
          subject("Arts", 5, 41),
          subject("Computer", 3, 46),
          subject("Important acts", 5, 53),
          subject("Current affairs", 15, 1),
          subject("Simple arithmetic", 5, 12),
          subject("Mental ability", 5, 15),
          subject("English grammar", 5, 15),
          subject("Vocabulary", 5, 14),
          subject("Regional language", 10, 43),
        ],
      },
    ])!;
    expect(tree.subjects.map((s) => s.topics[0].weight)).toEqual([
      3, 3, 5, 3, 5, 5, 2, 3, 3, 2, 3, 5, 5, 4, 4, 5, 4,
    ]);
  });

  it("keeps the model's weights when the syllabus gives no marks", () => {
    const tree = mergeChunks([
      {
        subjects: [
          {
            name: "A",
            part: null,
            partMarks: null,
            topics: [
              { name: "x", weight: 2, difficulty: 1, foundational: false },
            ],
          },
        ],
      },
    ])!;
    expect(tree.subjects[0].topics[0].weight).toBe(2);
  });
});

describe("generateValidated", () => {
  it("retries once with the problems spelled out, then succeeds", async () => {
    const { provider, calls } = scripted("not json at all", valid);
    const usage: AiUsageEntry[] = [];
    const result = await generateValidated(provider, request, aiChunkSchema, {
      onUsage: async (u) => void usage.push(u),
    });
    expect(result.subjects[0].name).toBe("General English");
    expect(calls[1]).toContain("Your previous reply was not valid");
    expect(usage.map((u) => u.ok)).toEqual([false, true]);
    expect(usage[0]).toMatchObject({
      provider: "fake",
      promptVersion: "test@1",
      inputTokens: 10,
    });
  });

  it("fails visibly after the retry is also invalid", async () => {
    const { provider } = scripted(
      '{"subjects":"nope"}',
      '{"subjects":[{"name":""}]}',
    );
    await expect(
      generateValidated(provider, request, aiChunkSchema, {
        onUsage: async () => {},
      }),
    ).rejects.toBeInstanceOf(AiOutputError);
  });

  it("structures every chunk and reports progress", async () => {
    const { provider } = scripted(valid, valid);
    const progress: number[] = [];
    const text = `${"General English: tenses\n".repeat(200)}`; // 4,800 chars: 2 chunks
    const result = await structureSyllabus(provider, text, {
      onUsage: async () => {},
      onProgress: async (done, total) => void progress.push(done / total),
    });
    expect(result.chunks).toBe(2);
    expect(progress).toEqual([0.5, 1]);
    expect(result.tree?.subjects).toHaveLength(1);
  });
});

describe("structureSyllabus by section", () => {
  const text = [
    "Part I General Knowledge (50 marks)",
    "1. History",
    "Kerala renaissance, freedom struggle",
    "2. Current affairs",
    "Part II General English (10 marks)",
    "Tenses, articles, prepositions",
  ].join("\n");

  it("asks once per section, names subjects by heading and takes marks from the text", async () => {
    const replyFor = (name: string, topics: string[]) =>
      JSON.stringify({
        subjects: [
          {
            name,
            part: "made up",
            partMarks: 999,
            topics: topics.map((t) => ({
              name: t,
              weight: 1,
              difficulty: 2,
              foundational: false,
            })),
          },
        ],
      });
    const { provider, calls } = scripted(
      replyFor("General Knowledge", ["Kerala renaissance", "Freedom struggle"]),
      replyFor("English", ["Tenses", "Articles", "Prepositions"]),
    );
    const result = await structureSyllabus(provider, text, {
      onUsage: async () => {},
    });
    expect(calls).toHaveLength(2); // "Current affairs" has no body: no call
    expect(calls[0]).toContain("Section heading: History");
    expect(result.tree!.subjects.map((s) => [s.name, s.topics.length])).toEqual(
      [
        ["History", 2],
        ["Current affairs", 1],
        ["General English", 3],
      ],
    );
    // 50 marks over 3 Part I topics is 5x the typical 10 over 3: weight 5 against 3.
    expect(result.tree!.subjects.map((s) => s.topics[0].weight)).toEqual([
      5, 5, 3,
    ]);
  });

  it("keeps a section's listed items when the model returns nothing for it", async () => {
    const { provider } = scripted('{"subjects":[]}', '{"subjects":[]}');
    const result = await structureSyllabus(provider, text, {
      onUsage: async () => {},
    });
    expect(
      result
        .tree!.subjects.find((s) => s.name === "General English")
        ?.topics.map((t) => t.name),
    ).toEqual(["Tenses", "articles", "prepositions"]);
  });

  it("asks again when a reply summarises a section instead of listing it, and skips the header", async () => {
    const reply = (n: number) =>
      JSON.stringify({
        subjects: [
          {
            name: "Maths",
            part: null,
            partMarks: null,
            topics: Array.from({ length: n }, (_, i) => ({
              name: `Item ${i}`,
              weight: 3,
              difficulty: 3,
              foundational: false,
            })),
          },
        ],
      });
    const { provider, calls } = scripted(reply(1), reply(6));
    const result = await structureSyllabus(
      provider,
      "Kerala PSC notification 12/2026\nPart I Maths (20 marks)\nFractions, decimals, percentage, ratio, average, interest",
      { onUsage: async () => {} },
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]).not.toContain("notification"); // the header was never sent
    expect(calls[1]).toContain("lists about 6 items");
    expect(result.tree!.subjects[0].topics).toHaveLength(6);
  });

  it("drops invented topics and names a headed section by its heading (seen with Malayalam)", async () => {
    // What qwen2.5:3b really returned for the Geography (ഭൂമിശാസ്ത്രം) section: a topic as
    // the subject name, plus a second subject whose topics aren't in the text at all.
    const reply = JSON.stringify({
      subjects: [
        {
          name: "മണ്ണിനങ്ങൾ",
          part: null,
          partMarks: null,
          topics: ["കേരളത്തിലെ നദികൾ", "കാലാവസ്ഥ", "പ്രകൃതിദത്ത സസ്യജാലം"].map(
            (name) => ({ name, weight: 3, difficulty: 3, foundational: false }),
          ),
        },
        {
          name: "മണ്ണിനങ്ങൾ പൊതുവിജ്ഞാനം",
          part: null,
          partMarks: null,
          topics: [
            {
              name: "മണ്ണിനങ്ങൾ പൊതുവിജ്ഞാനം സാഹിത്യം",
              weight: 3,
              difficulty: 3,
              foundational: false,
            },
          ],
        },
      ],
    });
    const { provider } = scripted(reply);
    const result = await structureSyllabus(
      provider,
      "ഭാഗം 1 പൊതുവിജ്ഞാനം (50 മാർക്ക്)\n2. ഭൂമിശാസ്ത്രം\nകേരളത്തിലെ നദികൾ, കാലാവസ്ഥ, മണ്ണിനങ്ങൾ, പ്രകൃതിദത്ത സസ്യജാലം",
      { onUsage: async () => {} },
    );
    expect(
      result.tree!.subjects.map((s) => [s.name, s.topics.map((t) => t.name)]),
    ).toEqual([
      [
        "ഭൂമിശാസ്ത്രം",
        // മണ്ണിനങ്ങൾ (soils) was only the model's subject name; it comes back as a topic.
        ["കേരളത്തിലെ നദികൾ", "കാലാവസ്ഥ", "പ്രകൃതിദത്ത സസ്യജാലം", "മണ്ണിനങ്ങൾ"],
      ],
    ]);
  });

  it("grounds topics in their source text, tolerating small slips", () => {
    const source =
      "Kerala - Arrival of Europeans, history of Travancore. കേരളത്തിലെ ദേശീയ പ്രസ്ഥാനം";
    expect(isGrounded("Arrival of Europeans", source)).toBe(true);
    expect(isGrounded("History of Travancore", source)).toBe(true);
    expect(isGrounded("കേരളത്തി ദേശീയ പ്രസ്ഥാനം", source)).toBe(true);
    expect(isGrounded("Culture of Kerala", source)).toBe(false);
    expect(isGrounded("കല", "പഴഞ്ചൊല്ലുകൾ, കല, കാല")).toBe(true);
    expect(isGrounded("കല", "പഴഞ്ചൊല്ലുകൾ, കാല")).toBe(false);
    expect(isGrounded("Mughal empire and Akbar", source)).toBe(false);
  });
});

describe("providers", () => {
  it("Ollama sends the schema, a big context and temperature 0", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        message: { content: valid },
        prompt_eval_count: 120,
        eval_count: 40,
      }),
    );
    const ollama = createOllamaProvider({
      baseUrl: "http://ollama:11434/",
      model: "qwen",
      fetch: fetchMock,
    });
    const reply = await ollama.generate({
      ...request,
      jsonSchema: { type: "object" },
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(init.body as string);
    expect(url).toBe("http://ollama:11434/api/chat");
    expect(body).toMatchObject({
      model: "qwen",
      stream: false,
      format: { type: "object" },
    });
    expect(body.options).toMatchObject({ temperature: 0, num_ctx: 8192 });
    expect(reply).toMatchObject({
      text: valid,
      inputTokens: 120,
      outputTokens: 40,
      costMicros: 0,
    });
  });

  it("the hosted provider keeps the key in a header and prices the call", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        content: [{ type: "text", text: valid }],
        usage: { input_tokens: 1000, output_tokens: 500 },
      }),
    );
    const hosted = createHostedProvider({
      apiKey: "secret",
      model: "m",
      priceInputPerMTok: 3,
      priceOutputPerMTok: 15,
      fetch: fetchMock,
    });
    const reply = await hosted.generate(request);
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(
      "secret",
    );
    expect(init.body as string).not.toContain("secret");
    expect(reply.costMicros).toBe(costMicros(1000, 500, 3, 15));
    expect(reply.costMicros).toBe(10_500);
  });
});
