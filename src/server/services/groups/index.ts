import "server-only";

import { randomInt } from "node:crypto";

import { systemClock } from "@/lib/clock";
import { limit } from "@/server/entitlements";
import { today } from "@/lib/clock";
import { rankStore } from "@/server/rank/rank-store";
import { discussionRepository } from "@/server/repositories/discussion-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import { groupEvents } from "@/server/realtime/group-events";
import { notificationService } from "@/server/services/notifications";
import { groupItemRepository } from "@/server/repositories/group-item-repository";
import { groupTestRepository } from "@/server/repositories/group-test-repository";
import { questionRepository } from "@/server/repositories/question-repository";
import { channelRepository } from "@/server/repositories/channel-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { podItemRepository } from "@/server/repositories/pod-item-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { storage } from "@/server/storage";

import { createChannelService } from "./channel-service";
import { createDiscussionService } from "./discussion-service";
import { createGroupService } from "./group-service";
import { createGroupTests } from "./group-tests";
import { createMaterialService } from "./material-service";

/** No 0/O or 1/I/L: codes get read out and typed by hand. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode = () =>
  Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
    "",
  );

/** A limit on the squad owner's plan: members, channels and storage count against it. */
async function ownerLimit(
  ownerId: string,
  feature: "squadMembers" | "channelsPerSquad" | "groupStorageBytes",
) {
  const owner = await userRepository.findSessionUser(ownerId);
  return owner ? limit(owner, feature) : 0;
}

export const groupService = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  clock: systemClock,
  limit: (user, feature) => limit(user, feature),
  ownerLimit,
  newCode,
});

export const channelService = createChannelService({
  groups: groupService,
  channels: channelRepository,
  clock: systemClock,
  ownerLimit,
});

export const materialService = createMaterialService({
  groups: groupService,
  channels: channelService,
  items: groupItemRepository,
  podItems: podItemRepository,
  storage,
  clock: systemClock,
  newId: () => crypto.randomUUID(),
  ownerStorageLimit: (ownerId) => ownerLimit(ownerId, "groupStorageBytes"),
});

export const groupTests = createGroupTests({
  groups: groupService,
  channels: channelService,
  tests: groupTestRepository,
  questions: questionRepository,
  clock: systemClock,
  random: Math.random,
  // The squad rank reads the members' scores off this week's XP board.
  weeklyXp: (ids) => rankStore.scores(today(systemClock, "Asia/Kolkata"), ids),
  announce: (groupId, actorId, test) =>
    notificationService.notifyGroup(groupId, {
      actorId,
      kind: "GROUP_TEST",
      href: `/groups/${groupId}/tests/${test.id}`,
      subject: test.title,
    }),
});

export const discussionService = createDiscussionService({
  groups: groupService,
  channels: channelService,
  posts: discussionRepository,
  clock: systemClock,
  emit: groupEvents.emit,
  notify: (rows) => notificationService.notify(rows),
  addXp: (entry) => progressRepository.addXp(entry),
});
