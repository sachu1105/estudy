import "server-only";

import { prisma } from "@/server/db";

import { fromDbDate, toDbDate } from "./plan-repository";

/** Postgres side of the ranks: the source of truth the Redis boards are rebuilt from. */
export const rankRepository = {
  /** Catalogue exams each user is planning for (their active plans' exams). */
  async examsOf(userIds: string[]) {
    const rows = await prisma.studyPlan.findMany({
      where: {
        userId: { in: userIds },
        status: "ACTIVE",
        syllabusVersion: { examId: { not: null } },
      },
      select: {
        userId: true,
        syllabusVersion: {
          select: { examId: true, exam: { select: { name: true } } },
        },
      },
    });
    const exams = new Map<string, { id: string; name: string }[]>();
    for (const r of rows) {
      const exam = r.syllabusVersion?.exam;
      const id = r.syllabusVersion?.examId;
      if (!exam || !id) continue;
      const list = exams.get(r.userId) ?? [];
      if (!list.some((e) => e.id === id)) list.push({ id, name: exam.name });
      exams.set(r.userId, list);
    }
    return exams;
  },

  /** XP per user, from a day on (or ever). */
  async xpSums(from?: string) {
    const rows = await prisma.xpLedger.groupBy({
      by: ["userId"],
      where: from ? { localDate: { gte: toDbDate(from) } } : {},
      _sum: { amount: true },
    });
    return rows.map((r) => ({ userId: r.userId, xp: r._sum.amount ?? 0 }));
  },

  users(ids: string[]) {
    return prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        hideFromGlobalRank: true,
        district: true,
        streakResetAt: true,
        timezone: true,
      },
    });
  },

  inDistrict(ids: string[], district: string) {
    return prisma.user
      .findMany({ where: { id: { in: ids }, district }, select: { id: true } })
      .then((rows) => new Set(rows.map((r) => r.id)));
  },

  /** Active days for many users at once (finished task, or 10+ study minutes). */
  async activeDaysMany(userIds: string[], from: string, minMinutes: number) {
    if (userIds.length === 0) return new Map<string, string[]>();
    const rows = await prisma.$queryRaw<{ userId: string; day: Date }[]>`
      SELECT "userId", day FROM (
        SELECT "userId", "localDate" AS day FROM (
          SELECT DISTINCT ON ("taskId") "userId", "localDate", done
          FROM "TaskCompletion"
          WHERE "userId" = ANY(${userIds}::uuid[]) AND "localDate" >= ${toDbDate(from)}
          ORDER BY "taskId", "createdAt" DESC, id DESC
        ) latest WHERE done
        UNION
        SELECT "userId", "localDate" FROM "StudySession"
        WHERE "userId" = ANY(${userIds}::uuid[]) AND "localDate" >= ${toDbDate(from)}
        GROUP BY "userId", "localDate" HAVING SUM("activeMinutes") >= ${minMinutes}
      ) days`;
    const byUser = new Map<string, string[]>();
    for (const r of rows)
      byUser.set(r.userId, [
        ...(byUser.get(r.userId) ?? []),
        fromDbDate(r.day),
      ]);
    return byUser;
  },

  /**
   * Accounts gaining XP faster than a person could (milestone 12): a day over `maxXp`, more
   * than `maxTests` tests in a day, or over `maxMinutes` of study in a day.
   */
  flagged(
    from: string,
    limits: { maxXp: number; maxTests: number; maxMinutes: number },
  ) {
    return prisma.$queryRaw<
      {
        userId: string;
        email: string;
        day: Date;
        reason: string;
        amount: number;
      }[]
    >`
      SELECT f."userId", u.email, f.day, f.reason, f.amount FROM (
        SELECT "userId", "localDate" AS day, 'xp' AS reason, SUM(amount)::int AS amount
        FROM "XpLedger" WHERE "localDate" >= ${toDbDate(from)}
        GROUP BY "userId", "localDate" HAVING SUM(amount) > ${limits.maxXp}
        UNION ALL
        SELECT "userId", "localDate", 'tests', COUNT(*)::int
        FROM "TestAttempt" WHERE "localDate" >= ${toDbDate(from)}
        GROUP BY "userId", "localDate" HAVING COUNT(*) > ${limits.maxTests}
        UNION ALL
        SELECT "userId", "localDate", 'minutes', SUM("activeMinutes")::int
        FROM "StudySession" WHERE "localDate" >= ${toDbDate(from)}
        GROUP BY "userId", "localDate" HAVING SUM("activeMinutes") > ${limits.maxMinutes}
      ) f JOIN "User" u ON u.id = f."userId"
      ORDER BY f.day DESC, f.amount DESC
      LIMIT 100`;
  },
};

export type RankRepository = typeof rankRepository;
