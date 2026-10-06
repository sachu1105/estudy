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
const plans = createPlanService({ ...deps, activePlanLimit: () => 5 });
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
