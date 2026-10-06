import "server-only";

import { prisma } from "@/server/db";

/** Tests shared in groups, and how the members did (milestone 13). */
export const groupTestRepository = {
  create(data: {
    groupId: string;
    sharedById: string;
    title: string;
    questionIds: string[];
    durationSec: number | null;
    negativeMarking: boolean;
  }) {
    return prisma.groupTest.create({ data });
  },

  list(groupId: string, hideFrom: Set<string>) {
    return prisma.groupTest.findMany({
      where: { groupId, hiddenAt: null, sharedById: { notIn: [...hideFrom] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { sharedBy: { select: { displayName: true } } },
    });
  },

  find(groupId: string, id: string) {
    return prisma.groupTest.findFirst({
      where: { id, groupId, hiddenAt: null },
    });
  },

  findAny: (id: string) => prisma.groupTest.findUnique({ where: { id } }),

  hide(id: string, at: Date) {
    return prisma.groupTest.update({ where: { id }, data: { hiddenAt: at } });
  },

  /** The member's own copy of a shared test, if they've opened it. */
  myCopy(userId: string, groupTestId: string) {
    return prisma.mockTest.findFirst({
      where: { userId, groupTestId },
      include: {
        attempts: {
          select: {
            id: true,
            correct: true,
            total: true,
            score: true,
            accuracy: true,
          },
        },
      },
    });
  },

  /** Each member's result on a shared test, best first. */
  results(groupTestId: string) {
    return prisma.testAttempt.findMany({
      where: { mockTest: { groupTestId } },
      orderBy: [{ score: "desc" }, { durationSec: "asc" }],
      select: {
        id: true,
        score: true,
        correct: true,
        total: true,
        accuracy: true,
        durationSec: true,
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  },

  /** Right answers in this group's shared tests since a moment, per member. */
  async correctSince(groupId: string, since: Date) {
    const tests = await prisma.groupTest.findMany({
      where: { groupId },
      select: { id: true },
    });
    if (tests.length === 0) return new Map<string, number>();
    const rows = await prisma.testAttempt.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: since },
        mockTest: { groupTestId: { in: tests.map((t) => t.id) } },
      },
      _sum: { correct: true },
    });
    return new Map(rows.map((r) => [r.userId, r._sum.correct ?? 0]));
  },
};

export type GroupTestRepository = typeof groupTestRepository;
