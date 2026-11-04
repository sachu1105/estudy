import "server-only";

import type { Pair } from "@/lib/friends/pair";
import { prisma } from "@/server/db";

const dmRow = {
  id: true,
  threadId: true,
  authorId: true,
  body: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true } },
} as const;

/** Direct chats between two people and their messages. */
export const dmRepository = {
  thread(pair: Pair) {
    return prisma.directThread.findUnique({
      where: { userAId_userBId: pair },
    });
  },

  /** The pair's thread, made on first use. */
  ensureThread(pair: Pair, at: Date) {
    return prisma.directThread.upsert({
      where: { userAId_userBId: pair },
      create: { ...pair, createdAt: at, lastMessageAt: at },
      update: {},
    });
  },

  /** Newest first, `take` of them, before a message when paging back. */
  page(threadId: string, take: number, before: { createdAt: Date } | null) {
    return prisma.directMessage.findMany({
      where: {
        threadId,
        ...(before ? { createdAt: { lt: before.createdAt } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: dmRow,
    });
  },

  message(id: string) {
    return prisma.directMessage.findUnique({
      where: { id },
      select: {
        ...dmRow,
        thread: { select: { userAId: true, userBId: true } },
      },
    });
  },

  /** Saves a message and moves the thread up the list, together. */
  async send(threadId: string, authorId: string, body: string, at: Date) {
    const [message] = await prisma.$transaction([
      prisma.directMessage.create({
        data: { threadId, authorId, body, createdAt: at },
        select: dmRow,
      }),
      prisma.directThread.update({
        where: { id: threadId },
        data: { lastMessageAt: at },
      }),
    ]);
    return message;
  },

  edit(id: string, body: string, at: Date) {
    return prisma.directMessage.update({
      where: { id },
      data: { body, editedAt: at },
      select: dmRow,
    });
  },

  softDelete(id: string, at: Date) {
    return prisma.directMessage.update({
      where: { id },
      data: { deletedAt: at, body: "" },
    });
  },

  markRead(threadId: string, side: "A" | "B", at: Date) {
    return prisma.directThread.update({
      where: { id: threadId },
      data: side === "A" ? { readA: at } : { readB: at },
    });
  },

  /** The person's chats, latest first, with the other person, the last line and unread. */
  async threadsOf(userId: string) {
    const threads = await prisma.directThread.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      select: {
        id: true,
        userAId: true,
        userBId: true,
        lastMessageAt: true,
        userA: { select: { id: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, displayName: true, avatarUrl: true } },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, authorId: true },
        },
      },
    });
    const unread = await this.unreadByThread(userId);
    return threads.map((t) => ({ ...t, unread: unread.get(t.id) ?? 0 }));
  },

  /** Messages from the other person after this person last read, per thread. */
  async unreadByThread(userId: string) {
    const rows = await prisma.$queryRaw<{ threadId: string; unread: number }[]>`
      SELECT m."threadId", COUNT(*)::int AS unread
      FROM "DirectMessage" m
      JOIN "DirectThread" t ON t."id" = m."threadId"
      WHERE (t."userAId" = ${userId}::uuid OR t."userBId" = ${userId}::uuid)
        AND m."authorId" <> ${userId}::uuid
        AND m."deletedAt" IS NULL
        AND m."createdAt" > COALESCE(
          CASE WHEN t."userAId" = ${userId}::uuid THEN t."readA" ELSE t."readB" END,
          'epoch'::timestamptz)
      GROUP BY m."threadId"`;
    return new Map(rows.map((r) => [r.threadId, r.unread]));
  },
};

export type DmRepository = typeof dmRepository;
export type DmRow = Awaited<ReturnType<DmRepository["page"]>>[number];
