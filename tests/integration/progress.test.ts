import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import type { EditableTree } from "@/lib/syllabus/tree";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { planRepository } from "@/server/repositories/plan-repository";
import { podRepository } from "@/server/repositories/pod-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";
import { createPlanService } from "@/server/services/plans/plan-service";
import { createPodService } from "@/server/services/pods/pod-service";
import { createProgressService } from "@/server/services/progress/progress-service";
import { createSessionService } from "@/server/services/progress/session-service";

import { resetDatabase } from "./helpers";

// 10:00 in Kolkata on Wednesday 7 October 2026.
const clock = fixedClock("2026-10-07T04:30:00Z");
const deps = {
  plans: planRepository,
  completions: topicCompletionRepository,
  clock,
};
const plans = createPlanService({
  ...deps,
  progress: progressRepository,
  activePlanLimit: () => 5,
});
const pods = createPodService({
  ...deps,
  pods: podRepository,
  syllabuses: syllabusRepository,
});
const progress = createProgressService({
  ...deps,
  progress: progressRepository,
});

const sessions = createSessionService({
  progress: progressRepository,
  tasks: progress,
  clock,
});

const id = () => crypto.randomUUID();

async function userWithPlan() {
  const u = await prisma.user.create({
    data: {
      email: `${id()}@example.com`,
      passwordHash: "x",
      name: "Anu",
      displayName: "Anu",
    },
  });
  const user = {
    id: u.id,
    timezone: "Asia/Kolkata",
    beginnerMode: false,
    subscription: null,
  };
  const version = await prisma.syllabusVersion.create({
    data: {
      title: "LDC",
      ownerId: user.id,
      sourceKind: "TEXT",
      fileHash: id(),
    },
  });
  const tree: EditableTree = {
    subjects: [
      {
        id: id(),
        name: "History",
        topics: [
          {
            id: id(),
            name: "Renaissance",
            weight: 5,
            difficulty: 5,
            foundational: false,
          },
          {
            id: id(),
            name: "Mughals",
            weight: 2,
            difficulty: 2,
            foundational: false,
          },
        ],
      },
    ],
  };
  await syllabusRepository.approvePrivate(version.id, tree, new Date());
  await pods.syncFromSyllabus(user, version.id);
  const started = await plans.startDraft(user, version.id);
  const draftId = (started as { draftId: string }).draftId;
  const draft = (await plans.getDraft(user, draftId))!;
  await plans.saveDraft(user, draftId, {
    ...draft.data,
    targetDays: 60,
    minutesByWeekday: [120, 120, 120, 120, 120, 120, 120],
  });
  const made = await plans.generate(user, draftId, "ALL");
  return { user, planId: (made as { planId: string }).planId, draftId };
}

const xpOf = async (userId: string) => progressRepository.xpTotal(userId);

