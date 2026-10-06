import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { can, limit } from "@/server/entitlements";
import { env } from "@/server/env";
import { parseQueue } from "@/server/queue";
import { publisher } from "@/server/realtime";
import { aiUsageRepository } from "@/server/repositories/ai-usage-repository";
import { catalogueRepository } from "@/server/repositories/catalogue-repository";
import { parseJobRepository } from "@/server/repositories/parse-job-repository";
import { sectionCacheRepository } from "@/server/repositories/section-cache-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { storage } from "@/server/storage";

import type { Actor, SyllabusDeps } from "./deps";
import type { SourceKind } from "./extract";
import { parserFor } from "./parser-version";
import { createReviewService } from "./review-service";
import { createUploadService } from "./upload-service";

export type { Actor } from "./deps";
export { ACCEPTED_TYPES, UPLOAD_MAX_BYTES } from "./upload-service";

export const syllabusDeps: SyllabusDeps = {
  syllabuses: syllabusRepository,
  parseJobs: parseJobRepository,
  catalogue: catalogueRepository,
  aiUsage: aiUsageRepository,
  sectionCache: sectionCacheRepository,
  storage,
  queue: parseQueue,
  publisher,
  entitlements: { can, limit },
  clock: systemClock,
  ids: randomIds,
  readsDocuments: env.AI_PROVIDER === "hosted",
};

export const uploadService = createUploadService(syllabusDeps);
/** True when a better parser than the one that read this syllabus is now available. */
export const canReadAgain = (version: {
  sourceKind: SourceKind | null;
  parse: { promptVersion: string } | null;
}) =>
  Boolean(
    version.parse &&
    version.sourceKind &&
    version.parse.promptVersion !==
      parserFor(syllabusDeps.readsDocuments, version.sourceKind).version,
  );

/** Photos of a printed syllabus can be read only when the AI reads pages itself. */
export const photosSupported = syllabusDeps.readsDocuments;
export const reviewService = createReviewService(syllabusDeps);

export const catalogueService = {
  listExams: () => catalogueRepository.listExams(),
  /** Approved catalogue syllabuses are readable by every signed-in user (rule 5). */
  findApproved: (id: string) => syllabusRepository.findApprovedCatalogue(id),
};

export const uploadUsage = async (user: Actor) => ({
  used: await syllabusRepository.countUploads(user.id),
  limit: limit(user, "syllabusUploads"),
});

export const jobService = {
  /** Only the job's own user may read it (rule 9). */
  findForUser: (id: string, userId: string) =>
    parseJobRepository.findForUser(id, userId),
  /** Whether a worker is running to read queued syllabuses. */
  readerOnline: () => parseQueue.readerOnline().catch(() => false),
};
