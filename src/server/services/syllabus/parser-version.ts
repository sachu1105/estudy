import { STRUCTURE_DOCUMENT_VERSION } from "@/server/ai/prompts/structure-document";
import { STRUCTURE_SYLLABUS_VERSION } from "@/server/ai/prompts/structure-syllabus";

import type { SourceKind } from "./extract";

/**
 * Which parser reads a file, and so which cached parse counts as "already read": a provider
 * that reads pages takes PDFs and photos itself; everything else goes through the text.
 */
export function parserFor(readsDocuments: boolean, kind: SourceKind) {
  const pages = readsDocuments && (kind === "PDF" || kind === "IMAGE");
  return {
    pages,
    version: pages ? STRUCTURE_DOCUMENT_VERSION : STRUCTURE_SYLLABUS_VERSION,
  };
}
