import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { limit } from "@/server/entitlements";
import { paperRepository } from "@/server/repositories/paper-repository";
import { podFileRepository } from "@/server/repositories/pod-file-repository";
import { storage } from "@/server/storage";

import { createOmrService } from "./omr-service";

export { PAPER_MAX_BYTES } from "./omr-service";

export const omrService = createOmrService({
  papers: paperRepository,
  podBytesUsed: (ownerId) => podFileRepository.bytesUsed(ownerId),
  storage,
  ids: randomIds,
  clock: systemClock,
  limit,
  pageCount: async (bytes) => {
    const { getDocumentProxy } = await import("unpdf");
    return (await getDocumentProxy(new Uint8Array(bytes))).numPages;
  },
});
