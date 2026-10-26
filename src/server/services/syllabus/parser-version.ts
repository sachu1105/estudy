import { ANY_AI_READING } from "@/lib/syllabus/readings";
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
 * photos itself; everything else goes through the text.
 *
 * `reuses` lists every cached parse good enough to reuse, best first (rule 4): any AI
 * reading of the same syllabus, whichever model or prompt made it, so nobody pays for a
 * syllabus someone already had read; with AI off, an AI reading beats the plainer rules.
 * `fresh` is "Read again": only a reading by the current prompt will do.
 */
export function parserFor(
  reader: Reader,
  kind: SourceKind,
  { fresh = false }: { fresh?: boolean } = {},
) {
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
          ANY_AI_READING,
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
    reuses: fresh ? [prompt.version] : [prompt.version, ANY_AI_READING],
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
  const parser = parserFor(reader, version.sourceKind, { fresh: true });
  return parser.ai && version.parse.promptVersion !== parser.version;
}
