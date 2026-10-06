import "server-only";

import { prisma } from "@/server/db";
import type { PlanTaskType, XpKind } from "@/server/db/generated/prisma/client";

import { fromDbDate, toDbDate } from "./plan-repository";
import { recordXp } from "@/server/rank";

export type TaskLogRow = {
  userId: string;
  planId: string;
  taskId: string;
  taskKey: string;
  type: PlanTaskType;
  subjectId: string | null;
  topicId: string | null;
  minutes: number;
  localDate: string;
  done: boolean;
  /** Tests: fraction correct, for the re-plan. */
  accuracy?: number | null;
};

/** The progress logs (rule 6): only ever appended to, read back as derived state. */
export const progressRepository = {
  /** A task of one of the user's plans, with its plan. */
  findTask(taskId: string, userId: string) {
    return prisma.planTask.findFirst({
      where: { id: taskId, plan: { userId } },
      include: {
        plan: { select: { id: true, status: true, syllabusVersionId: true } },
      },
    });
  },

  /** Tasks of the user's active plans on one day, in order. */
  tasksOn(userId: string, date: string) {
    return prisma.planTask.findMany({
      where: { date: toDbDate(date), plan: { userId, status: "ACTIVE" } },
      orderBy: [{ planId: "asc" }, { position: "asc" }],
    });
  },

  /** The next mock test in the user's active plans, today or later. */
  nextMock(userId: string, from: string) {
    return prisma.planTask.findFirst({
      where: {
        date: { gte: toDbDate(from) },
        type: { in: ["SECTION_MOCK", "FULL_MOCK"] },
        plan: { userId, status: "ACTIVE" },
      },
      orderBy: { date: "asc" },
    });
  },

  /** Tasks ticked on a day and still ticked, from any plan (a re-plan replaces them). */
  async doneTasksOn(userId: string, date: string) {
    const rows = await prisma.$queryRaw<{ taskId: string }[]>`
      SELECT "taskId" FROM (
        SELECT DISTINCT ON ("taskId") "taskId", done, "localDate"
        FROM "TaskCompletion"
        WHERE "userId" = ${userId}::uuid
        ORDER BY "taskId", "createdAt" DESC, id DESC
      ) latest WHERE done AND "localDate" = ${toDbDate(date)}`;
    if (rows.length === 0) return [];
    return prisma.planTask.findMany({
      where: { id: { in: rows.map((r) => r.taskId) } },
    });
  },

  /** Days of the user's active plans between two dates, with their task counts. */
  planDaysBetween(userId: string, from: string, to: string) {
    return prisma.planDay.findMany({
      where: {
        date: { gte: toDbDate(from), lte: toDbDate(to) },
        plan: { userId, status: "ACTIVE" },
      },
      orderBy: { date: "asc" },
      select: {
        date: true,
        planId: true,
        plannedMinutes: true,
        _count: { select: { tasks: true } },
      },
    });
  },

  /** How many tasks are still ticked on each day between two dates. */
  async doneCountsBetween(userId: string, from: string, to: string) {
    const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT "localDate" AS day, COUNT(*) AS count FROM (
        SELECT DISTINCT ON ("taskId") "localDate", done
        FROM "TaskCompletion"
        WHERE "userId" = ${userId}::uuid
          AND "localDate" BETWEEN ${toDbDate(from)} AND ${toDbDate(to)}
        ORDER BY "taskId", "createdAt" DESC, id DESC
      ) latest WHERE done GROUP BY "localDate"`;
    return new Map(rows.map((r) => [fromDbDate(r.day), Number(r.count)]));
  },

  /**
   * Minutes per day since `from`: timed sessions, and ticked tasks' planned minutes. The
   * page shows the larger of the two for each day, so nothing is counted twice.
   */
  async minutesByDay(userId: string, from: string) {
    const [sessions, ticked] = await Promise.all([
      prisma.$queryRaw<{ day: Date; minutes: number }[]>`
        SELECT "localDate" AS day, SUM("activeMinutes")::int AS minutes
        FROM "StudySession"
        WHERE "userId" = ${userId}::uuid AND "localDate" >= ${toDbDate(from)}
        GROUP BY "localDate"`,
      prisma.$queryRaw<{ day: Date; minutes: number }[]>`
        SELECT "localDate" AS day, SUM(minutes)::int AS minutes FROM (
          SELECT DISTINCT ON ("taskId") "localDate", minutes, done, type
          FROM "TaskCompletion"
          WHERE "userId" = ${userId}::uuid AND "localDate" >= ${toDbDate(from)}
          ORDER BY "taskId", "createdAt" DESC, id DESC
        ) latest WHERE done AND type IN ('STUDY', 'REVISION', 'CUSTOM')
        GROUP BY "localDate"`,
    ]);
    const days = new Map<string, number>();
    for (const r of [...sessions, ...ticked]) {
      const day = fromDbDate(r.day);
      days.set(day, Math.max(days.get(day) ?? 0, r.minutes));
    }
    return days;
  },

  /** The last tests, oldest first, for the accuracy trend. */
  async recentAttempts(userId: string, take: number) {
    const rows = await prisma.testAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, type: true, accuracy: true, localDate: true },
    });
    return rows
      .reverse()
      .map((r) => ({ ...r, localDate: fromDbDate(r.localDate) }));
  },

  /** Accuracy per topic over every test answer, for the topics with enough answers. */
  topicAccuracy(userId: string, minAnswers: number) {
    return prisma.$queryRaw<
      { topicKey: string; answers: number; accuracy: number }[]
    >`
      SELECT a."topicKey", COUNT(*)::int AS answers, AVG(a.correct::int)::float AS accuracy
      FROM "AttemptAnswer" a JOIN "TestAttempt" t ON t.id = a."attemptId"
      WHERE t."userId" = ${userId}::uuid
      GROUP BY a."topicKey" HAVING COUNT(*) >= ${minAnswers}
      ORDER BY accuracy ASC, answers DESC`;
  },

  /** Study minutes and test accuracy per subject. */
  async subjectTotals(userId: string) {
    const [minutes, tests] = await Promise.all([
      prisma.studySession.groupBy({
        by: ["subjectId"],
        where: { userId, subjectId: { not: null } },
        _sum: { activeMinutes: true },
      }),
      prisma.testAttempt.groupBy({
        by: ["subjectId"],
        where: { userId, subjectId: { not: null } },
        _avg: { accuracy: true },
        _count: true,
      }),
    ]);
    return {
      minutes: new Map(
        minutes.map((m) => [m.subjectId!, m._sum.activeMinutes ?? 0]),
      ),
      accuracy: new Map(
        tests.map((t) => [
          t.subjectId!,
          { avg: t._avg.accuracy ?? 0, count: t._count },
        ]),
      ),
    };
  },

  /** A subject's totals from the logs: active minutes and tasks still ticked. */
  async subjectStats(userId: string, subjectId: string) {
    const [minutes, tasks] = await Promise.all([
      prisma.studySession.aggregate({
        where: { userId, subjectId },
        _sum: { activeMinutes: true },
        _max: { localDate: true },
      }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count FROM (
          SELECT DISTINCT ON ("taskId") done FROM "TaskCompletion"
          WHERE "userId" = ${userId}::uuid AND "subjectId" = ${subjectId}::uuid
          ORDER BY "taskId", "createdAt" DESC, id DESC
        ) latest WHERE done`,
    ]);
    return {
      minutes: minutes._sum.activeMinutes ?? 0,
      lastStudied: minutes._max.localDate
        ? fromDbDate(minutes._max.localDate)
        : null,
      tasksDone: Number(tasks[0]?.count ?? 0),
    };
  },

  /** A topic's tasks in the user's active plans, from a day on. */
  topicTasksFrom(userId: string, topicId: string, from: string) {
    return prisma.planTask.findMany({
      where: {
        topicId,
        date: { gte: toDbDate(from) },
        plan: { userId, status: "ACTIVE" },
      },
      orderBy: [{ date: "asc" }, { position: "asc" }],
      take: 6,
    });
  },

  /** STUDY tasks of a plan for one topic: when all are done, the topic is. */
  studyTasksOfTopic(planId: string, topicId: string) {
    return prisma.planTask.findMany({
      where: { planId, topicId, type: "STUDY" },
      select: { id: true },
    });
  },

  /** The latest state of each task: ticked or not (latest log row wins). */
  async taskStates(userId: string, taskIds: string[]) {
    if (taskIds.length === 0) return new Map<string, boolean>();
    const rows = await prisma.$queryRaw<{ taskId: string; done: boolean }[]>`
      SELECT DISTINCT ON ("taskId") "taskId", done
      FROM "TaskCompletion"
      WHERE "userId" = ${userId}::uuid AND "taskId" = ANY(${taskIds}::uuid[])
      ORDER BY "taskId", "createdAt" DESC, id DESC`;
    return new Map(rows.map((r) => [r.taskId, r.done]));
  },

  /** Tasks still ticked on any of these plans: what was actually done. */
  completedTasks(userId: string, planIds: string[]) {
    if (planIds.length === 0) return Promise.resolve([]);
    return prisma.$queryRaw<
      {
        taskKey: string;
        type: PlanTaskType;
        subjectId: string | null;
        topicId: string | null;
        minutes: number;
        localDate: Date;
        accuracy: number | null;
      }[]
    >`
      SELECT "taskKey", type, "subjectId", "topicId", minutes, "localDate", accuracy FROM (
        SELECT DISTINCT ON ("taskId") "taskKey", type, "subjectId", "topicId",
               minutes, "localDate", done, accuracy
        FROM "TaskCompletion"
        WHERE "userId" = ${userId}::uuid AND "planId" = ANY(${planIds}::uuid[])
        ORDER BY "taskId", "createdAt" DESC, id DESC
      ) latest WHERE done`;
  },

  recordTask(row: TaskLogRow) {
    return prisma.taskCompletion.create({
      data: { ...row, localDate: toDbDate(row.localDate) },
    });
  },

  /** Days with a task still ticked, or enough active study, since `from`. */
  async activeDays(userId: string, from: string, minMinutes: number) {
    const rows = await prisma.$queryRaw<{ day: Date }[]>`
      SELECT day FROM (
        SELECT "localDate" AS day FROM (
          SELECT DISTINCT ON ("taskId") "localDate", done
          FROM "TaskCompletion"
          WHERE "userId" = ${userId}::uuid AND "localDate" >= ${toDbDate(from)}
          ORDER BY "taskId", "createdAt" DESC, id DESC
        ) latest WHERE done
        UNION
        SELECT "localDate" FROM "StudySession"
        WHERE "userId" = ${userId}::uuid AND "localDate" >= ${toDbDate(from)}
        GROUP BY "localDate" HAVING SUM("activeMinutes") >= ${minMinutes}
      ) days`;
    return rows.map((r) => fromDbDate(r.day));
  },

  async studyMinutesOn(userId: string, date: string) {
    const sum = await prisma.studySession.aggregate({
      where: { userId, localDate: toDbDate(date) },
      _sum: { activeMinutes: true },
    });
    return sum._sum.activeMinutes ?? 0;
  },

  async xpOn(userId: string, date: string, kind: XpKind) {
    const sum = await prisma.xpLedger.aggregate({
      where: { userId, localDate: toDbDate(date), kind },
      _sum: { amount: true },
    });
    return sum._sum.amount ?? 0;
  },

  activeSession(userId: string) {
    return prisma.activeSession.findUnique({ where: { userId } });
  },

  startSession(data: {
    userId: string;
    planId: string;
    taskId: string;
    at: Date;
  }) {
    return prisma.activeSession.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        taskId: data.taskId,
        startedAt: data.at,
        lastBeatAt: data.at,
      },
    });
  },

  updateSession(
    userId: string,
    data: { activeSeconds?: number; lastBeatAt?: Date; paused?: boolean },
  ) {
    return prisma.activeSession.update({ where: { userId }, data });
  },

  endSession(userId: string) {
    return prisma.activeSession.deleteMany({ where: { userId } });
  },

  recordStudy(row: {
    userId: string;
    planId: string;
    taskId: string;
    subjectId: string | null;
    topicId: string | null;
    startedAt: Date;
    endedAt: Date;
    activeMinutes: number;
    localDate: string;
  }) {
    return prisma.studySession.create({
      data: { ...row, localDate: toDbDate(row.localDate) },
    });
  },

  async xpTotal(userId: string) {
    const sum = await prisma.xpLedger.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return sum._sum.amount ?? 0;
  },

  /**
   * Appends XP and counts it on the leaderboards. The ranks are a cache: if Redis is
   * down the XP still counts, and the nightly rebuild catches the boards up.
   */
  async addXp(entry: {
    userId: string;
    kind: XpKind;
    amount: number;
    refId: string | null;
    localDate: string;
  }) {
    const row = await prisma.xpLedger.create({
      data: { ...entry, localDate: toDbDate(entry.localDate) },
    });
    await recordXp(entry.userId, entry.amount, entry.localDate).catch(() => {});
    return row;
  },
};

export type ProgressRepository = typeof progressRepository;
