import { normaliseText } from "@/server/ai/chunk";
import { jobChannel, type JobEvent } from "@/server/realtime/types";
import type { AuditLogRepository } from "@/server/repositories/audit-log-repository";

import { failure, sha256Hex, type Result, type SyllabusDeps } from "./deps";
import { MAX_TEXT_CHARS, sniffKind, type SourceKind } from "./extract";
import { parserFor } from "./parser-version";
import { reuseSimilarNow } from "./similar";
import { UPLOAD_MAX_BYTES } from "./upload-service";

type Admin = { id: string; ip?: string | null };
type Input = {
  title: string;
  examId: string;
  /** The syllabus file itself, or the text when there is no file. */
  file: { name: string; bytes: Uint8Array } | null;
  text: string | null;
};

const AI_OFF = failure(
  "AI_OFF",
  "AI reading is off. A super admin can switch it on under Admin > AI, or read it by headings and lists.",
);

/**
 * The admin's syllabus builder, read by the AI: the same background job as a user's upload
 * (rule 2), the same caches (rule 4), and the result waits in review as PENDING (rule 5).
 * Runs only while the admin AI switch for syllabuses is on (rule 17).
 */
export function createCatalogueReadService(
  deps: SyllabusDeps & { audit: AuditLogRepository },
) {
  async function startJob(by: Admin, versionId: string) {
    const job = await deps.parseJobs.create({
      syllabusVersionId: versionId,
      userId: by.id,
    });
    await deps.queue.enqueue({ parseJobId: job.id }, { priority: "high" });
    const event: JobEvent = {
      id: job.id,
      status: "QUEUED",
      stage: "QUEUED",
      progress: 0,
      error: null,
      reused: false,
    };
    await deps.publisher.publish(jobChannel(job.id), event);
    return job;
  }

  /** The bytes to store and read, checked like a user's upload. */
  async function source(
    input: Input,
    readsDocuments: boolean,
  ): Promise<Result<{ bytes: Uint8Array; kind: SourceKind }>> {
    if (input.file) {
      if (input.file.bytes.byteLength > UPLOAD_MAX_BYTES)
        return failure(
          "TOO_LARGE",
          "This file is over 15 MB. Upload only the syllabus pages.",
        );
      const kind = sniffKind(input.file.bytes);
      if (!kind || (kind === "IMAGE" && !readsDocuments))
        return failure(
          "UNSUPPORTED",
          readsDocuments
            ? "Upload a PDF, a Word file (.docx) or a photo (JPG, PNG or WebP), or paste the text."
            : "Upload a PDF or a Word file (.docx), or paste the text. Photos need a model that reads pages.",
        );
      return { ok: true, bytes: input.file.bytes, kind };
    }
    const text = normaliseText(input.text ?? "");
    if (text.length < 40)
      return failure(
        "TOO_SHORT",
        "Paste the whole syllabus, or fill it from a file.",
      );
    if (text.length > MAX_TEXT_CHARS)
      return failure(
        "TOO_LONG",
        "That's more text than a syllabus usually has. Paste only the syllabus.",
      );
    return { ok: true, bytes: new TextEncoder().encode(text), kind: "TEXT" };
  }

  return {
    /** Stores the file, then reuses an earlier reading of it or queues the AI. */
    async start(
      by: Admin,
      input: Input,
    ): Promise<Result<{ id: string; reused: boolean }>> {
      const reader = await deps.reader();
      if (!reader.ai) return AI_OFF;
      if (!(await deps.catalogue.examExists(input.examId)))
        return failure("NO_EXAM", "Pick the exam this syllabus is for.");
      const checked = await source(input, reader.readsDocuments);
      if (!checked.ok) return checked;
      const { bytes, kind } = checked;

      const key = `syllabus/catalogue/${deps.ids.next()}`;
      await deps.storage.put(
        key,
        bytes,
        kind === "TEXT"
          ? "text/plain; charset=utf-8"
          : "application/octet-stream",
      );
      const fileHash = await sha256Hex(bytes);
      const version = await deps.syllabuses.createCatalogueUpload({
        title: input.title,
        examId: input.examId,
        fileHash,
        sourceFileKey: key,
        sourceKind: kind,
        sourceName: input.file?.name ?? null,
        sizeBytes: bytes.byteLength,
      });

      // Read before, by anyone and any model: this file, or the same syllabus (rule 4).
      const { reuses } = parserFor(reader, kind);
      const existing = await deps.syllabuses.findParse(fileHash, reuses);
      if (existing) await deps.syllabuses.attachParse(version.id, existing);
      const reused =
        !!existing ||
        (await reuseSimilarNow(deps.syllabuses, {
          versionId: version.id,
          fileHash,
          kind,
          bytes,
          reuses,
        }));
      if (reused) {
        await deps.parseJobs.create({
          syllabusVersionId: version.id,
          userId: by.id,
          status: "READY",
          stage: "READY",
          progress: 100,
          reused: true,
          finishedAt: deps.clock.now(),
        });
      } else await startJob(by, version.id);

      await deps.audit.append({
        actorId: by.id,
        action: "admin.catalogue.read",
        targetId: version.id,
        metadata: { exam: input.examId, kind, reused },
        ip: by.ip ?? null,
      });
      return { ok: true, id: version.id, reused };
    },

    /** A fresh job after a failed reading, while AI is still on. */
    async retry(by: Admin, versionId: string): Promise<Result<object>> {
      const version = await deps.syllabuses.findCatalogueSource(versionId);
      const last = version
        ? await deps.parseJobs.latestForVersion(version.id)
        : null;
      if (!version || !last || last.status !== "FAILED" || version.parseId)
        return failure(
          "NOT_FAILED",
          "This syllabus isn't waiting for a retry.",
        );
      if (!(await deps.reader()).ai) return AI_OFF;
      await startJob(by, version.id);
      return { ok: true };
    },
  };
}

export type CatalogueReadService = ReturnType<
  typeof createCatalogueReadService
>;
