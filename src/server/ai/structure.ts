import { createHash } from "node:crypto";

import type { z } from "zod";

import { chunkText } from "./chunk";
import {
  STRUCTURE_SYLLABUS_VERSION,
  structureSyllabusPrompt,
  structureSyllabusSystem,
} from "./prompts/structure-syllabus";
import {
  STRUCTURE_DOCUMENT_VERSION,
  structureDocumentPrompt,
  structureDocumentSystem,
} from "./prompts/structure-document";
import { splitSections } from "./sections";
import {
  aiChunkSchema,
  chunkJsonSchema,
  mergeChunks,
  type AiChunk,
  type SyllabusTree,
} from "./syllabus-tree";
import {
  AiOutputError,
  type AiAttachment,
  type AIProvider,
  type AiRequest,
  type AiUsageEntry,
} from "./types";

/** The first {...} block of a reply, tolerating code fences and chatter around it. */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new SyntaxError("No JSON object found");
  return JSON.parse(fenced.slice(start, end + 1));
}

function describeIssues(error: z.ZodError) {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

type CallOptions = { onUsage: (entry: AiUsageEntry) => Promise<void> };

/**
 * One model call validated with zod (CLAUDE.md rule 5): invalid output is retried once with
 * the problems spelled out, then the call fails with AiOutputError. Every attempt is logged.
 */
export async function generateValidated<S extends z.ZodType>(
  provider: AIProvider,
  request: AiRequest,
  schema: S,
  { onUsage }: CallOptions,
): Promise<z.output<S>> {
  let prompt = request.prompt;
  let lastIssue = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await provider.generate({ ...request, prompt });
    let parsed: z.ZodSafeParseResult<z.output<S>> | null = null;
    try {
      parsed = schema.safeParse(extractJson(response.text));
      lastIssue = parsed.success ? "" : describeIssues(parsed.error);
    } catch (error) {
      lastIssue = `not JSON (${(error as Error).message})`;
    }
    await onUsage({
      purpose: request.purpose,
      provider: provider.name,
      model: provider.model,
      promptVersion: request.promptVersion,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      costMicros: response.costMicros,
      durationMs: response.durationMs,
      ok: Boolean(parsed?.success),
    });
    if (parsed?.success) return parsed.data;
    prompt = `${request.prompt}

Your previous reply was not valid: ${lastIssue}
Reply again with only the JSON object, following every rule.`;
  }
  throw new AiOutputError(`Invalid AI output after a retry: ${lastIssue}`);
}

export type StructureResult = {
  tree: SyllabusTree | null;
  promptVersion: string;
  chunks: number;
};

const plainTopic = (name: string) => ({
  name: name.slice(0, 200),
  weight: 3,
  difficulty: 3,
  foundational: false,
});

/** Bullets and list numbers that open a new item ("1)", "2.", "•", PDF private-use bullets). */
const ITEM_START = /^(?:\d{1,2}\s*[.)]|[•▪●*-])\s*/;

/**
 * The section's own items: the no-AI fallback and the coverage yardstick. PDF lines wrap
 * mid-item, so lines are joined unless one opens a new item, then split at commas,
 * semicolons and dashes. A dash only separates when spaced or before a capital
 * ("Europeans-Contributions"), so "Quasi-judicial" stays one word.
 */
export function listedItems(body: string) {
  const joined = body
    .split("\n")
    .map((line) => line.trim())
    .reduce(
      (text, line) =>
        ITEM_START.test(line) ? `${text}\n${line}` : `${text} ${line}`,
      "",
    );
  return joined
    .split(/[,;\n–]|\s-|-\s|-(?=\p{Lu})/u)
    .map((item) =>
      item
        .replace(ITEM_START, "")
        .replace(/^[\s\d.)•*-]+/, "")
        .replace(/[.\s]+$/, "")
        .trim(),
    )
    .filter((item) => item.length >= 2);
}

/** A reply listing under half the section's items has summarised instead of listing. */
const MIN_COVERAGE = 0.5;
const topicTotal = (chunk: AiChunk) =>
  chunk.subjects.reduce((n, s) => n + s.topics.length, 0);

