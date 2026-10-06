import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { limit } from "@/server/entitlements";
import { fetchLinkMeta } from "@/server/links/fetch-meta";
import { podQueue } from "@/server/queue";
import { podFileRepository } from "@/server/repositories/pod-file-repository";
import { podItemRepository } from "@/server/repositories/pod-item-repository";
import { podRepository } from "@/server/repositories/pod-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";
import { storage } from "@/server/storage";

import { createFileService } from "./file-service";
import { createItemService, type ItemDeps } from "./item-service";

export { TRASH_DAYS } from "./item-service";
import { createPodService, type PodDeps } from "./pod-service";
import { readPdf } from "./read-pdf";

export const podDeps: PodDeps = {
  pods: podRepository,
  syllabuses: syllabusRepository,
  completions: topicCompletionRepository,
  clock: systemClock,
};

export const podService = createPodService(podDeps);

export const itemDeps: ItemDeps = {
  items: podItemRepository,
  pods: podRepository,
  queue: podQueue,
  storage,
  clock: systemClock,
  fetchLinkMeta: (url) => fetchLinkMeta(url),
};

export const itemService = createItemService(itemDeps);

export const fileService = createFileService({
  files: podFileRepository,
  items: podItemRepository,
  pods: podRepository,
  storage,
  queue: podQueue,
  clock: systemClock,
  ids: randomIds,
  limit,
  readPdf,
});
