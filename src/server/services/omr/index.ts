import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { limit } from "@/server/entitlements";
import { examRepository } from "@/server/repositories/exam-repository";
import { paperRepository } from "@/server/repositories/paper-repository";
import { podFileRepository } from "@/server/repositories/pod-file-repository";
import { channelService, groupService } from "@/server/services/groups";
import { storage } from "@/server/storage";

import { createExamService } from "./exam-service";
import { createOmrService } from "./omr-service";

export { PAPER_MAX_BYTES } from "./omr-service";

export const examService = createExamService({
  exams: examRepository,
  papers: paperRepository,
  // Squad rules decide who sees an exam: membership, and whether the channel opens for them.
  channel: async (user, groupId, channelId) => {
    const found = await channelService.get(user, groupId, channelId);
    if (!found) return null;
    const member = await groupService.require(user, groupId, "MEMBER");
    const muted =
      !("error" in member) &&
      !!member.me.mutedUntil &&
      member.me.mutedUntil > systemClock.now();
    return { canPost: found.canPost, muted };
  },
  clock: systemClock,
});

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
  access: (user, paperId) => examService.paperAccess(user, paperId),
});
