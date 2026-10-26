import {
  minhash,
  postOf,
  SAME_SYLLABUS,
  similarity,
} from "@/server/ai/fingerprint";
import { checkMalayalam, repairMalayalam } from "@/server/ai/malayalam";
import type { SyllabusTree } from "@/server/ai/syllabus-tree";
import type { SyllabusRepository } from "@/server/repositories/syllabus-repository";

import { extractText, type SourceKind } from "./extract";

/** Long enough for a syllabus's text layer; a slower file is left to the worker. */
const QUICK_MS = 3000;

/** An already parsed syllabus that is the same one (another post, a re-typeset copy). */
export async function findTwin(
  syllabuses: SyllabusRepository,
  versions: string[],
  fingerprint: number[],
  post: string | null,
) {
  if (fingerprint.length === 0) return null;
  const candidates = await syllabuses.findSimilarCandidates(versions, post);
  let best: (typeof candidates)[number] | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = similarity(fingerprint, c.minhash);
    if (score > bestScore) [best, bestScore] = [c, score];
  }
  return best && bestScore >= SAME_SYLLABUS ? best : null;
}

/**
 * Gives a version the twin's reading, saved as this file's own copy. The copy keeps the
 * parser that made it, so it is never mistaken for a fresh one.
 */
export async function attachTwin(
  syllabuses: SyllabusRepository,
  twin: { id: string; tree: unknown; promptVersion: string },
  file: {
    versionId: string;
    fileHash: string;
    kind: SourceKind;
    text: string;
    warnings: string[];
    fingerprint: number[];
    post: string | null;
  },
) {
  const parse = await syllabuses.saveParse({
    fileHash: file.fileHash,
    sourceKind: file.kind,
    extractedText: file.text,
    tree: twin.tree as SyllabusTree,
    provider: "cache",
    model: "near-duplicate",
    copiedFromId: twin.id,
    promptVersion: twin.promptVersion,
    warnings: file.warnings,
    minhash: file.fingerprint,
    post: file.post,
  });
  await syllabuses.attachParse(file.versionId, parse);
}

async function quickText(kind: SourceKind, bytes: Uint8Array) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), QUICK_MS);
  });
  try {
    return await Promise.race([extractText(kind, bytes), late]);
  } catch {
    return null; // a scan, or a broken file: the worker says so properly
  } finally {
    clearTimeout(timer);
  }
}

/**
 * At upload, before anything is queued (rule 4): the same syllabus already read for anyone
 * (another post, a re-typeset copy) is found from the file's text and handed over at once,
 * ready to check. A photo, a scan or a slow file is left to the worker, which checks again.
 */
export async function reuseSimilarNow(
  syllabuses: SyllabusRepository,
  file: {
    versionId: string;
    fileHash: string;
    kind: SourceKind;
    bytes: Uint8Array;
    reuses: string[];
  },
) {
  if (file.kind === "IMAGE") return false;
  const raw = await quickText(file.kind, file.bytes);
  if (!raw) return false;
  const text = repairMalayalam(raw);
  const fingerprint = minhash(text);
  const post = postOf(text);
  const twin = await findTwin(syllabuses, file.reuses, fingerprint, post);
  if (!twin) return false;
  await attachTwin(syllabuses, twin, {
    ...file,
    text,
    warnings: checkMalayalam(raw).garbled ? ["MALAYALAM_GARBLED"] : [],
    fingerprint,
    post,
  });
  return true;
}
