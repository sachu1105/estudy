// Reads a syllabus with no AI at all: the text's own headings become subjects and its
// lists become topics. Used whenever the admin's AI switch is off, and by the admin's
// syllabus builder always. Pure and deterministic: the same text gives the same tree.

import { splitSections } from "@/server/ai/sections";
import { listedItems } from "@/server/ai/structure";
import {
  mergeChunks,
  type AiChunk,
  type SyllabusTree,
} from "@/server/ai/syllabus-tree";

/** The cache key for a rule-based reading; bump it when the rules change. */
export const RULES_VERSION = "rules@1";

const plainTopic = (name: string) => ({
  name: name.slice(0, 200),
  weight: 3,
  difficulty: 3,
  foundational: false,
});

/** Untitled text before the first heading is usually the notification header. */
const PREAMBLE_MAX_CHARS = 600;

/** "1.", "2)", "•", "-", "*": a line that opens a list item. */
const ITEM_START = /^(?:\d{1,2}\s*[.)]|[•▪●*-])\s*/;
/** "History: Kerala, India": a short name, then its items. A dash is too common inside
 * topics ("Kerala - Arrival of Europeans") to mark a subject. */
const LABELLED = /^([^,:;]{2,60}?)\s*:\s*(\S.*)$/;

const words = (line: string) => line.split(/\s+/).filter(Boolean).length;

/** "History: Kerala renaissance, ..." inside a section: the label is a sub-heading, and
 * only the items after it are topics. */
const unlabel = (body: string) =>
  body
    .split("\n")
    .map((line) => {
      const m = ITEM_START.test(line) ? null : LABELLED.exec(line);
      return m && words(m[1]!) <= 4 ? m[2]! : line;
    })
    .join("\n");

/** A line cut off mid-item: it ends on a comma, a dash or a joining word. */
const CONTINUES = /(?:[,&\-–]|\b(?:and|of|the|in|to))$/i;
/** Notification fine print ("It may be noted that apart from the topics..."), not topics. */
const BOILERPLATE =
  /^(?:note\b|n\.\s?b\b|it may be noted|there is no undertaking)/i;
/** Longer than this is a sentence of instructions, not a topic name. */
const MAX_TOPIC_WORDS = 14;
/** "1. Ancient India" straight after "2. ...": numbers mark topics, not headings. */
const NUMBERED_LIST = /^\d{1,2}\s*[.)]\s+.*\n\d{1,2}\s*[.)]\s+/m;

/**
 * Topics from a block of lines. A line runs on into the next only when it was cut off
 * mid-item or the next starts in lower case (a PDF wrap); otherwise every line is its own,
 * split at commas and semicolons like the AI path's yardstick.
 */
function ruleItems(body: string) {
  const logical: string[] = [];
  for (const line of body.split("\n").map((l) => l.trim())) {
    if (!line) continue;
    const prev = logical.at(-1);
    if (
      prev !== undefined &&
      !ITEM_START.test(line) &&
      (CONTINUES.test(prev) || /^\p{Ll}/u.test(line))
    )
      logical[logical.length - 1] = `${prev} ${line}`;
    else logical.push(line);
  }
  return logical
    .filter((line) => !BOILERPLATE.test(line))
    .flatMap((line) => listedItems(line))
    .filter((item) => words(item) <= MAX_TOPIC_WORDS);
}

/** A line that names a subject: short, not a list item, no list punctuation. */
function headingLike(line: string, next: string | undefined) {
  if (ITEM_START.test(line) || line.length > 80 || words(line) > 6)
    return false;
  if (/:$/.test(line)) return true;
  if (/[,;.]$/.test(line) || line.includes(",")) return false;
  // A bare short line counts only when a list follows it.
  return next !== undefined && ITEM_START.test(next);
}

/**
 * Plain notes-style syllabuses with no numbered parts: "History:" or a short line over a
 * bulleted list opens a subject; "Geography: rivers, climate" is a subject with its items.
 */
function plainSubjects(text: string, fallback: string): AiChunk {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const subjects: { name: string; body: string[] }[] = [];
  let current: { name: string; body: string[] } | null = null;
  for (const [i, line] of lines.entries()) {
    const labelled = ITEM_START.test(line) ? null : LABELLED.exec(line);
    if (labelled && words(labelled[1]!) <= 6) {
      current = { name: labelled[1]!.trim(), body: [labelled[2]!] };
      subjects.push(current);
    } else if (headingLike(line, lines[i + 1])) {
      current = { name: line.replace(/[:\s]+$/, ""), body: [] };
      subjects.push(current);
    } else {
      if (!current) {
        current = { name: fallback, body: [] };
        subjects.push(current);
      }
      current.body.push(line);
    }
  }
  return {
    subjects: subjects.map((s) => {
      const items = ruleItems(s.body.join("\n"));
      return {
        name: s.name,
        part: null,
        partMarks: null,
        topics: (items.length > 0 ? items : [s.name]).map(plainTopic),
      };
    }),
  };
}

/**
 * Text -> subjects and topics, by rules only. Syllabuses with parts and sections ("Part I",
 * "(i) HISTORY (5 Marks)") are split on those, and stated marks still set topic weights.
 * Everything else falls back to headings and lists. The tree is a starting point the user
 * (or admin) checks and edits before anything is built from it (rule 5).
 */
export function structureByRules(
  text: string,
  title?: string | null,
): SyllabusTree | null {
  const fallback = title?.trim() || "Syllabus";
  const sections = splitSections(text);
  const headed = sections.filter((s) => s.heading || s.part);
  // Numbered topics read as headings leave most sections empty: treat it as plain text.
  const listNotHeadings =
    !sections.some((s) => s.part) && NUMBERED_LIST.test(text);
  const sound =
    headed.length > 0 &&
    !listNotHeadings &&
    headed.filter((s) => s.body.trim()).length * 2 >= headed.length;
  if (!sound) return mergeChunks([plainSubjects(text, fallback)]);

  const chunks: AiChunk[] = sections.flatMap((section, i) => {
    const untitled = !section.heading && !section.part;
    if (i === 0 && untitled && section.body.length <= PREAMBLE_MAX_CHARS)
      return [];
    if (untitled) return [plainSubjects(section.body, fallback)];
    const name = section.heading ?? section.part!;
    const items = ruleItems(unlabel(section.body));
    return [
      {
        subjects: [
          {
            name,
            part: section.group,
            partMarks: section.partMarks,
            topics: (items.length > 0 ? items : [name]).map(plainTopic),
          },
        ],
      },
    ];
  });
  return mergeChunks(chunks);
}
