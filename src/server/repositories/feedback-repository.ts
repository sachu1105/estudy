import "server-only";

import type {
  IdeaStatus,
  ProblemCategory,
  ProblemStatus,
  RatingInput,
} from "@/lib/feedback/schemas";
import { PUBLIC_IDEA } from "@/lib/feedback/schemas";
import { prisma } from "@/server/db";
import type { IdeaArea } from "@/server/db/generated/prisma/client";

const person = { id: true, displayName: true, avatarUrl: true } as const;

const ideaSelect = (viewerId: string) =>
  ({
    id: true,
    title: true,
    body: true,
    area: true,
    status: true,
    fromTeam: true,
    credit: true,
    teamNote: true,
    votes: true,
    createdAt: true,
    authorId: true,
    author: { select: person },
    voters: { where: { userId: viewerId }, select: { userId: true } },
  }) as const;

/** Ratings, ideas, votes and problem reports. The only code that touches their tables. */
export const feedbackRepository = {
  ratingOf(userId: string) {
    return prisma.appRating.findUnique({
      where: { userId },
      select: { stars: true, note: true, updatedAt: true },
    });
  },

  rate(userId: string, input: RatingInput, at: Date) {
    const note = input.note || null;
    return prisma.appRating.upsert({
      where: { userId },
      create: {
        userId,
        stars: input.stars,
        note,
        createdAt: at,
        updatedAt: at,
      },
      update: { stars: input.stars, note, updatedAt: at },
    });
  },

  /** What one person may see: every public idea, and their own whatever the status. */
  ideasFor(viewerId: string) {
    return prisma.idea.findMany({
      where: {
        OR: [{ status: { in: [...PUBLIC_IDEA] } }, { authorId: viewerId }],
      },
      orderBy: [{ votes: "desc" }, { createdAt: "desc" }],
      take: 300,
      select: ideaSelect(viewerId),
    });
  },

  countInReview(authorId: string) {
    return prisma.idea.count({ where: { authorId, status: "REVIEW" } });
  },

  createIdea(data: {
    authorId: string;
    title: string;
    body: string;
    area: IdeaArea;
    credit: boolean;
    status: IdeaStatus;
    fromTeam: boolean;
    at: Date;
  }) {
    const { at, ...rest } = data;
    return prisma.idea.create({
      data: { ...rest, createdAt: at, updatedAt: at },
      select: { id: true },
    });
  },

  ideaById(id: string) {
    return prisma.idea.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        teamNote: true,
        authorId: true,
        fromTeam: true,
        votes: true,
      },
    });
  },

  /** Adds or takes back one person's vote, keeping the idea's count in step. */
  async setVote(ideaId: string, userId: string, on: boolean, at: Date) {
    return prisma.$transaction(async (tx) => {
      if (on) {
        const made = await tx.ideaVote.createMany({
          data: [{ ideaId, userId, createdAt: at }],
          skipDuplicates: true,
        });
        if (made.count)
          await tx.idea.update({
            where: { id: ideaId },
            data: { votes: { increment: made.count } },
          });
      } else {
        const gone = await tx.ideaVote.deleteMany({
          where: { ideaId, userId },
        });
        if (gone.count)
          await tx.idea.update({
            where: { id: ideaId },
            data: { votes: { decrement: gone.count } },
          });
      }
      const idea = await tx.idea.findUniqueOrThrow({
        where: { id: ideaId },
        select: { votes: true },
      });
      return idea.votes;
    });
  },

  voterIds(ideaId: string) {
    return prisma.ideaVote
      .findMany({ where: { ideaId }, select: { userId: true } })
      .then((rows) => rows.map((r) => r.userId));
  },

  decideIdea(id: string, status: IdeaStatus, teamNote: string | null) {
    return prisma.idea.update({ where: { id }, data: { status, teamNote } });
  },

  createProblem(data: {
    userId: string;
    category: ProblemCategory;
    body: string;
    page: string | null;
    device: string | null;
    credit: boolean;
    at: Date;
  }) {
    const { at, ...rest } = data;
    return prisma.problemReport.create({
      data: { ...rest, createdAt: at, updatedAt: at },
      select: { id: true },
    });
  },

  problemsOf(userId: string) {
    return prisma.problemReport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        category: true,
        body: true,
        page: true,
        status: true,
        teamNote: true,
        createdAt: true,
      },
    });
  },

  problemById(id: string) {
    return prisma.problemReport.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        body: true,
        status: true,
        teamNote: true,
      },
    });
  },

  decideProblem(id: string, status: ProblemStatus, teamNote: string | null) {
    return prisma.problemReport.update({
      where: { id },
      data: { status, teamNote },
    });
  },

  /** People who said they may be named, with what of theirs shipped or got fixed. */
  async contributions() {
    const [ideas, fixes] = await Promise.all([
      prisma.idea.groupBy({
        by: ["authorId"],
        where: { status: "SHIPPED", fromTeam: false, credit: true },
        _count: { _all: true },
      }),
      prisma.problemReport.groupBy({
        by: ["userId"],
        where: { status: "FIXED", credit: true },
        _count: { _all: true },
      }),
    ]);
    const ids = [
      ...new Set([
        ...ideas.map((i) => i.authorId),
        ...fixes.map((f) => f.userId),
      ]),
    ];
    const people = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids }, status: "ACTIVE" },
          select: person,
        })
      : [];
    return {
      people,
      ideas: new Map(ideas.map((i) => [i.authorId, i._count._all])),
      fixes: new Map(fixes.map((f) => [f.userId, f._count._all])),
    };
  },

  // ---- The admin panel -----------------------------------------------------------

  async ratingSummary() {
    const [groups, recent] = await Promise.all([
      prisma.appRating.groupBy({ by: ["stars"], _count: { _all: true } }),
      prisma.appRating.findMany({
        where: { note: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 30,
        select: {
          stars: true,
          note: true,
          updatedAt: true,
          user: { select: { displayName: true } },
        },
      }),
    ]);
    return { groups, recent };
  },

  allIdeas() {
    return prisma.idea.findMany({
      orderBy: [{ votes: "desc" }, { createdAt: "desc" }],
      take: 300,
      select: {
        id: true,
        title: true,
        body: true,
        area: true,
        status: true,
        fromTeam: true,
        teamNote: true,
        votes: true,
        createdAt: true,
        author: { select: { displayName: true, email: true } },
      },
    });
  },

  allProblems() {
    return prisma.problemReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        category: true,
        body: true,
        page: true,
        device: true,
        status: true,
        teamNote: true,
        createdAt: true,
        user: { select: { displayName: true, email: true } },
      },
    });
  },
};

export type FeedbackRepository = typeof feedbackRepository;
