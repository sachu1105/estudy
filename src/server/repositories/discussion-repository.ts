import "server-only";

import { prisma } from "@/server/db";
import type {
  PostKind,
  ReactionKind,
} from "@/server/db/generated/prisma/client";
import { toDbDate } from "./plan-repository";

const person = { select: { id: true, displayName: true, avatarUrl: true } };

/** Group discussion: posts, replies and reactions (milestone 14). */
export const discussionRepository = {
  list(
    groupId: string,
    options: {
      kind: PostKind | null;
      unanswered: boolean;
      withHidden: boolean;
      notBy: string[];
    },
  ) {
    return prisma.post.findMany({
      where: {
        groupId,
        deletedAt: null,
        ...(options.withHidden ? {} : { hiddenAt: null }),
        ...(options.kind ? { kind: options.kind } : {}),
        ...(options.unanswered
          ? { kind: "QUESTION", acceptedReplyId: null }
          : {}),
        ...(options.notBy.length ? { authorId: { notIn: options.notBy } } : {}),
      },
      orderBy: [
        { pinnedAt: { sort: "desc", nulls: "last" } },
        { lastActivityAt: "desc" },
      ],
      take: 60,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        topicName: true,
        acceptedReplyId: true,
        pinnedAt: true,
        hiddenAt: true,
        replyCount: true,
        lastActivityAt: true,
        author: person,
      },
    });
  },

  findPost(groupId: string, postId: string) {
    return prisma.post.findFirst({
      where: { id: postId, groupId, deletedAt: null },
      include: { author: person },
    });
  },

  replies(postId: string) {
    return prisma.reply.findMany({
      where: { postId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 500,
      include: { author: person },
    });
  },

  findReply(postId: string, replyId: string) {
    return prisma.reply.findFirst({
      where: { id: replyId, postId, deletedAt: null },
    });
  },

  createPost(data: {
    groupId: string;
    authorId: string;
    kind: PostKind;
    title: string;
    body: string;
    mentionIds: string[];
    subjectName: string | null;
    topicName: string | null;
    at: Date;
  }) {
    const { at, ...rest } = data;
    return prisma.post.create({
      data: { ...rest, createdAt: at, lastActivityAt: at },
    });
  },

  /** The reply, and the post's count and activity time, together. */
  async createReply(data: {
    postId: string;
    authorId: string;
    body: string;
    mentionIds: string[];
    at: Date;
  }) {
    const [reply] = await prisma.$transaction([
      prisma.reply.create({
        data: {
          postId: data.postId,
          authorId: data.authorId,
          body: data.body,
          mentionIds: data.mentionIds,
          createdAt: data.at,
        },
      }),
      prisma.post.update({
        where: { id: data.postId },
        data: { replyCount: { increment: 1 }, lastActivityAt: data.at },
      }),
    ]);
    return reply;
  },

  setPost(
    postId: string,
    data: {
      pinnedAt?: Date | null;
      hiddenAt?: Date | null;
      deletedAt?: Date;
      acceptedReplyId?: string | null;
    },
  ) {
    return prisma.post.update({ where: { id: postId }, data });
  },

  async setReply(
    postId: string,
    replyId: string,
    data: { hiddenAt?: Date | null; deletedAt?: Date },
  ) {
    await prisma.$transaction([
      prisma.reply.update({ where: { id: replyId }, data }),
      ...(data.deletedAt
        ? [
            prisma.post.update({
              where: { id: postId },
              data: { replyCount: { decrement: 1 } },
            }),
            // A deleted answer can't stay accepted.
            prisma.post.updateMany({
              where: { id: postId, acceptedReplyId: replyId },
              data: { acceptedReplyId: null },
            }),
          ]
        : []),
    ]);
  },

  reactions(postId: string) {
    return prisma.reaction.findMany({
      where: { postId },
      select: { userId: true, targetId: true, kind: true },
    });
  },

  async react(data: {
    userId: string;
    postId: string;
    replyId: string | null;
    kind: ReactionKind;
    on: boolean;
  }) {
    const targetId = data.replyId ?? data.postId;
    if (!data.on) {
      await prisma.reaction.deleteMany({
        where: { userId: data.userId, targetId, kind: data.kind },
      });
      return;
    }
    await prisma.reaction.upsert({
      where: {
        userId_targetId_kind: {
          userId: data.userId,
          targetId,
          kind: data.kind,
        },
      },
      create: {
        userId: data.userId,
        postId: data.postId,
        replyId: data.replyId,
        targetId,
        kind: data.kind,
      },
      update: {},
    });
  },

  /** Members' names, for @mentions. */
  memberNames(groupId: string) {
    return prisma.membership.findMany({
      where: { groupId },
      select: { user: { select: { id: true, displayName: true } } },
      orderBy: { joinedAt: "asc" },
    });
  },

  people(ids: string[]) {
    return ids.length
      ? prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, displayName: true },
        })
      : Promise.resolve([]);
  },

  // ---- XP for accepted answers ------------------------------------------------------

  async answerXpOn(userId: string, localDate: string) {
    const sum = await prisma.xpLedger.aggregate({
      where: { userId, kind: "ANSWER", localDate: toDbDate(localDate) },
      _sum: { amount: true },
    });
    return sum._sum.amount ?? 0;
  },

  /** Each question pays out once, however often the accepted answer changes. */
  async answerPaid(postId: string) {
    return !!(await prisma.xpLedger.findFirst({
      where: { kind: "ANSWER", refId: postId },
      select: { id: true },
    }));
  },
};

export type DiscussionRepository = typeof discussionRepository;
