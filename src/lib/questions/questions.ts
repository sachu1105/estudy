// Practice questions: shape, import, picking and scoring. Pure; shared by the admin forms,
// the test player and the server, which alone scores (milestone 8).

import { z } from "zod";

/**
 * A topic name reduced to letters and digits (Malayalam included), so "Preamble",
 * "PREAMBLE." and "Preamble " in different syllabuses share one pool.
 */
export function topicKey(name: string) {
  return name
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

const text = (max: number) => z.string().trim().min(1).max(max);

export const questionInputSchema = z
  .object({
    topicName: text(200),
    difficulty: z.number().int().min(1).max(5),
    language: z.enum(["EN", "ML"]).default("EN"),
    body: z.string().trim().min(5, "Write the question.").max(2000),
    options: z
      .array(text(500))
      .length(4, "A question has exactly four options."),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().max(2000).nullable().default(null),
    sourceRef: z.string().trim().max(200).nullable().default(null),
  })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === 4, {
    message: "The four options must all be different.",
    path: ["options"],
  });

export type QuestionInput = z.output<typeof questionInputSchema>;

/** Splits one CSV line, honouring quotes ("a, b" stays one field; "" is a quote). */
function csvFields(line: string) {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      fields.push(field);
      field = "";
    } else field += c;
  }
  fields.push(field);
  return fields.map((f) => f.trim());
}

export const IMPORT_COLUMNS =
  "topic, difficulty, question, option A, option B, option C, option D, answer (A-D), explanation, source";

/**
 * Bulk import: CSV with the columns above (a header row is skipped), or a JSON array of
 * question objects. Every row is checked; bad rows come back with their line number.
 */
export function parseImport(raw: string): {
  questions: QuestionInput[];
  errors: { line: number; message: string }[];
} {
  const questions: QuestionInput[] = [];
  const errors: { line: number; message: string }[] = [];
  const trimmed = raw.trim();
  const rows: { line: number; value: unknown }[] = [];

  if (trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed) as unknown[];
      data.forEach((value, i) => rows.push({ line: i + 1, value }));
    } catch {
      return {
        questions,
        errors: [{ line: 1, message: "That isn't valid JSON." }],
      };
    }
  } else {
    trimmed.split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      const f = csvFields(line);
      if (i === 0 && f[0]?.toLowerCase() === "topic") return;
      const answer = "ABCD".indexOf((f[7] ?? "").toUpperCase());
      rows.push({
        line: i + 1,
        value: {
          topicName: f[0],
          difficulty: Number(f[1]),
          body: f[2],
          options: f.slice(3, 7),
          correctIndex: answer,
          explanation: f[8] || null,
          sourceRef: f[9] || null,
        },
      });
    });
  }
  for (const row of rows) {
    const parsed = questionInputSchema.safeParse(row.value);
    if (parsed.success) questions.push(parsed.data);
    else
      errors.push({
        line: row.line,
        message: parsed.error.issues[0]?.message ?? "Check this row.",
      });
  }
  return { questions, errors };
}

/**
 * Picks `count` questions, ones the user has seen least first, shuffled within that by
 * `random` so two tests on a topic don't come out the same.
 */
export function pickQuestions<T extends { id: string }>(
  pool: T[],
  count: number,
  timesSeen: Map<string, number>,
  random: () => number,
) {
  return pool
    .map((q) => ({ q, seen: timesSeen.get(q.id) ?? 0, r: random() }))
    .sort((a, b) => a.seen - b.seen || a.r - b.r)
    .slice(0, count)
    .map((x) => x.q);
}

/** PSC style: a third of a mark off for each wrong answer. */
export const NEGATIVE_MARK = 1 / 3;

export function scoreAnswers(
  questions: { id: string; correctIndex: number }[],
  answers: Map<string, number | null>,
  negativeMarking: boolean,
) {
  let correct = 0;
  let wrong = 0;
  for (const q of questions) {
    const chosen = answers.get(q.id);
    if (chosen === undefined || chosen === null) continue;
    if (chosen === q.correctIndex) correct++;
    else wrong++;
  }
  const total = questions.length;
  const score = negativeMarking ? correct - wrong * NEGATIVE_MARK : correct;
  return {
    total,
    correct,
    wrong,
    skipped: total - correct - wrong,
    score: Math.round(score * 100) / 100,
    accuracy: total ? correct / total : 0,
  };
}

/**
 * Questions for a section or full mock, spread across topics in proportion to their
 * weight (share of the marks): heavier topics come up more often, and no topic eats the
 * whole test. Within a topic, least seen first.
 */
export function spreadQuestions<T extends { id: string; topicKey: string }>(
  pool: T[],
  topics: { key: string; weight: number }[],
  count: number,
  timesSeen: Map<string, number>,
  random: () => number,
) {
  const queues = new Map<string, T[]>();
  for (const { key } of topics)
    queues.set(
      key,
      pickQuestions(
        pool.filter((q) => q.topicKey === key),
        Infinity,
        timesSeen,
        random,
      ),
    );
  // One pass gives each topic `weight` turns, interleaved: A B C A B A for 3, 2, 1.
  const maxWeight = Math.max(1, ...topics.map((t) => t.weight));
  const rotation: string[] = [];
  for (let round = 0; round < maxWeight; round++)
    for (const t of topics) if (t.weight > round) rotation.push(t.key);

  const picked: T[] = [];
  while (picked.length < count) {
    let added = false;
    for (const key of rotation) {
      const next = queues.get(key)?.shift();
      if (!next) continue;
      picked.push(next);
      added = true;
      if (picked.length === count) break;
    }
    if (!added) break; // every topic has run out
  }
  return picked;
}
