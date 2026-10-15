import { createHash } from "node:crypto";

import type { AiPromptKey } from "@/lib/settings/schemas";

import {
  STRUCTURE_DOCUMENT_VERSION,
  structureDocumentSystem,
} from "./structure-document";
import {
  STRUCTURE_SYLLABUS_VERSION,
  structureSyllabusSystem,
} from "./structure-syllabus";

/** The built-in instructions for each AI task, and the version they are cached under. */
export const PROMPT_DEFAULTS: Record<
  AiPromptKey,
  { system: string; version: string }
> = {
  structureSyllabus: {
    system: structureSyllabusSystem,
    version: STRUCTURE_SYLLABUS_VERSION,
  },
  structureDocument: {
    system: structureDocumentSystem,
    version: STRUCTURE_DOCUMENT_VERSION,
  },
};

export type ActivePrompt = { system: string; version: string; custom: boolean };

/**
 * The prompt a task runs with: the admin's edit (Admin > AI) or the built-in one. An edit
 * gets its own version, built-in version plus a hash of the text, so readings made with
 * different instructions are never mixed up in the caches (rule 4) and AiUsage says which
 * prompt every call used.
 */
export function activePrompt(
  key: AiPromptKey,
  override?: string | null,
): ActivePrompt {
  const base = PROMPT_DEFAULTS[key];
  const text = override?.trim();
  if (!text || text === base.system.trim())
    return { system: base.system, version: base.version, custom: false };
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 10);
  return { system: text, version: `${base.version}~${hash}`, custom: true };
}

/** The prompts syllabus reading uses, from the saved overrides. */
export function syllabusPrompts(
  overrides: Partial<Record<AiPromptKey, string>> = {},
) {
  return {
    syllabus: activePrompt("structureSyllabus", overrides.structureSyllabus),
    document: activePrompt("structureDocument", overrides.structureDocument),
  };
}
export type SyllabusPrompts = ReturnType<typeof syllabusPrompts>;
