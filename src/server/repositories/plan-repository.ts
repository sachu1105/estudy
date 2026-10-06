import "server-only";

import type { PlanOutput } from "@/lib/plan-engine";
import { prisma } from "@/server/db";
import { Prisma } from "@/server/db/generated/prisma/client";

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
  adjustments?: unknown;
  replanDiff?: unknown;
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
      select: {
        ...planSummary,
        inputs: true,
        replanDiff: true,
        diffSeenAt: true,
      },
    });
  },

  findOwned(id: string, userId: string) {
    return prisma.studyPlan.findFirst({
      where: { id, userId },
      select: {
        ...planSummary,
        inputs: true,
        leftOut: true,
        adjustments: true,
        replanDiff: true,
        diffSeenAt: true,
        replanWarning: true,
      },
    });
  },

  /** Every plan the user ever had for an exam: completions on any of them count. */
  async planIdsForExam(userId: string, syllabusVersionId: string) {
    const rows = await prisma.studyPlan.findMany({
      where: { userId, syllabusVersionId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  },

  /** The saved plan as the engine output it came from, for re-plans and their diff. */
  async loadOutput(planId: string): Promise<PlanOutput> {
    const plan = await prisma.studyPlan.findUniqueOrThrow({
      where: { id: planId },
      include: {
        days: {
          orderBy: { date: "asc" },
          include: { tasks: { orderBy: { position: "asc" } } },
        },
      },
    });
    const inputs = plan.inputs as { today: string; timelineStart?: string };
    return {
      kind: "PLAN",
      startDate: fromDbDate(plan.startDate),
      endDate: fromDbDate(plan.endDate),
      timelineStartDate: inputs.timelineStart ?? inputs.today,
      horizonDays: plan.days.length,
      reviewStartDate: plan.reviewStartDate
        ? fromDbDate(plan.reviewStartDate)
        : null,
      availableMinutes: plan.availableMinutes,
      requiredMinutes: plan.requiredMinutes,
      plannedMinutes: plan.plannedMinutes,
      coveragePercent: 100,
      droppedTouches: 0,
      days: plan.days.map((d) => ({
        date: fromDbDate(d.date),
        weekday: d.weekday,
        phase: d.phase,
        capacityMinutes: d.capacityMinutes,
        plannedMinutes: d.plannedMinutes,
        leadSubjectId: d.leadSubjectId,
        tasks: d.tasks.map((t) => ({
          id: t.key,
          type: t.type,
          date: fromDbDate(t.date),
          subjectId: t.subjectId,
          topicId: t.topicId,
          minutes: t.minutes,
          window: t.window,
          part:
            t.partIndex && t.partTotal
              ? { index: t.partIndex, total: t.partTotal }
              : null,
          touch: t.touch,
          finalReview: t.finalReview,
          pinned: t.pinned,
          title: t.title,
          reason:
            t.reason as PlanOutput["days"][number]["tasks"][number]["reason"],
        })),
      })),
    };
  },

  setReplanWarning(planId: string, warning: unknown) {
    return prisma.studyPlan.update({
      where: { id: planId },
      data: {
        replanWarning:
          warning === null ? Prisma.DbNull : (warning as Prisma.InputJsonValue),
      },
    });
  },

  markDiffSeen(planId: string, userId: string, at: Date) {
    return prisma.studyPlan.updateMany({
      where: { id: planId, userId },
      data: { diffSeenAt: at },
    });
  },

  /** Active plans of every user, for the weekly re-plan. */
  allActive() {
    return prisma.studyPlan.findMany({
      where: { status: "ACTIVE", syllabusVersionId: { not: null } },
      select: {
        id: true,
        syllabusVersionId: true,
        user: {
          select: {
            id: true,
            timezone: true,
            beginnerMode: true,
            subscriptions: {
              where: { status: { not: "EXPIRED" } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { plan: true, status: true, periodEnd: true },
            },
          },
        },
      },
    });
  },

  listOverrides(userId: string, syllabusVersionId: string) {
    return prisma.planOverride.findMany({
      where: { userId, syllabusVersionId },
      orderBy: { createdAt: "asc" },
    });
  },

  saveOverride(o: {
    userId: string;
    syllabusVersionId: string;
    taskKey: string;
    kind: "MOVE" | "RESIZE" | "LOCK" | "CUSTOM";
    data: unknown;
  }) {
    const data = o.data as Prisma.InputJsonValue;
    return prisma.planOverride.upsert({
      where: {
        userId_syllabusVersionId_taskKey: {
          userId: o.userId,
          syllabusVersionId: o.syllabusVersionId,
          taskKey: o.taskKey,
        },
      },
      create: { ...o, data },
      update: { kind: o.kind, data },
    });
  },

  removeOverride(userId: string, syllabusVersionId: string, taskKey: string) {
    return prisma.planOverride.deleteMany({
      where: { userId, syllabusVersionId, taskKey },
    });
  },

  findTask(taskId: string, userId: string) {
    return prisma.planTask.findFirst({
      where: { id: taskId, plan: { userId } },
      include: {
        plan: {
          select: {
            id: true,
            status: true,
            syllabusVersionId: true,
            endDate: true,
          },
        },
      },
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
          adjustments: (plan.adjustments ?? []) as Prisma.InputJsonValue,
          ...(plan.replanDiff
            ? { replanDiff: plan.replanDiff as Prisma.InputJsonValue }
            : {}),
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