/** Untitled text before the first heading is usually the notification header. */
const PREAMBLE_MAX_CHARS = 600;

// \p{M} keeps Malayalam vowel signs (ാ, ി, ്...): without them കല and കാല would collide.
const nameKey = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, "");

/**
 * A topic is kept only when most of its words appear in the text it came from, so a model
 * can't invent topics (it did, from a Malayalam section). Substring matching on the joined
 * text tolerates small spelling slips and Malayalam suffixes (കേരളത്തി in കേരളത്തിലെ).
 */
export function isGrounded(topic: string, source: string) {
  const text = nameKey(source);
  const all = topic.split(/\s+/).map(nameKey).filter(Boolean);
  // Skip "of", "to"... but a short topic like കല (art) is checked whole.
  const long = all.filter((w) => w.length >= 3);
  const words = long.length > 0 ? long : all;
  if (words.length === 0) return false;
  const found = words.filter((w) => text.includes(w)).length;
  return found * 2 > words.length; // a strict majority of its words
}

/**
 * Adds back every listed item no topic covers (the model sometimes turns an item into a
 * subject name, or skips it). Covered means one name contains the other, so a model that
 * split "അംശബന്ധവും അനുപാതവും" into two topics doesn't get the pair added again.
 */
export function withMissingItems<T extends { name: string }>(
  topics: T[],
  chunk: string,
) {
  const keys = topics.map((t) => nameKey(t.name)).filter(Boolean);
  const missing = listedItems(chunk).filter((item) => {
    const k = nameKey(item);
    return k && !keys.some((t) => t.includes(k) || k.includes(t));
  });
  return [
    ...topics,
    ...missing.map((item) => plainTopic(item) as unknown as T),
  ];
}

/** Subjects found in one section piece, without marks (those come from the syllabus). */
export type CachedPiece = {
  name: string;
  topics: AiChunk["subjects"][0]["topics"];
}[];

export interface PieceCache {
  get(key: string): Promise<CachedPiece | null>;
  set(key: string, subjects: CachedPiece): Promise<void>;
}

/** Same heading and same words (ignoring case, spacing and punctuation) -> same key. */
export function pieceKey(heading: string | null, chunk: string) {
  const normal = `${heading ?? ""}\n${chunk}`
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
  return `${STRUCTURE_SYLLABUS_VERSION}:${createHash("sha256").update(normal).digest("hex")}`;
}

type Piece = {
  chunk: string;
  heading: string | null;
  part: string | null;
  piece: number;
  pieces: number;
};

/**
 * Text -> sections (by the syllabus's own headings) -> one validated call per section piece
 * -> merged tree. Headings and marks come from the text, never the model. A reply that
 * summarises a section into a few broad topics is asked again once; a section the model
 * returns nothing for keeps its listed items, so no part of the syllabus is dropped.
 */
