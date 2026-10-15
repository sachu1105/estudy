import { PROMPT_DEFAULTS, type SyllabusPrompts } from "@/server/ai/prompts";

import type { SourceKind } from "./extract";
import { RULES_VERSION } from "./rules";

/**
 * What reads syllabuses right now: the admin's AI switch (and whether the model is set up),
 * whether that model reads pages itself, and the prompts it runs with.
 */
export type Reader = {
  ai: boolean;
  readsDocuments: boolean;
  prompts: SyllabusPrompts;
};

/**
 * Which parser reads a file, and so which cached parse counts as "already read". With AI
 * off, the rules read the text. With AI on, a provider that reads pages takes PDFs and
 * photos itself; everything else goes through the text. An edited prompt has its own
 * version, so it reads files afresh rather than reusing another prompt's reading.
 *
 * `reuses` lists every cached parse good enough to reuse, best first (rule 4): with AI off,
 * a file the AI already read keeps that reading rather than a plainer one.
 */
export function parserFor(reader: Reader, kind: SourceKind) {
  if (!reader.ai)
    return {
      ai: false,
      pages: false,
      version: RULES_VERSION,
      prompt: null,
      reuses: [
        ...new Set([
          reader.prompts.document.version,
          reader.prompts.syllabus.version,
          PROMPT_DEFAULTS.structureDocument.version,
          PROMPT_DEFAULTS.structureSyllabus.version,
          RULES_VERSION,
        ]),
      ],
    };
  const pages = reader.readsDocuments && (kind === "PDF" || kind === "IMAGE");
  const prompt = pages ? reader.prompts.document : reader.prompts.syllabus;
  return {
    ai: true,
    pages,
    version: prompt.version,
    prompt,
    reuses: [prompt.version],
  };
}

/**
 * True when the current reader would read this syllabus better than it was read: only
 * ever an AI parser over an older or rule-based reading, never the rules over an AI one.
 */
export function canUpgrade(
  reader: Reader,
  version: {
    sourceKind: SourceKind | null;
    parse: { promptVersion: string } | null;
  },
) {
  if (!version.parse || !version.sourceKind) return false;
  const parser = parserFor(reader, version.sourceKind);
  return parser.ai && version.parse.promptVersion !== parser.version;
}
