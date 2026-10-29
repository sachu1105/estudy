import "server-only";

import { prisma } from "@/server/db";
import { Prisma, type ReactionKind } from "@/server/db/generated/prisma/client";

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
  kind: true,
  acceptedAnswerId: true,
  author: person,
  replyTo: {
    select: {
      id: true,
      body: true,
      deletedAt: true,
      hiddenAt: true,
      // A reply to a doubt is an answer: who asked, and which answer they chose.
      kind: true,
      authorId: true,
      acceptedAnswerId: true,
      author: { select: { displayName: true } },
    },
  },
  groupTest: {
    select: {
      id: true,
      title: true,
      questionIds: true,
      durationSec: true,
      hiddenAt: true,
    },
  },
  pollOptions: {
    select: { id: true, text: true, votes: { select: { userId: true } } },
    orderBy: { order: "asc" },
  },
  // Answers to a doubt are its replies.
  _count: { select: { answers: { where: { deletedAt: null } } } },
  item: {
    select: {
      id: true,
      type: true,
      title: true,
      url: true,
      // Photos show in the chat itself, so their files come along.
      files: {
        select: { id: true, mimeType: true },
        orderBy: { order: "asc" },
      },
    },
  },
  reactions: { select: { userId: true, kind: true } },
} as const;

/** Chat messages, their reactions, and how far each person has read (squads S3). */
/**
 * A paid channel counts for unread only once the person can open it: they run the
 * squad, or hold a live pass to it (alias c is the channel, ms the membership).
 */
const canOpenPaid = (userId: string) => Prisma.sql`
  (c."pricePaise" IS NULL OR ms."role" <> 'MEMBER' OR EXISTS (
    SELECT 1 FROM "SquadPass" p
    WHERE p."channelId" = c."id" AND p."userId" = ${userId}::uuid
      AND (p."accessUntil" IS NULL OR p."accessUntil" > NOW())))`;

export const messageRepository = {
  create(data: {
    groupId: string;
    channelId: string;
    authorId: string;
    body: string;
    replyToId: string | null;
    mentionIds: string[];
    itemId: string | null;
    kind?: "TEXT" | "DOUBT" | "POLL";
    groupTestId?: string | null;
    /** A poll's choices, in order. */
    pollOptions?: string[];
    at: Date;
  }) {
    const { at, pollOptions, ...rest } = data;
    return prisma.message.create({
      data: {
        ...rest,
        createdAt: at,
        ...(pollOptions?.length
          ? {
              pollOptions: {
                create: pollOptions.map((text, order) => ({ text, order })),
              },
            }
          : {}),
      },
      select: messageRow,
    });
  },

  /** A member's vote on a poll: a new choice replaces the old; null takes it back. */
  async vote(messageId: string, userId: string, optionId: string | null) {
    if (!optionId) {
      await prisma.pollVote.deleteMany({ where: { messageId, userId } });
      return;
    }
    await prisma.pollVote.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, optionId },
      update: { optionId },
    });
  },

  /** The asker's choice of best answer to a doubt, or none. */
  accept(doubtId: string, answerId: string | null) {
    return prisma.message.update({
      where: { id: doubtId },
      data: { acceptedAnswerId: answerId },
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

  /**
   * Messages in a channel holding these words, newest first: in the text, or in the name
   * of what was shared with it. Removed messages never match.
   */
  search(
    channelId: string,
    words: string[],
    options: { limit: number; withHidden: boolean; notBy: string[] },
  ) {
    return prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        ...(options.withHidden ? {} : { hiddenAt: null }),
        ...(options.notBy.length ? { authorId: { notIn: options.notBy } } : {}),
        AND: words.map((word) => ({
          OR: [
            { body: { contains: word, mode: "insensitive" as const } },
            {
              item: {
                title: { contains: word, mode: "insensitive" as const },
              },
            },
          ],
        })),
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
        AND ${canOpenPaid(userId)}
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
        AND m."createdAt" > COALESCE(r."lastReadAt", ms."joinedAt")
        AND ${canOpenPaid(userId)}`;
    return new Set(rows.map((r) => r.groupId));
  },
};

export type MessageRepository = typeof messageRepository;
export type MessageRow = Awaited<ReturnType<MessageRepository["page"]>>[number];
