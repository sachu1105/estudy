import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { can, limit } from "@/server/entitlements";
import { AI_PROVIDERS } from "@/lib/settings/schemas";
import { missingSetup, providerConfig } from "@/server/ai/config";
import { syllabusPrompts } from "@/server/ai/prompts";
import { aiOn, flagOn, getSetting } from "@/server/settings";
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
import { canUpgrade, type Reader } from "./parser-version";
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
  uploadsOpen: () => flagOn("syllabusUploads"),
  clock: systemClock,
  ids: randomIds,
  // AI reads only when switched on for syllabuses and the model is set up; a missing key
  // falls back to the rules rather than failing every upload (Admin > AI says so).
  reader: async (): Promise<Reader> => {
    const [on, config, prompts] = await Promise.all([
      aiOn("syllabus"),
      providerConfig(),
      getSetting("aiPrompts"),
    ]);
    return {
      ai: on && missingSetup(config) === null,
      readsDocuments: AI_PROVIDERS[config.kind].readsDocuments,
      prompts: syllabusPrompts(prompts),
    };
  },
};

export const uploadService = createUploadService(syllabusDeps);
/** True when a better parser than the one that read this syllabus is now available. */
export const canReadAgain = async (version: {
  sourceKind: SourceKind | null;
  parse: { promptVersion: string } | null;
}) => canUpgrade(await syllabusDeps.reader(), version);

/** Photos of a printed syllabus can be read only when the AI is on and reads pages itself. */
export const photosSupported = async () => {
  const reader = await syllabusDeps.reader();
  return reader.ai && reader.readsDocuments;
};
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
