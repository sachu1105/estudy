import "server-only";

import { prisma } from "@/server/db";
import type { PassProvider } from "@/server/db/generated/prisma/client";

/** Payments for paid squads and channels. Append-only (rule 6): rows are only added. */
export const passRepository = {
  /** The newest pass this person holds to a squad (channelId null) or one channel. */
  latest(userId: string, groupId: string, channelId: string | null) {
    return prisma.squadPass.findFirst({
      where: { userId, groupId, channelId },
      orderBy: { createdAt: "desc" },
      select: { accessUntil: true, createdAt: true },
    });
  },

  create(data: {
    userId: string;
    groupId: string;
    channelId: string | null;
    amountPaise: number;
    provider: PassProvider;
    providerRef: string;
    accessUntil: Date | null;
  }) {
    return prisma.squadPass.create({ data, select: { id: true } });
  },

  /**
   * Every live pass in a squad (squad and channel passes), for those who run it to see
   * who paid for what.
   */
  live(groupId: string, now: Date) {
    return prisma.squadPass.findMany({
      where: {
        groupId,
        OR: [{ accessUntil: null }, { accessUntil: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        userId: true,
        channelId: true,
        accessUntil: true,
        channel: { select: { name: true, deletedAt: true } },
      },
    });
  },

  /**
   * What a locked channel holds, as numbers only: nothing inside it is shown to someone
   * without a pass. Also who runs it, and how many hold a pass right now.
   */
  async channelFacts(groupId: string, channelId: string, now: Date) {
    const [messages, lastMessage, holders, group] = await Promise.all([
      prisma.message.count({ where: { channelId, deletedAt: null } }),
      prisma.message.findFirst({
        where: { channelId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.squadPass.findMany({
        where: {
          channelId,
          OR: [{ accessUntil: null }, { accessUntil: { gt: now } }],
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.group.findUnique({
        where: { id: groupId },
        select: {
          name: true,
          cover: true,
          visibility: true,
          ownerId: true,
          owner: { select: { displayName: true, avatarUrl: true } },
        },
      }),
    ]);
    return {
      messages,
      lastAt: lastMessage?.createdAt ?? null,
      holders: holders.length,
      group,
    };
  },

  /** What a squad has taken in, and its latest sales, for its owner. */
  async sales(groupId: string, take: number) {
    const [totals, recent] = await Promise.all([
      prisma.squadPass.aggregate({
        where: { groupId },
        _sum: { amountPaise: true },
        _count: true,
      }),
      prisma.squadPass.findMany({
        where: { groupId },
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          amountPaise: true,
          provider: true,
          accessUntil: true,
          createdAt: true,
          user: { select: { id: true, displayName: true, avatarUrl: true } },
          channel: { select: { name: true } },
        },
      }),
    ]);
    return {
      totalPaise: totals._sum.amountPaise ?? 0,
      count: totals._count,
      recent,
    };
  },
};

export type PassRepository = typeof passRepository;
