import "server-only";

import type { Pair } from "@/lib/friends/pair";
import { prisma } from "@/server/db";

const person = {
  select: { id: true, displayName: true, avatarUrl: true, handle: true },
};

const friendshipRow = {
  id: true,
  userAId: true,
  userBId: true,
  requesterId: true,
  status: true,
  note: true,
  createdAt: true,
  acceptedAt: true,
  userA: person,
  userB: person,
} as const;

/** Friends, friend requests and blocks between two people. */
export const friendRepository = {
  find(pair: Pair) {
    return prisma.friendship.findUnique({
      where: { userAId_userBId: pair },
      select: friendshipRow,
    });
  },

  byId(id: string) {
    return prisma.friendship.findUnique({
      where: { id },
      select: friendshipRow,
    });
  },

  create(
    data: Pair & { requesterId: string; note: string | null; createdAt: Date },
  ) {
    return prisma.friendship.create({ data, select: friendshipRow });
  },

  accept(id: string, at: Date) {
    return prisma.friendship.update({
      where: { id },
      data: { status: "ACCEPTED", acceptedAt: at },
    });
  },

  remove(id: string) {
    return prisma.friendship.deleteMany({ where: { id } });
  },

  /** Every friendship and request the person is part of, newest first. */
  listFor(userId: string) {
    return prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: friendshipRow,
    });
  },

  /** Requests waiting on this person's answer. */
  incomingCount(userId: string) {
    return prisma.friendship.count({
      where: {
        status: "PENDING",
        requesterId: { not: userId },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
  },

  /** An active account by its username. */
  byHandle(handle: string) {
    return prisma.user.findFirst({
      where: { handle, status: "ACTIVE" },
      select: { id: true, displayName: true, handle: true, findable: true },
    });
  },

  /**
   * People who chose to be found, by name or username, not counting `meId` or anyone
   * blocked either way. A username that starts with the text ranks before a name match.
   */
  async search(meId: string, text: string, take: number) {
    const rows = await prisma.user.findMany({
      where: {
        id: { not: meId },
        status: "ACTIVE",
        findable: true,
        handle: { not: null },
        OR: [
          { handle: { startsWith: text.toLowerCase() } },
          { displayName: { contains: text, mode: "insensitive" } },
        ],
        blocks: { none: { blockedId: meId } },
        blockedBy: { none: { blockerId: meId } },
      },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      take: take * 2,
      select: { id: true, displayName: true, avatarUrl: true, handle: true },
    });
    const lower = text.toLowerCase();
    return rows
      .sort(
        (a, b) =>
          Number(!a.handle!.startsWith(lower)) -
          Number(!b.handle!.startsWith(lower)),
      )
      .slice(0, take);
  },

  async findable(id: string) {
    const row = await prisma.user.findUnique({
      where: { id },
      select: { findable: true },
    });
    return row?.findable ?? false;
  },

  person(id: string) {
    return prisma.user.findFirst({
      where: { id, status: "ACTIVE" },
      select: { id: true, displayName: true, avatarUrl: true, handle: true },
    });
  },

  // ---- Blocks ------------------------------------------------------------------------

  /** Whether either of the two has blocked the other. */
  async blockedEither(a: string, b: string) {
    const row = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
      select: { id: true },
    });
    return !!row;
  },

  block(blockerId: string, blockedId: string) {
    return prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  },

  unblock(blockerId: string, blockedId: string) {
    return prisma.block.deleteMany({ where: { blockerId, blockedId } });
  },

  blocked(blockerId: string) {
    return prisma.block.findMany({
      where: { blockerId },
      orderBy: { createdAt: "desc" },
      select: { blocked: person },
    });
  },

  /** Of these people, who has a focus timer beating since `since`. Presence only. */
  studying(userIds: string[], since: Date) {
    if (userIds.length === 0) return Promise.resolve([]);
    return prisma.activeSession.findMany({
      where: { userId: { in: userIds }, lastBeatAt: { gte: since } },
      select: {
        userId: true,
        activeSeconds: true,
        paused: true,
        lastBeatAt: true,
      },
    });
  },
};

export type FriendRepository = typeof friendRepository;
export type FriendshipRow = NonNullable<
  Awaited<ReturnType<FriendRepository["find"]>>
>;
