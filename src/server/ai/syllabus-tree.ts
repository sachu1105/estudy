import { z } from "zod";

// What the structuring prompt must return for one chunk of syllabus text. Lenient about
// types small models get wrong ("3" for 3, 2.6 for 3), strict about everything else.

const level = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z
    .number()
    .min(1)
    .max(5)
    .transform((n) => Math.round(n)),
);

const flag = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((v) => v === true || v === "true");

const name = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1).max(200));

export const aiTopicSchema = z.object({
  name,
  weight: level,
  difficulty: level,
  foundational: flag.default(false),
});

const marks = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().positive().max(10_000).nullable(),
);

export const aiChunkSchema = z.object({
  subjects: z
    .array(
      z.object({
        name,
        /** The exam part the subject sits in ("Part I"), shared by its sibling subjects. */
        part: z.string().trim().max(200).nullable().default(null),
        /** Marks of that whole part, when the syllabus states them. */
        partMarks: marks.default(null),
        topics: z.array(aiTopicSchema).max(300),
      }),
    )
    .max(40),
});

export type AiTopic = z.output<typeof aiTopicSchema>;
export type AiChunk = z.output<typeof aiChunkSchema>;

/** The merged, saved tree: every subject has at least one topic. */
export const syllabusTreeSchema = z.object({
  subjects: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        topics: z
          .array(
            z.object({
              name: z.string().min(1).max(200),
              weight: z.number().int().min(1).max(5),
              difficulty: z.number().int().min(1).max(5),
              foundational: z.boolean(),
            }),
          )
          .min(1)
          .max(300),
      }),
    )
    .min(1)
    .max(40),
});

export type SyllabusTree = z.output<typeof syllabusTreeSchema>;

/** The schema handed to the model (Ollama enforces it while decoding). */
export const chunkJsonSchema = {
  type: "object",
  properties: {
    subjects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          part: { type: ["string", "null"] },
          partMarks: { type: ["number", "null"] },
          topics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                weight: { type: "integer", minimum: 1, maximum: 5 },
                difficulty: { type: "integer", minimum: 1, maximum: 5 },
                foundational: { type: "boolean" },
              },
              required: ["name", "weight", "difficulty", "foundational"],
            },
          },
        },
        required: ["name", "part", "partMarks", "topics"],
      },
    },
  },
  required: ["subjects"],
} as const;

// \p{M} keeps Malayalam vowel signs (ാ, ി, ്...): without them കല and കാല would collide.
const key = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "");

/**
 * Joins the per-chunk trees: subjects with the same name merge (a subject can span chunks),
 * duplicate topics inside a subject collapse, and a subject the model listed without topics
 * becomes one topic of its own name so it can still be studied.
 */
export function mergeChunks(chunks: AiChunk[]): SyllabusTree | null {
  const subjects = new Map<
    string,
    {
      name: string;
      part: string | null;
      partMarks: number | null;
      topics: Map<string, SyllabusTree["subjects"][0]["topics"][0]>;
    }
  >();
  for (const chunk of chunks) {
    for (const subject of chunk.subjects) {
      const k = key(subject.name);
      if (!k) continue;
      const entry = subjects.get(k) ?? {
        name: subject.name,
        part: subject.part,
        partMarks: subject.partMarks,
        topics: new Map(),
      };
      entry.part ??= subject.part;
      entry.partMarks ??= subject.partMarks;
      subjects.set(k, entry);
      for (const topic of subject.topics) {
        const tk = key(topic.name);
        if (tk && !entry.topics.has(tk)) entry.topics.set(tk, topic);
      }
    }
  }
  const merged = [...subjects.values()].slice(0, 40).map((s) => ({
    name: s.name,
    part: s.part,
    partMarks: s.partMarks,
    topics:
      s.topics.size > 0
        ? [...s.topics.values()].slice(0, 300)
        : [{ name: s.name, weight: 3, difficulty: 3, foundational: false }],
  }));
  if (merged.length === 0) return null;
  return { subjects: applyMarkWeights(merged) };
}

type MergedSubject = SyllabusTree["subjects"][0] & {
  part: string | null;
  partMarks: number | null;
};

/**
 * Topic weight from the syllabus's own marks, not the model's guess. A group's marks are
 * shared by all topics of the subjects in it; a topic with the typical (median) marks per
 * topic is weight 3, and each doubling or halving moves it by one, within 1-5. Against the
 * maximum instead, one outlier (Current Affairs: 15 marks, one topic) flattened the rest
 * of a real LDC syllabus to weight 1. Used only when most topics have marks; otherwise the
 * model's weights stand. Deterministic, so the "Why this?" screen can explain every one.
 */
export function applyMarkWeights(
  subjects: MergedSubject[],
): SyllabusTree["subjects"] {
  const partKey = (s: MergedSubject) =>
    s.part ? key(s.part) : `subject:${key(s.name)}`;
  const topicsInPart = new Map<string, number>();
  for (const s of subjects)
    topicsInPart.set(
      partKey(s),
      (topicsInPart.get(partKey(s)) ?? 0) + s.topics.length,
    );

  const perTopic = subjects.map((s) =>
    s.partMarks ? s.partMarks / topicsInPart.get(partKey(s))! : null,
  );
  const withMarks = subjects.reduce(
    (n, s, i) => n + (perTopic[i] ? s.topics.length : 0),
    0,
  );
  const total = subjects.reduce((n, s) => n + s.topics.length, 0);
  const strip = ({ name, topics }: MergedSubject) => ({ name, topics });
  if (withMarks * 2 < total) return subjects.map(strip);

  // Median marks per topic, counting every topic (lower median, so it's a real value).
  const each = subjects
    .flatMap((s, i) => (perTopic[i] ? s.topics.map(() => perTopic[i]!) : []))
    .sort((a, b) => a - b);
  const median = each[Math.floor((each.length - 1) / 2)];
  const weightOf = (marks: number) =>
    Math.min(5, Math.max(1, 3 + Math.round(Math.log2(marks / median))));

  return subjects.map((s, i) => ({
    name: s.name,
    topics: s.topics.map((t) => ({
      ...t,
      weight: perTopic[i] ? weightOf(perTopic[i]!) : t.weight,
    })),
  }));
}
