import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import type { EditableTree } from "@/lib/syllabus/tree";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { planRepository } from "@/server/repositories/plan-repository";
import { podRepository } from "@/server/repositories/pod-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import { questionRepository } from "@/server/repositories/question-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";
import { createQuestionAdmin } from "@/server/services/admin/question-admin";
import { createPlanService } from "@/server/services/plans/plan-service";
import { createPodService } from "@/server/services/pods/pod-service";
import { createProgressService } from "@/server/services/progress/progress-service";
import { createTestService } from "@/server/services/tests/test-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-07T04:30:00Z");
const base = {
  plans: planRepository,
  completions: topicCompletionRepository,
  clock,
};
const plans = createPlanService({
  ...base,
  progress: progressRepository,
  activePlanLimit: () => 5,
});
const pods = createPodService({
  ...base,
  pods: podRepository,
  syllabuses: syllabusRepository,
});
const progress = createProgressService({
  ...base,
  progress: progressRepository,
});
let checksPerDay = 10;
const tests = createTestService({
  questions: questionRepository,
  progress: progressRepository,
  pods: podRepository,
  clock,
  random: () => 0.5,
  limit: (_u, f) => (f === "afterTaskMocksPerDay" ? checksPerDay : 10),
  completeTask: (user, taskId, accuracy) =>
    progress.setTaskDone(user, taskId, true, accuracy),
});
const admin = createQuestionAdmin({
  questions: questionRepository,
  audit: auditLogRepository,
  clock,
});

const id = () => crypto.randomUUID();

async function makeUser(role: "USER" | "ADMIN" = "USER") {
  const u = await prisma.user.create({
    data: {
      email: `${id()}@example.com`,
      passwordHash: "x",
      name: "Anu",
      displayName: "Anu",
      role,
    },
  });
  return {
    id: u.id,
    role,
    timezone: "Asia/Kolkata",
    beginnerMode: false,
    subscription: null,
  };
}
type User = Awaited<ReturnType<typeof makeUser>>;

/** The user's own syllabus with a "Preamble" topic, its pods and a plan. */
async function withPlan(user: User) {
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
        name: "Constitution",
        topics: [
          {
            id: id(),
            name: "Preamble",
            weight: 4,
            difficulty: 3,
            foundational: false,
          },
          {
            id: id(),
            name: "Fundamental rights",
            weight: 3,
            difficulty: 3,
            foundational: false,
          },
        ],
      },
    ],
  };
  await syllabusRepository.approvePrivate(version.id, tree, new Date());
  await pods.syncFromSyllabus(user, version.id);
  const draftId = (
    (await plans.startDraft(user, version.id)) as { draftId: string }
  ).draftId;
  const draft = (await plans.getDraft(user, draftId))!;
  await plans.saveDraft(user, draftId, {
    ...draft.data,
    targetDays: 60,
    minutesByWeekday: [120, 120, 120, 120, 120, 120, 120],
  });
  const made = (await plans.generate(user, draftId, "ALL")) as {
    planId: string;
  };
  return {
    versionId: version.id,
    planId: made.planId,
    preamble: tree.subjects[0]!.topics[0]!.id,
  };
}

/** Five verified Preamble questions, the right answer always option A. */
async function preamblePool(by: User) {
  const csv = Array.from(
    { length: 5 },
    (_, i) =>
      `preamble,2,Preamble question number ${i + 1}?,Right ${i},Wrong ${i}a,Wrong ${i}b,Wrong ${i}c,A,Because.,Test`,
  ).join("\n");
  return admin.import({ id: by.id, role: "ADMIN" }, csv, true);
}

