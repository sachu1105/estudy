import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { limit, planIncludes } from "@/server/entitlements";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { bundleRepository } from "@/server/repositories/bundle-repository";
import { examRepository } from "@/server/repositories/exam-repository";
import { paperRepository } from "@/server/repositories/paper-repository";
import { podFileRepository } from "@/server/repositories/pod-file-repository";
import {
  channelService,
  checkout,
  groupService,
  squadPay,
} from "@/server/services/groups";
import type { Actor } from "@/server/services/syllabus/deps";
import { storage } from "@/server/storage";

import { createBundleService } from "./bundle-service";
import { createExamService } from "./exam-service";
import { createOmrService } from "./omr-service";

export { PAPER_MAX_BYTES } from "./omr-service";

/**
 * Squad rules decide who sees an exam or a bundle: membership, and whether the channel
 * opens for them; with their role, whether they may post, and whether they're muted.
 */
async function channelFor(user: Actor, groupId: string, channelId: string) {
  const found = await channelService.get(user, groupId, channelId);
  if (!found) return null;
  const member = await groupService.require(user, groupId, "MEMBER");
  const muted =
    !("error" in member) &&
    !!member.me.mutedUntil &&
    member.me.mutedUntil > systemClock.now();
  return { canPost: found.canPost, muted, role: found.role as string };
}

export const examService = createExamService({
  exams: examRepository,
  papers: paperRepository,
  channel: channelFor,
  clock: systemClock,
});

export const bundleService = createBundleService({
  bundles: bundleRepository,
  papers: paperRepository,
  channel: channelFor,
  canPrice: (user) => squadPay.canPrice(user),
  selling: (ownerId) => squadPay.selling(ownerId),
  checkout,
  clock: systemClock,
  planIncludes: (user, plans) => planIncludes(user, plans),
  audit: (entry) => auditLogRepository.append(entry),
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
  // A paper someone else owns opens through a squad exam or a bundle they have.
  access: async (user, paperId) => {
    const [exam, bundle] = await Promise.all([
      examService.paperAccess(user, paperId),
      bundleService.paperAccess(user, paperId),
    ]);
    if (!exam && !bundle) return null;
    return {
      canView: !!(exam?.canView || bundle?.canView),
      canPractise: !!(exam?.canPractise || bundle?.canPractise),
      keyOut: !!(exam?.keyOut || bundle?.keyOut),
    };
  },
});