beforeEach(async () => {
  await resetDatabase();
  clock.set("2026-10-07T04:30:00Z");
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("ticking tasks", () => {
  it("logs a tick, gives XP, starts the streak, and takes XP back on untick", async () => {
    const { user } = await userWithPlan();
    const view = await progress.todayView(user);
    expect(view.hasPlan).toBe(true);
    expect(view.tasks.length).toBeGreaterThan(0);
    const task = view.tasks[0]!;

    expect(await progress.setTaskDone(user, task.id, true)).toEqual({
      ok: true,
      streak: 1,
    });
    // Ticking twice is not two ticks.
    await progress.setTaskDone(user, task.id, true);
    expect(await prisma.taskCompletion.count()).toBe(1);
    expect(await xpOf(user.id)).toBe(10);
    const after = await progress.todayView(user);
    expect(after.tasks.find((t) => t.id === task.id)!.done).toBe(true);
    expect(after.minutesDone).toBe(task.minutes);
    expect(after.streak).toMatchObject({ current: 1, todayDone: true });

    await progress.setTaskDone(user, task.id, false);
    expect(await xpOf(user.id)).toBe(0);
    expect((await progress.streak(user)).current).toBe(0);
    expect(await prisma.taskCompletion.count()).toBe(2);
  });

  it("marks a topic done in its pod once all its study blocks are", async () => {
    const { user, planId } = await userWithPlan();
    const study = await prisma.planTask.findMany({
      where: { planId, type: "STUDY" },
      orderBy: [{ date: "asc" }, { position: "asc" }],
    });
    const topicId = study[0]!.topicId!;
    const blocks = study.filter((t) => t.topicId === topicId);
    for (const [i, block] of blocks.entries()) {
      const known = await topicCompletionRepository.doneAmong(user.id, [
        topicId,
      ]);
      expect(known.has(topicId), `before block ${i + 1}`).toBe(false);
      await progress.setTaskDone(user, block.id, true);
    }
    const known = await topicCompletionRepository.doneAmong(user.id, [topicId]);
    expect(known.has(topicId)).toBe(true);
  });

  it("gives a streak bonus on the day's first activity, once", async () => {
    const { user } = await userWithPlan();
    const yesterday = new Date("2026-10-06T00:00:00Z");
    const view = await progress.todayView(user);
    await prisma.taskCompletion.create({
      data: {
        userId: user.id,
        planId: view.tasks[0]!.planId,
        taskId: id(),
        taskKey: "old",
        type: "STUDY",
        minutes: 30,
        localDate: yesterday,
        done: true,
      },
    });
    await progress.setTaskDone(user, view.tasks[0]!.id, true);
    await progress.setTaskDone(user, view.tasks[1]!.id, true);
    const streakXp = await prisma.xpLedger.findMany({
      where: { kind: "STREAK" },
    });
    expect(streakXp.map((x) => x.amount)).toEqual([4]); // streak 2 x 2 XP
  });

  it("refuses other users' tasks and tasks of a replaced plan", async () => {
    const { user, draftId } = await userWithPlan();
    const other = (await userWithPlan()).user;
    const task = (await progress.todayView(user)).tasks[0]!;
    expect(await progress.setTaskDone(other, task.id, true)).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
    await plans.generate(user as never, draftId, "ALL"); // archives the first plan
    expect(await progress.setTaskDone(user, task.id, true)).toMatchObject({
      ok: false,
      code: "REPLACED",
    });
  });

  it("never lets the logs change (rule 6)", async () => {
    const { user } = await userWithPlan();
    const task = (await progress.todayView(user)).tasks[0]!;
    await progress.setTaskDone(user, task.id, true);
    await expect(
      prisma.taskCompletion.updateMany({ data: { done: false } }),
    ).rejects.toThrow();
    await expect(prisma.xpLedger.deleteMany({})).rejects.toThrow();
  });
});

describe("study sessions", () => {
  it("counts only active time, survives a reload, and logs it on finish", async () => {
    const { user } = await userWithPlan();
    const task = (await progress.todayView(user)).tasks.find(
      (t) => t.type === "STUDY",
    )!;
    expect(await sessions.start(user, task.id)).toMatchObject({
      ok: true,
      seconds: 0,
    });

    clock.advance(60_000);
    expect(await sessions.beat(user)).toMatchObject({ seconds: 60 });
    clock.advance(60_000);
    await sessions.beat(user);
    // Away for 20 minutes: only 90 seconds of it count.
    clock.advance(20 * 60_000);
    expect(await sessions.beat(user)).toMatchObject({ seconds: 210 });
    // Paused time never counts.
    await sessions.beat(user, true);
    clock.advance(30 * 60_000);
    expect(await sessions.get(user)).toMatchObject({
      seconds: 210,
      paused: true,
    });
    await sessions.beat(user, false);
    clock.advance(60_000);
    // A reload just reads the same state back.
    expect(await sessions.start(user, task.id)).toMatchObject({ seconds: 270 });

    expect(await sessions.finish(user, true)).toMatchObject({
      ok: true,
      minutes: 4,
    });
    expect(await sessions.get(user)).toBeNull();
    const logged = await prisma.studySession.findMany();
    expect(logged.map((s) => s.activeMinutes)).toEqual([4]);
    const xp = await prisma.xpLedger.groupBy({
      by: ["kind"],
      _sum: { amount: true },
    });
    expect(
      Object.fromEntries(xp.map((x) => [x.kind, x._sum.amount])),
    ).toMatchObject({
      STUDY: 4,
      TASK: 10,
    });
    expect(
      (await progress.todayView(user)).tasks.find((t) => t.id === task.id)!
        .done,
    ).toBe(true);
  });

  it("closes the running timer when another task starts", async () => {
    const { user } = await userWithPlan();
    const [first, second] = (await progress.todayView(user)).tasks;
    await sessions.start(user, first!.id);
    clock.advance(60_000);
    await sessions.beat(user);
    clock.advance(60_000);
    expect(await sessions.start(user, second!.id)).toMatchObject({
      ok: true,
      closedOther: 2,
    });
    expect(await prisma.studySession.count()).toBe(1);
    expect(await sessions.get(user)).toMatchObject({
      taskId: second!.id,
      seconds: 0,
    });
  });
});

describe("re-planning", () => {
  const tasksOf = (planId: string) =>
    prisma.planTask.findMany({
      where: { planId },
      orderBy: [{ date: "asc" }, { position: "asc" }],
    });
  const activePlan = (userId: string) =>
    prisma.studyPlan.findFirstOrThrow({ where: { userId, status: "ACTIVE" } });

  it("re-makes the plan from today after a week, keeping the end date and the work done", async () => {
    const { user, planId } = await userWithPlan();
    const first = await prisma.studyPlan.findUniqueOrThrow({
      where: { id: planId },
    });
    const todays = (await progress.todayView(user)).tasks;
    for (const t of todays) await progress.setTaskDone(user, t.id, true);

    clock.advance(7 * 86_400_000);
    const result = await plans.replan(user, first.syllabusVersionId!);
    expect(result).toMatchObject({ ok: true });
    const next = await activePlan(user.id);
    expect(next.id).not.toBe(planId);
    expect(next.endDate).toEqual(first.endDate);
    expect(
      (await prisma.studyPlan.findUniqueOrThrow({ where: { id: planId } }))
        .status,
    ).toBe("ARCHIVED");
    // Nothing before today: no overdue anywhere (rule 7).
    const tasks = await tasksOf(next.id);
    expect(tasks.every((t) => t.date >= new Date("2026-10-14T00:00:00Z"))).toBe(
      true,
    );
    expect(next.replanDiff).toMatchObject({ minutesDone: expect.any(Number) });
    expect(
      (next.replanDiff as { minutesDone: number }).minutesDone,
    ).toBeGreaterThan(0);
  });

  it("gives a valid plan after a fully missed week", async () => {
    const { user, planId } = await userWithPlan();
    const first = await prisma.studyPlan.findUniqueOrThrow({
      where: { id: planId },
    });
    clock.advance(7 * 86_400_000);
    expect(await plans.replan(user, first.syllabusVersionId!)).toMatchObject({
      ok: true,
    });
    const tasks = await tasksOf((await activePlan(user.id)).id);
    expect(tasks.some((t) => t.type === "STUDY")).toBe(true);
    expect(tasks.every((t) => t.date >= new Date("2026-10-14T00:00:00Z"))).toBe(
      true,
    );
  });

  it("keeps a moved or resized task where the user put it, until reset", async () => {
    const { user, planId } = await userWithPlan();
    const study = (await tasksOf(planId)).find((t) => t.type === "STUDY")!;

    expect(
      await plans.editTask(user, study.id, {
        kind: "MOVE",
        date: "2026-10-20",
      }),
    ).toMatchObject({
      ok: true,
    });
    let plan = await activePlan(user.id);
    let moved = (await tasksOf(plan.id)).find((t) => t.key === study.key)!;
    expect(moved).toMatchObject({
      pinned: true,
      date: new Date("2026-10-20T00:00:00Z"),
    });

    // A later re-plan respects it.
    clock.advance(86_400_000);
    await plans.replan(user, plan.syllabusVersionId!);
    plan = await activePlan(user.id);
    moved = (await tasksOf(plan.id)).find((t) => t.key === study.key)!;
    expect(moved.date).toEqual(new Date("2026-10-20T00:00:00Z"));

    await plans.editTask(user, moved.id, { kind: "RESIZE", minutes: 45 });
    plan = await activePlan(user.id);
    expect(
      (await tasksOf(plan.id)).find((t) => t.key === study.key)!.minutes,
    ).toBe(45);

    const pinned = (await tasksOf(plan.id)).find((t) => t.key === study.key)!;
    await plans.resetTask(user, pinned.id);
    plan = await activePlan(user.id);
    expect((await tasksOf(plan.id)).every((t) => !t.pinned)).toBe(true);
    expect(await prisma.planOverride.count()).toBe(0);

    // Past days and check tests can't be pinned.
    const check = (await tasksOf(plan.id)).find(
      (t) => t.type === "CHECK_TEST",
    )!;
    expect(
      await plans.editTask(user, check.id, { kind: "LOCK" }),
    ).toMatchObject({ ok: false });
    const any = (await tasksOf(plan.id)).find((t) => t.type === "STUDY")!;
    expect(
      await plans.editTask(user, any.id, { kind: "MOVE", date: "2026-10-01" }),
    ).toMatchObject({
      ok: false,
      code: "BAD_DATE",
    });
  });

  it("adds a task of the user's own", async () => {
    const { user, planId } = await userWithPlan();
    const { syllabusVersionId } = await prisma.studyPlan.findUniqueOrThrow({
      where: { id: planId },
    });
    expect(
      await plans.addCustomTask(user, syllabusVersionId!, {
        date: "2026-10-09",
        minutes: 30,
        title: "Old question paper",
      }),
    ).toMatchObject({ ok: true });
    const tasks = await tasksOf((await activePlan(user.id)).id);
    expect(tasks.find((t) => t.type === "CUSTOM")).toMatchObject({
      title: "Old question paper",
      date: new Date("2026-10-09T00:00:00Z"),
      minutes: 30,
    });
  });

  it("keeps work done when the plan's settings change", async () => {
    const { user, draftId, planId } = await userWithPlan();
    const study = (await progress.todayView(user)).tasks.filter(
      (t) => t.type === "STUDY",
    );
    for (const t of study) await progress.setTaskDone(user, t.id, true);
    const topicId = study[0]!.topicId!;
    const studyMinutes = async (id: string) =>
      (await tasksOf(id))
        .filter((t) => t.type === "STUDY" && t.topicId === topicId)
        .reduce((n, t) => n + t.minutes, 0);
    const before = await studyMinutes(planId);

    // Same daily time, so only the work done changes the topic's study.
    const draft = (await plans.getDraft(user, draftId))!;
    await plans.saveDraft(user, draftId, { ...draft.data });
    clock.advance(86_400_000);
    expect(await plans.generate(user, draftId, "ALL")).toMatchObject({
      ok: true,
      outcome: "PLAN",
    });
    const after = await studyMinutes((await activePlan(user.id)).id);
    expect(after).toBeLessThan(before);
  });
});