export async function structureSyllabus(
  provider: AIProvider,
  text: string,
  options: CallOptions & {
    title?: string | null;
    onProgress?: (done: number, total: number) => Promise<void>;
    pieceCache?: PieceCache;
  },
): Promise<StructureResult> {
  const sections = splitSections(text);
  const structured = sections.some((s) => s.heading || s.part);
  const work = sections
    .filter(
      (s, i) =>
        !(
          structured &&
          i === 0 &&
          !s.heading &&
          !s.part &&
          s.body.length <= PREAMBLE_MAX_CHARS
        ),
    )
    // Small pieces keep each reply well inside the output budget, so JSON is never cut off.
    .map((section) => ({
      section,
      pieces: section.body ? chunkText(section.body, 3500) : [],
    }));
  const total = Math.max(
    1,
    work.reduce((n, w) => n + w.pieces.length, 0),
  );
  const results: AiChunk[] = [];
  let done = 0;

  const ask = (piece: Piece, nudge?: string) =>
    generateValidated(
      provider,
      {
        purpose: "STRUCTURE_SYLLABUS",
        promptVersion: STRUCTURE_SYLLABUS_VERSION,
        system: structureSyllabusSystem,
        prompt:
          structureSyllabusPrompt({ ...piece, title: options.title }) +
          (nudge ?? ""),
        jsonSchema: chunkJsonSchema as unknown as Record<string, unknown>,
        maxOutputTokens: 4096,
      },
      aiChunkSchema,
      options,
    );

  for (const { section, pieces } of work) {
    // Marks are shared within a group: a part, or one section with marks of its own.
    const fromText = { part: section.group, partMarks: section.partMarks };
    if (pieces.length === 0) {
      // "8. Current affairs": a heading with nothing under it is a topic of its own.
      if (section.heading)
        results.push({
          subjects: [
            {
              name: section.heading,
              ...fromText,
              topics: [plainTopic(section.heading)],
            },
          ],
        });
      continue;
    }
    for (const [index, chunk] of pieces.entries()) {
      const piece = {
        chunk,
        heading: section.heading,
        part: section.part,
        piece: index + 1,
        pieces: pieces.length,
      };
      // Most PSC syllabuses share whole sections word for word (Simple Arithmetic, English
      // grammar): one seen before in any syllabus is reused without an AI call.
      const cacheKey = pieceKey(section.heading, chunk);
      const cached = await options.pieceCache?.get(cacheKey);
      if (cached) {
        results.push({
          subjects: cached.map((s) => ({ ...s, ...fromText })),
        });
        await options.onProgress?.(++done, total);
        continue;
      }
      const items = listedItems(chunk).length;
      let reply = await ask(piece);
      if (topicTotal(reply) < items * MIN_COVERAGE) {
        const again = await ask(
          piece,
          `\n\nThe text lists about ${items} items. List every one of them as its own topic; don't group or summarise them.`,
        );
        if (topicTotal(again) > topicTotal(reply)) reply = again;
      }
      const grounded = reply.subjects
        .map((s) => ({
          ...s,
          ...fromText,
          topics: s.topics.filter((t) => isGrounded(t.name, chunk)),
        }))
        .filter((s) => s.topics.length > 0);
      // A section with a heading is one subject named by that heading; the model's own
      // subject names (often a topic, or the container part) are not trusted there.
      const subjects =
        section.heading && grounded.length > 0
          ? [
              {
                name: section.heading,
                ...fromText,
                topics: withMissingItems(
                  grounded.flatMap((s) => s.topics),
                  chunk,
                ),
              },
            ]
          : grounded;
      const final =
        subjects.length > 0
          ? subjects
          : section.heading
            ? [
                {
                  name: section.heading,
                  ...fromText,
                  topics: listedItems(chunk).map(plainTopic),
                },
              ]
            : [];
      if (final.length > 0) {
        results.push({ subjects: final });
        await options.pieceCache?.set(
          cacheKey,
          final.map(({ name, topics }) => ({ name, topics })),
        );
      }
      await options.onProgress?.(++done, total);
    }
  }
  return {
    tree: mergeChunks(results),
    promptVersion: STRUCTURE_SYLLABUS_VERSION,
    chunks: total,
  };
}

/**
 * The hosted path: the model reads the file's pages (PDF or photo) in one validated call.
 * No text-layer rules, so old Malayalam fonts and scans read right. Marks still become
 * weights through mergeChunks.
 */
export async function structureDocument(
  provider: AIProvider,
  attachment: AiAttachment,
  options: CallOptions & { title?: string | null },
): Promise<StructureResult> {
  const reply = await generateValidated(
    provider,
    {
      purpose: "STRUCTURE_SYLLABUS",
      promptVersion: STRUCTURE_DOCUMENT_VERSION,
      system: structureDocumentSystem,
      prompt: structureDocumentPrompt(options.title),
      jsonSchema: chunkJsonSchema as unknown as Record<string, unknown>,
      // A full Kerala PSC syllabus runs to several hundred topics.
      maxOutputTokens: 20_000,
      attachment,
    },
    aiChunkSchema,
    options,
  );
  return {
    tree: mergeChunks([reply]),
    promptVersion: STRUCTURE_DOCUMENT_VERSION,
    chunks: 1,
  };
}
