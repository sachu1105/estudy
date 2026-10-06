import "server-only";

import type { PlanOutput } from "@/lib/plan-engine";
import { prisma } from "@/server/db";
import type { Prisma } from "@/server/db/generated/prisma/client";

/** "YYYY-MM-DD" <-> a Postgres date column. */
export const toDbDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

export type NewPlan = {
  userId: string;
  syllabusVersionId: string;
  title: string;
  inputs: unknown;
  leftOut: unknown;
  output: PlanOutput;
};

export const planRepository = {
  /**
   * What a plan is built from: the user's subject pods for one exam, with each subject's
   * topics, and where the user put the pod on the board.
   */
  examTree(userId: string, syllabusVersionId: string) {
    return prisma.pod.findMany({
      where: {
        ownerId: userId,
        syllabusVersionId,
        kind: "SUBJECT",
        deletedAt: null,
        subject: { isNot: null },
      },
      orderBy: [{ stageOrder: "asc" }, { order: "asc" }],
      select: {
        id: true,
        name: true,
        stage: true,
        stageOrder: true,
        order: true,
        subject: {
          select: {
            id: true,
            name: true,
            topics: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                name: true,
                weight: true,
                difficulty: true,
                foundational: true,
                order: true,
              },
            },
          },
        },
      },
    });
  },

  findDraft(userId: string, syllabusVersionId: string) {
    return prisma.planDraft.findUnique({
      where: { userId_syllabusVersionId: { userId, syllabusVersionId } },
    });
  },

  findDraftById(id: string, userId: string) {
    return prisma.planDraft.findFirst({
      where: { id, userId },
      include: { syllabusVersion: { select: { id: true, title: true } } },
    });
  },

  createDraft(userId: string, syllabusVersionId: string, data: unknown) {
    return prisma.planDraft.create({
      data: {
        userId,
        syllabusVersionId,
        data: data as Prisma.InputJsonValue,
      },
    });
  },

  saveDraft(id: string, data: unknown) {
    return prisma.planDraft.update({
      where: { id },
      data: { data: data as Prisma.InputJsonValue },
    });
  },

  /** Active plans for exams other than this one: what counts against the plan limit. */
  countActiveElsewhere(userId: string, syllabusVersionId: string) {
    return prisma.studyPlan.count({
      where: {
        userId,
        status: "ACTIVE",
        NOT: { syllabusVersionId },
      },
    });
  },

  activeFor(userId: string, syllabusVersionId: string) {
    return prisma.studyPlan.findFirst({
      where: { userId, syllabusVersionId, status: "ACTIVE" },
      select: planSummary,
    });
  },

  listActive(userId: string) {
    return prisma.studyPlan.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: planSummary,
    });
  },

  /** Active plans with their input snapshot, for names and topic totals. */
  listActiveWithInputs(userId: string) {
    return prisma.studyPlan.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { ...planSummary, inputs: true },
    });
  },

  findOwned(id: string, userId: string) {
    return prisma.studyPlan.findFirst({
      where: { id, userId },
      select: { ...planSummary, inputs: true, leftOut: true },
    });
  },

  /** Days from `from` on, at most `limit` of them, with their tasks in order. */
  daysFrom(planId: string, from: string, limit: number) {
    return prisma.planDay.findMany({
      where: { planId, date: { gte: toDbDate(from) } },
      orderBy: { date: "asc" },
      take: limit,
      include: { tasks: { orderBy: { position: "asc" } } },
    });
  },

  /**
   * Saves a generated plan and archives the exam's previous one, in one transaction, so
   * there is never a moment with two active plans or none.
   */
  async create(plan: NewPlan) {
    const { output } = plan;
    return prisma.$transaction(async (tx) => {
      await tx.studyPlan.updateMany({
        where: {
          userId: plan.userId,
          syllabusVersionId: plan.syllabusVersionId,
          status: "ACTIVE",
        },
        data: { status: "ARCHIVED" },
      });
      const created = await tx.studyPlan.create({
        data: {
          userId: plan.userId,
          syllabusVersionId: plan.syllabusVersionId,
          title: plan.title,
          startDate: toDbDate(output.startDate),
          endDate: toDbDate(output.endDate),
          reviewStartDate: output.reviewStartDate
            ? toDbDate(output.reviewStartDate)
            : null,
          inputs: plan.inputs as Prisma.InputJsonValue,
          leftOut: plan.leftOut as Prisma.InputJsonValue,
          availableMinutes: output.availableMinutes,
          requiredMinutes: output.requiredMinutes,
          plannedMinutes: output.plannedMinutes,
        },
      });
      const days = await tx.planDay.createManyAndReturn({
        data: output.days.map((d) => ({
          planId: created.id,
          date: toDbDate(d.date),
          weekday: d.weekday,
          phase: d.phase,
          capacityMinutes: d.capacityMinutes,
          plannedMinutes: d.plannedMinutes,
          leadSubjectId: d.leadSubjectId,
        })),
        select: { id: true, date: true },
      });
      const dayIds = new Map(days.map((d) => [fromDbDate(d.date), d.id]));
      await tx.planTask.createMany({
        data: output.days.flatMap((d) =>
          d.tasks.map((t, position) => ({
            planId: created.id,
            dayId: dayIds.get(d.date)!,
            key: t.id,
            position,
            type: t.type,
            date: toDbDate(t.date),
            subjectId: t.subjectId,
            topicId: t.topicId,
            minutes: t.minutes,
            window: t.window,
            partIndex: t.part?.index ?? null,
            partTotal: t.part?.total ?? null,
            touch: t.touch,
            finalReview: t.finalReview,
            pinned: t.pinned,
            title: t.title,
            reason: t.reason as Prisma.InputJsonValue,
          })),
        ),
      });
      return created;
    });
  },
};

const planSummary = {
  id: true,
  title: true,
  syllabusVersionId: true,
  status: true,
  startDate: true,
  endDate: true,
  reviewStartDate: true,
  availableMinutes: true,
  requiredMinutes: true,
  plannedMinutes: true,
  createdAt: true,
} as const;

export type PlanRepository = typeof planRepository;
