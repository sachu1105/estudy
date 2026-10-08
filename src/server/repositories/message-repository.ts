import "server-only";

import { prisma } from "@/server/db";
import type { ReactionKind } from "@/server/db/generated/prisma/client";

const person = { select: { id: true, displayName: true, avatarUrl: true } };

const messageRow = {
  id: true,
  channelId: true,
  authorId: true,
  body: true,
  mentionIds: true,
  editedAt: true,
  hiddenAt: true,
  deletedAt: true,
  createdAt: true,
  author: person,
  replyTo: {
    select: {
      id: true,
      body: true,
      deletedAt: true,
      hiddenAt: true,
      author: { select: { displayName: true } },
    },
  },
  item: { select: { id: true, type: true, title: true, url: true } },
  reactions: { select: { userId: true, kind: true } },
} as const;

/** Chat messages, their reactions, and how far each person has read (squads S3). */
export const messageRepository = {
  create(data: {
    groupId: string;
    channelId: string;
    authorId: string;
    body: string;
    replyToId: string | null;
    mentionIds: string[];
    itemId: string | null;
    at: Date;
  }) {
    const { at, ...rest } = data;
    return prisma.message.create({
      data: { ...rest, createdAt: at },
      select: messageRow,
    });
  },

  /**
   * A page of a channel, newest first: before a message (scrolling up), after one
   * (catching up), or the latest. Deleted messages stay as a stub so replies make sense.
   */
  page(
    channelId: string,
    options: {
      before?: { id: string; createdAt: Date } | null;
      after?: { id: string; createdAt: Date } | null;
      limit: number;
      withHidden: boolean;
      notBy: string[];
    },
  ) {
    const { before, after } = options;
    return prisma.message.findMany({
      where: {
        channelId,
        ...(options.withHidden ? {} : { hiddenAt: null }),
        ...(options.notBy.length ? { authorId: { notIn: options.notBy } } : {}),
        ...(before
          ? {
              OR: [
                { createdAt: { lt: before.createdAt } },
                { createdAt: before.createdAt, id: { lt: before.id } },
              ],
            }
          : {}),
        ...(after
          ? {
              OR: [
                { createdAt: { gt: after.createdAt } },
                { createdAt: after.createdAt, id: { gt: after.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options.limit,
      select: messageRow,
    });
  },

  /** When this person last wrote here, for slow mode. */
  lastSentAt(channelId: string, authorId: string) {
    return prisma.message
      .findFirst({
        where: { channelId, authorId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
      .then((row) => row?.createdAt ?? null);
  },

  find(channelId: string, messageId: string) {
    return prisma.message.findFirst({
      where: { id: messageId, channelId },
      select: messageRow,
    });
  },

  edit(messageId: string, body: string, mentionIds: string[], at: Date) {
    return prisma.message.update({
      where: { id: messageId },
      data: { body, mentionIds, editedAt: at },
    });
  },

  softDelete(messageId: string, at: Date) {
    return prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: at },
    });
  },

  async react(
    messageId: string,
    userId: string,
    kind: ReactionKind,
    on: boolean,
  ) {
    if (on)
      await prisma.messageReaction.upsert({
        where: { messageId_userId_kind: { messageId, userId, kind } },
        create: { messageId, userId, kind },
        update: {},
      });
    else
      await prisma.messageReaction.deleteMany({
        where: { messageId, userId, kind },
      });
  },

  /** Read up to `at` (never moves back: an old tab can't undo a newer read). */
  async markRead(userId: string, channelId: string, at: Date) {
    await prisma.$executeRaw`
      INSERT INTO "ChannelRead" ("id", "userId", "channelId", "lastReadAt")
      VALUES (gen_random_uuid(), ${userId}::uuid, ${channelId}::uuid, ${at})
      ON CONFLICT ("userId", "channelId")
      DO UPDATE SET "lastReadAt" = GREATEST("ChannelRead"."lastReadAt", EXCLUDED."lastReadAt")`;
  },

  /**
   * Per channel of a squad: messages from others since the person last read it (or
   * joined), and how many of those name them.
   */
  unread(userId: string, groupId: string) {
    return prisma.$queryRaw<
      { channelId: string; unread: number; mentions: number }[]
    >`
      SELECT m."channelId",
             COUNT(*)::int AS unread,
             COUNT(*) FILTER (WHERE ${userId}::uuid = ANY(m."mentionIds"))::int AS mentions
      FROM "Message" m
      JOIN "Membership" ms ON ms."groupId" = m."groupId" AND ms."userId" = ${userId}::uuid
      JOIN "Channel" c ON c."id" = m."channelId" AND c."deletedAt" IS NULL
      LEFT JOIN "ChannelRead" r ON r."channelId" = m."channelId" AND r."userId" = ${userId}::uuid
      WHERE m."groupId" = ${groupId}::uuid
        AND m."deletedAt" IS NULL AND m."hiddenAt" IS NULL
        AND m."authorId" <> ${userId}::uuid
        AND m."createdAt" > COALESCE(r."lastReadAt", ms."joinedAt")
      GROUP BY m."channelId"`;
  },

  /** The squads with anything unread in their chats, for the rail. */
  async squadsWithUnread(userId: string) {
    const rows = await prisma.$queryRaw<{ groupId: string }[]>`
      SELECT DISTINCT m."groupId"
      FROM "Message" m
      JOIN "Membership" ms ON ms."groupId" = m."groupId" AND ms."userId" = ${userId}::uuid
      JOIN "Channel" c ON c."id" = m."channelId" AND c."deletedAt" IS NULL
      LEFT JOIN "ChannelRead" r ON r."channelId" = m."channelId" AND r."userId" = ${userId}::uuid
      WHERE m."deletedAt" IS NULL AND m."hiddenAt" IS NULL
        AND m."authorId" <> ${userId}::uuid
        AND m."createdAt" > COALESCE(r."lastReadAt", ms."joinedAt")`;
    return new Set(rows.map((r) => r.groupId));
  },
};

export type MessageRepository = typeof messageRepository;
export type MessageRow = Awaited<ReturnType<MessageRepository["page"]>>[number];
