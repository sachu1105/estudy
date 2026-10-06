import {
  minhash,
  postOf,
  SAME_SYLLABUS,
  similarity,
} from "@/server/ai/fingerprint";
import { checkMalayalam, repairMalayalam } from "@/server/ai/malayalam";
import { structureDocument, structureSyllabus } from "@/server/ai/structure";
import type { SyllabusTree } from "@/server/ai/syllabus-tree";
import { AiOutputError, type AiUsageEntry } from "@/server/ai/types";
import { jobChannel, type JobEvent } from "@/server/realtime/types";

import { sha256Hex, type ParseDeps } from "./deps";
import {
  extractText,
  imageMime,
  ParseInputError,
  type SourceKind,
} from "./extract";
import { parserFor } from "./parser-version";

const MESSAGES = {
  noTree:
    "We couldn't find subjects and topics in this file. Check that it's the syllabus, or paste the text.",
  badOutput:
    "The AI couldn't turn this syllabus into a clean list of topics. Try again, or paste only the syllabus text.",
  unavailable:
    "The syllabus reader is unavailable right now. Try again in a few minutes.",
  changed: "The uploaded file changed after it was checked. Upload it again.",
};

/** The user deleted the syllabus while it was being read. */
class StoppedError extends Error {}

type Attempt = { attempt: number; maxAttempts: number };

/**
 * The worker pipeline (CLAUDE.md rule 2): read -> extract text -> structure with AI ->
 * validate -> save as a DRAFT for the user's review. Never runs inside a web request.
 */
