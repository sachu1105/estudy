import { normaliseText } from "@/server/ai/chunk";
import { jobChannel, type JobEvent } from "@/server/realtime/types";

import {
  failure,
  sha256Hex,
  type Actor,
  type Result,
  type SyllabusDeps,
} from "./deps";
import { MAX_TEXT_CHARS, sniffKind, type SourceKind } from "./extract";
import { parserFor } from "./parser-version";

export const UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

/** Declared types we sign uploads for. The bytes are checked again after upload. */
export const ACCEPTED_TYPES: Record<string, SourceKind> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
  "image/webp": "IMAGE",
};

const UNSUPPORTED =
  "Upload a PDF, a Word file (.docx) or a photo (JPG, PNG or WebP), or paste the text.";
const TOO_LARGE =
  "This file is over 15 MB. Upload only the syllabus pages, or paste the text.";

type Created = { versionId: string; jobId: string; reused: boolean };
type Meta = { title: string; examId: string | null; sourceName: string | null };

export function createUploadService(deps: SyllabusDeps) {
  const keyPattern = (userId: string) =>
    new RegExp(`^syllabus/${userId}/[0-9a-f-]{36}$`);

  async function underLimit(user: Actor) {
    if (deps.uploadsOpen && !(await deps.uploadsOpen()))
      return failure(
        "PAUSED",
        "New syllabus uploads are paused for a short while. Pick one from the catalogue, or try again later.",
      );
    const used = await deps.syllabuses.countUploads(user.id);
    const max = deps.entitlements.limit(user, "syllabusUploads");
    return used < max
      ? null
      : failure(
          "LIMIT",
          `Your plan includes ${max} syllabus upload${max === 1 ? "" : "s"}, and you've used ${max === 1 ? "it" : "them all"}. Delete one to upload another.`,
        );
  }

  /** Parse once per file (rule 4): an identical file reuses the existing parse instantly. */
  async function create(
    user: Actor,
    meta: Meta,
    file: { key: string; kind: SourceKind; bytes: Uint8Array },
  ): Promise<Result<Created>> {
    const limited = await underLimit(user);
    if (limited) return limited;
    const examId =
      meta.examId && (await deps.catalogue.examExists(meta.examId))
        ? meta.examId
        : null;
    const fileHash = await sha256Hex(file.bytes);
    const version = await deps.syllabuses.createUpload({
      ownerId: user.id,
      title: meta.title,
      examId,
      fileHash,
      sourceFileKey: file.key,
      sourceKind: file.kind,
      sourceName: meta.sourceName,
      sizeBytes: file.bytes.byteLength,
    });

    const existing = await deps.syllabuses.findParse(
      fileHash,
      parserFor(deps.readsDocuments, file.kind).version,
    );
    if (existing) {
      await deps.syllabuses.attachParse(version.id, existing);
      const job = await deps.parseJobs.create({
        syllabusVersionId: version.id,
        userId: user.id,
        status: "READY",
        stage: "READY",
        progress: 100,
        reused: true,
        finishedAt: deps.clock.now(),
      });
      return { ok: true, versionId: version.id, jobId: job.id, reused: true };
    }

    const job = await deps.parseJobs.create({
      syllabusVersionId: version.id,
      userId: user.id,
    });
    await deps.queue.enqueue(
      { parseJobId: job.id },
      {
        priority: deps.entitlements.can(user, "priorityParsing")
          ? "high"
          : "normal",
      },
    );
    const event: JobEvent = {
      id: job.id,
      status: "QUEUED",
      stage: "QUEUED",
      progress: 0,
      error: null,
      reused: false,
    };
    await deps.publisher.publish(jobChannel(job.id), event);
    return { ok: true, versionId: version.id, jobId: job.id, reused: false };
  }

  return {
    /** Step 1: a presigned PUT for the browser. Nothing is saved yet. */
    async requestUpload(
      user: Actor,
      input: { contentType: string; size: number },
    ): Promise<
      Result<{ key: string; url: string; headers: Record<string, string> }>
    > {
      if (!ACCEPTED_TYPES[input.contentType])
        return failure("UNSUPPORTED", UNSUPPORTED);
      if (input.size > UPLOAD_MAX_BYTES) return failure("TOO_LARGE", TOO_LARGE);
      const limited = await underLimit(user);
      if (limited) return limited;
      const key = `syllabus/${user.id}/${deps.ids.next()}`;
      const signed = await deps.storage.signUpload({
        key,
        contentType: input.contentType,
        contentLength: input.size,
        expiresInSeconds: 600,
      });
      return { ok: true, key, ...signed };
    },

    /** Step 2: check what actually arrived, hash it on the server, then parse or reuse. */
    async completeUpload(
      user: Actor,
      input: Meta & { key: string },
    ): Promise<Result<Created>> {
      if (!keyPattern(user.id).test(input.key))
        return failure(
          "NOT_FOUND",
          "That upload doesn't exist. Upload the file again.",
        );
      const head = await deps.storage.head(input.key);
      if (!head)
        return failure("NOT_UPLOADED", "The upload didn't finish. Try again.");
      if (head.size > UPLOAD_MAX_BYTES) {
        await deps.storage.delete(input.key);
        return failure("TOO_LARGE", TOO_LARGE);
      }
      const bytes = await deps.storage.getBytes(input.key);
      const kind = sniffKind(bytes);
      if (!kind) {
        await deps.storage.delete(input.key);
        return failure("UNSUPPORTED", UNSUPPORTED);
      }
      return create(user, input, { key: input.key, kind, bytes });
    },

    /** Pasted text takes the same path as a file, stored as text/plain. */
    async submitText(
      user: Actor,
      input: Omit<Meta, "sourceName"> & { text: string },
    ): Promise<Result<Created>> {
      const text = normaliseText(input.text);
      if (text.length < 40)
        return failure(
          "TOO_SHORT",
          "Paste the whole syllabus: subjects and the topics under them.",
        );
      if (text.length > MAX_TEXT_CHARS)
        return failure(
          "TOO_LONG",
          "That's more text than a syllabus usually has. Paste only the syllabus.",
        );
      const limited = await underLimit(user);
      if (limited) return limited;
      const bytes = new TextEncoder().encode(text);
      const key = `syllabus/${user.id}/${deps.ids.next()}`;
      await deps.storage.put(key, bytes, "text/plain; charset=utf-8");
      return create(
        user,
        { ...input, sourceName: null },
        { key, kind: "TEXT", bytes },
      );
    },
  };
}

export type UploadService = ReturnType<typeof createUploadService>;