beforeEach(async () => {
  await resetDatabase();
  clock.set("2026-10-07T04:30:00Z");
  checksPerDay = 10;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("question pool", () => {
  it("imports as pending to review, or verified when the admin says so", async () => {
    const boss = await makeUser("ADMIN");
    const pending = await admin.import(
      { id: boss.id, role: "ADMIN" },
      "Rivers,3,Longest river in Kerala?,Periyar,Pamba,Chaliyar,Kabini,A,,\nRivers,9,bad,a,b,c,d,A,,",
      false,
    );
    expect(pending.added).toBe(1);
    expect(pending.errors.map((e) => e.line)).toEqual([2]);
    const [rows] = await admin.list("PENDING", "rivers", 0);
    expect(rows).toHaveLength(1);
    await admin.decide(
      { id: boss.id, role: "ADMIN" },
      [rows[0]!.id],
      "VERIFIED",
    );
    expect((await questionRepository.find(rows[0]!.id))?.status).toBe(
      "VERIFIED",
    );
  });
});

describe("check tests", () => {
  it("builds from the shared pool by topic name, hides answers, scores once on the server", async () => {
    const boss = await makeUser("ADMIN");
    await preamblePool(boss);
    const user = await makeUser();
    const { planId, preamble } = await withPlan(user);
    const task = await prisma.planTask.findFirstOrThrow({
      where: { planId, type: "CHECK_TEST", topicId: preamble },
      orderBy: { date: "asc" },
    });

    const started = await tests.startForTask(user, task.id);
    expect(started).toMatchObject({ ok: true });
    const testId = (started as { testId: string }).testId;
    // Resuming gives the same test, not a new one.
    expect(await tests.startForTask(user, task.id)).toEqual(started);

    const player = (await tests.forPlayer(user, testId))!;
    expect(player.questions).toHaveLength(5);
    expect(JSON.stringify(player.questions)).not.toContain("correctIndex");

    const answers = player.questions.map((q, i) => ({
      questionId: q.id,
      chosenIndex: i < 4 ? 0 : 1,
      flagged: false,
    }));
    answers.push({ questionId: id(), chosenIndex: 0, flagged: false }); // not in the test: ignored
    const submitted = await tests.submit(user, testId, answers);
    expect(submitted).toMatchObject({ ok: true });
    expect(await tests.submit(user, testId, answers)).toEqual(submitted);

    const attempt = await prisma.testAttempt.findFirstOrThrow();
    expect(attempt).toMatchObject({
      total: 5,
      correct: 4,
      wrong: 1,
      accuracy: 0.8,
    });
    const log = await prisma.taskCompletion.findFirstOrThrow({
      where: { taskId: task.id },
    });
    expect(log).toMatchObject({ done: true, accuracy: 0.8 });
    const xp = await prisma.xpLedger.findMany({
      where: { userId: user.id, kind: "TEST" },
    });
    expect(xp.map((x) => x.amount)).toEqual([8]);

    const review = (await tests.review(user, testId))!;
    expect(review.questions[0]).toMatchObject({
      correctIndex: 0,
      explanation: "Because.",
    });
  });

  it("refuses a topic with no questions, and keeps to the daily limit", async () => {
    const boss = await makeUser("ADMIN");
    await preamblePool(boss);
    const user = await makeUser();
    const { preamble } = await withPlan(user);
    checksPerDay = 1;
    expect(await tests.practiceTopic(user, preamble)).toMatchObject({
      ok: true,
    });
    expect(await tests.practiceTopic(user, preamble)).toMatchObject({
      ok: false,
      code: "LIMIT",
    });

    const rights = await prisma.topic.findFirstOrThrow({
      where: { name: "Fundamental rights" },
    });
    checksPerDay = 10;
    expect(await tests.practiceTopic(user, rights.id)).toMatchObject({
      ok: false,
      code: "THIN_POOL",
    });
    // Someone else's topic is simply not found.
    const other = await makeUser();
    expect(await tests.practiceTopic(other, preamble)).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
  });

  it("suppresses a question after three reports", async () => {
    const boss = await makeUser("ADMIN");
    await preamblePool(boss);
    const q = await prisma.question.findFirstOrThrow();
    for (let i = 0; i < 3; i++) {
      const u = await makeUser();
      await tests.report(u, q.id, "WRONG_ANSWER", null);
    }
    expect((await questionRepository.find(q.id))?.status).toBe("SUPPRESSED");
    expect(
      (await questionRepository.pool(["preamble"])).map((p) => p.id),
    ).not.toContain(q.id);
  });
});

describe("results change the plan", () => {
  it("gives a topic scored at 20% more time after the re-plan than one scored at 90%", async () => {
    const boss = await makeUser("ADMIN");
    await preamblePool(boss);
    const weak = await makeUser();
    const strong = await makeUser();
    const minutesFor = async (user: User, accuracy: number) => {
      const { planId, versionId, preamble } = await withPlan(user);
      const checks = await prisma.planTask.findMany({
        where: { planId, type: "CHECK_TEST", topicId: preamble },
      });
      for (const c of checks)
        await progress.setTaskDone(user, c.id, true, accuracy);
      const studies = await prisma.planTask.findMany({
        where: { planId, type: "STUDY", topicId: preamble },
      });
      for (const s of studies) await progress.setTaskDone(user, s.id, true);
      clock.advance(7 * 86_400_000);
      await plans.replan(user, versionId);
      clock.set("2026-10-07T04:30:00Z");
      const next = await prisma.studyPlan.findFirstOrThrow({
        where: { userId: user.id, status: "ACTIVE" },
      });
      const revisions = await prisma.planTask.findMany({
        where: { planId: next.id, topicId: preamble, type: "REVISION" },
      });
      return revisions.reduce((n, t) => n + t.minutes, 0);
    };
    const weakMinutes = await minutesFor(weak, 0.2);
    const strongMinutes = await minutesFor(strong, 0.9);
    expect(weakMinutes).toBeGreaterThan(strongMinutes);
  });
});
