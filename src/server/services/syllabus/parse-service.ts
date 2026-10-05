import { checkMalayalam, repairMalayalam } from "@/server/ai/malayalam";
import { STRUCTURE_SYLLABUS_VERSION } from "@/server/ai/prompts/structure-syllabus";
import { structureSyllabus } from "@/server/ai/structure";
import { AiOutputError } from "@/server/ai/types";
import { jobChannel, type JobEvent } from "@/server/realtime/types";

import { sha256Hex, type ParseDeps } from "./deps";
import { extractText, ParseInputError } from "./extract";

const MESSAGES = {
  noTree:
    "We couldn't find subjects and topics in this file. Check that it's the syllabus, or paste the text.",
  badOutput:
    "The AI couldn't turn this syllabus into a clean list of topics. Try again, or paste only the syllabus text.",
  unavailable:
    "The syllabus reader is unavailable right now. Try again in a few minutes.",
  changed: "The uploaded file changed after it was checked. Upload it again.",
};

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

  async function run(parseJobId: string, { attempt, maxAttempts }: Attempt) {
    const job = await deps.parseJobs.findById(parseJobId);
    if (!job || job.status === "READY" || job.status === "FAILED") return;
    const version = job.syllabusVersion;
    if (
      version.deletedAt ||
      !version.fileHash ||
      !version.sourceFileKey ||
      !version.sourceKind
    )
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
      // Someone may have uploaded the same file while this job waited in the queue.
      const existing = await deps.syllabuses.findParse(
        version.fileHash,
        STRUCTURE_SYLLABUS_VERSION,
      );
      if (existing) {
        await deps.syllabuses.attachParse(version.id, existing);
        return ready(job.id, true);
      }

      const bytes = await deps.storage.getBytes(version.sourceFileKey);
      if ((await sha256Hex(bytes)) !== version.fileHash)
        return fail(job.id, MESSAGES.changed);
      const raw = await extractText(version.sourceKind, bytes, deps.ocr);
      // Old PSC fonts scramble Malayalam: repair what can be, and tell the user to check.
      const warnings = checkMalayalam(raw).garbled ? ["MALAYALAM_GARBLED"] : [];
      const text = repairMalayalam(raw);

      await update(job.id, { stage: "STRUCTURING", progress: 5 });
      const result = await structureSyllabus(deps.ai, text, {
        title: version.title,
        onUsage: (entry) =>
          deps.aiUsage.record({ ...entry, userId: job.userId, refId: job.id }),
        onProgress: (done, total) =>
          update(job.id, { progress: 5 + Math.floor((90 * done) / total) }),
      });
      if (!result.tree) return fail(job.id, MESSAGES.noTree);

      const parse = await deps.syllabuses.saveParse({
        fileHash: version.fileHash,
        sourceKind: version.sourceKind,
        extractedText: text,
        tree: result.tree,
        provider: deps.ai.name,
        model: deps.ai.model,
        promptVersion: result.promptVersion,
        warnings,
      });
      await deps.syllabuses.attachParse(version.id, parse);
      return ready(job.id, false);
    } catch (error) {
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
