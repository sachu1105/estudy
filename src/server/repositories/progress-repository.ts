import "server-only";

import { prisma } from "@/server/db";
import type { PlanTaskType, XpKind } from "@/server/db/generated/prisma/client";

import { fromDbDate, toDbDate } from "./plan-repository";

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
      }[]
    >`
      SELECT "taskKey", type, "subjectId", "topicId", minutes, "localDate" FROM (
        SELECT DISTINCT ON ("taskId") "taskKey", type, "subjectId", "topicId",
               minutes, "localDate", done
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

  addXp(entry: {
    userId: string;
    kind: XpKind;
    amount: number;
    refId: string | null;
    localDate: string;
  }) {
    return prisma.xpLedger.create({
      data: { ...entry, localDate: toDbDate(entry.localDate) },
    });
  },
};

export type ProgressRepository = typeof progressRepository;