export function createParseService(deps: ParseDeps) {
  async function update(
    id: string,
    patch: Partial<Omit<JobEvent, "id">> & { attemptsIncrement?: boolean },
    extra: { startedAt?: Date; finishedAt?: Date } = {},
  ) {
    const { attemptsIncrement, ...fields } = patch;
    const job = await deps.parseJobs.update(id, {
      ...fields,
      ...extra,
      ...(attemptsIncrement ? { attempts: { increment: 1 } } : {}),
    });
    const event: JobEvent = {
      id: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      error: job.error,
      reused: job.reused,
    };
    await deps.publisher.publish(jobChannel(id), event);
  }

  const fail = (id: string, error: string) =>
    update(
      id,
      { status: "FAILED", stage: "FAILED", error },
      { finishedAt: deps.clock.now() },
    );

  const ready = (id: string, reused: boolean) =>
    update(
      id,
      { status: "READY", stage: "READY", progress: 100, error: null, reused },
      { finishedAt: deps.clock.now() },
    );

  /**
   * The text layer, cleaned. When the AI reads pages itself, a file with no usable text (a
   * scan, a photo) is fine: the text only feeds the near-duplicate check and "Source text".
   */
  async function readText(kind: SourceKind, bytes: Uint8Array, pages: boolean) {
    try {
      const raw = await extractText(kind, bytes, deps.ocr);
      // Old PSC fonts scramble Malayalam. Reading pages avoids the problem altogether;
      // otherwise repair what can be, and tell the user to check the names.
      const garbled = !pages && checkMalayalam(raw).garbled;
      return {
        text: pages ? raw : repairMalayalam(raw),
        warnings: garbled ? ["MALAYALAM_GARBLED"] : [],
      };
    } catch (error) {
      if (pages && error instanceof ParseInputError)
        return { text: "", warnings: [] as string[] };
      throw error;
    }
  }

  /** An already parsed syllabus that is the same one (another post, a re-typeset copy). */
  async function findTwin(
    version: string,
    fingerprint: number[],
    post: string | null,
  ) {
    if (fingerprint.length === 0) return null;
    const candidates = await deps.syllabuses.findSimilarCandidates(
      version,
      post,
    );
    let best: (typeof candidates)[number] | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      const score = similarity(fingerprint, c.minhash);
      if (score > bestScore) [best, bestScore] = [c, score];
    }
    return best && bestScore >= SAME_SYLLABUS ? best : null;
  }

  async function run(parseJobId: string, { attempt, maxAttempts }: Attempt) {
    const job = await deps.parseJobs.findById(parseJobId);
    if (!job || job.status === "READY" || job.status === "FAILED") return;
    const version = job.syllabusVersion;
    if (version.deletedAt) return; // deleted while queued
    if (!version.fileHash || !version.sourceFileKey || !version.sourceKind)
      return fail(job.id, MESSAGES.changed);

    await update(
      job.id,
      {
        status: "RUNNING",
        stage: "READING",
        progress: 0,
        error: null,
        attemptsIncrement: true,
      },
      { startedAt: deps.clock.now() },
    );
    try {
      const kind = version.sourceKind;
      const parser = parserFor(deps.ai.readsDocuments, kind);
      // 1. Someone may have uploaded the same file while this job waited in the queue.
      const existing = await deps.syllabuses.findParse(
        version.fileHash,
        parser.version,
      );
      if (existing) {
        await deps.syllabuses.attachParse(version.id, existing);
        return ready(job.id, true);
      }

      const bytes = await deps.storage.getBytes(version.sourceFileKey);
      if ((await sha256Hex(bytes)) !== version.fileHash)
        return fail(job.id, MESSAGES.changed);
      const { text, warnings } = await readText(kind, bytes, parser.pages);
      const fingerprint = text ? minhash(text) : [];
      const post = text ? postOf(text) : null;
      const save = (
        tree: SyllabusTree,
        extra: { provider: string; model: string; copiedFromId?: string },
      ) =>
        deps.syllabuses.saveParse({
          fileHash: version.fileHash!,
          sourceKind: kind,
          extractedText: text,
          tree,
          promptVersion: parser.version,
          warnings,
          minhash: fingerprint,
          post,
          ...extra,
        });

      // 2. The same syllabus already read for another post or upload: no AI call at all.
      const twin = await findTwin(parser.version, fingerprint, post);
      if (twin) {
        const parse = await save(twin.tree as SyllabusTree, {
          provider: "cache",
          model: "near-duplicate",
          copiedFromId: twin.id,
        });
        await deps.syllabuses.attachParse(version.id, parse);
        return ready(job.id, true);
      }

      // 3. Read it: the pages themselves when the AI can, else the text section by section,
      //    reusing every section any earlier syllabus already had. The user may delete it
      //    meanwhile: checked before the AI starts and after every section.
      if (await deps.syllabuses.isDeleted(version.id)) throw new StoppedError();
      await update(job.id, { stage: "STRUCTURING", progress: 5 });
      const onUsage = (entry: AiUsageEntry) =>
        deps.aiUsage.record({ ...entry, userId: job.userId, refId: job.id });
      const result = parser.pages
        ? await structureDocument(
            deps.ai,
            {
              kind: kind === "PDF" ? "pdf" : "image",
              mediaType: kind === "PDF" ? "application/pdf" : imageMime(bytes),
              base64: Buffer.from(bytes).toString("base64"),
            },
            { title: version.title, onUsage },
          )
        : await structureSyllabus(deps.ai, text, {
            title: version.title,
            onUsage,
            pieceCache: deps.sectionCache,
            onProgress: async (done, total) => {
              if (await deps.syllabuses.isDeleted(version.id))
                throw new StoppedError();
              await update(job.id, {
                progress: 5 + Math.floor((90 * done) / total),
              });
            },
          });
      if (await deps.syllabuses.isDeleted(version.id)) throw new StoppedError();
      if (!result.tree) return fail(job.id, MESSAGES.noTree);

      const parse = await save(result.tree, {
        provider: deps.ai.name,
        model: deps.ai.model,
      });
      await deps.syllabuses.attachParse(version.id, parse);
      return ready(job.id, false);
    } catch (error) {
      if (error instanceof StoppedError) return; // deleted; the delete already closed the job
      if (error instanceof ParseInputError) return fail(job.id, error.message);
      if (error instanceof AiOutputError)
        return fail(job.id, MESSAGES.badOutput);
      // Infrastructure trouble (AI or storage down): let BullMQ retry, failing visibly at the end.
      if (attempt >= maxAttempts) await fail(job.id, MESSAGES.unavailable);
      else
        await update(job.id, {
          status: "QUEUED",
          stage: "QUEUED",
          progress: 0,
        });
      throw error;
    }
  }

  return { run };
}

export type ParseService = ReturnType<typeof createParseService>;
