import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import type { EditableTree } from "@/lib/syllabus/tree";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { planRepository } from "@/server/repositories/plan-repository";
import { podRepository } from "@/server/repositories/pod-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";
import { createPlanService } from "@/server/services/plans/plan-service";
import { createPodService } from "@/server/services/pods/pod-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-06T04:30:00Z");
let planLimit = 3;
const plans = createPlanService({
  plans: planRepository,
  completions: topicCompletionRepository,
  clock,
  activePlanLimit: () => planLimit,
});
const pods = createPodService({
  pods: podRepository,
  syllabuses: syllabusRepository,
  completions: topicCompletionRepository,
  clock,
});

const id = () => crypto.randomUUID();
const topic = (name: string, weight = 3) => ({
  id: id(),
  name,
  weight,
  difficulty: 3,
  foundational: false,
});

async function makeUser(email = "anu@example.com") {
  const u = await prisma.user.create({
    data: { email, passwordHash: "x", name: "Anu", displayName: "Anu" },
  });
  return {
    id: u.id,
    timezone: "Asia/Kolkata",
    beginnerMode: false,
    subscription: null,
  };
}
type User = Awaited<ReturnType<typeof makeUser>>;

/** A confirmed syllabus with History (3 topics) and English (2), and its pods. */
async function exam(user: User, title = "LDC") {
  const version = await prisma.syllabusVersion.create({
    data: { title, ownerId: user.id, sourceKind: "TEXT", fileHash: id() },
  });
  const tree: EditableTree = {
    subjects: [
      {
        id: id(),
        name: "History",
        topics: [
          topic("Kerala renaissance", 5),
          topic("Freedom struggle", 4),
          topic("Mughals", 1),
        ],
      },
      {
        id: id(),
        name: "English",
        topics: [topic("Tenses", 3), topic("Idioms", 2)],
      },
    ],
  };
  await syllabusRepository.approvePrivate(version.id, tree, new Date());
  await pods.syncFromSyllabus(user, version.id);
  return version.id;
}

async function generous(user: User, syllabusId: string) {
  const started = await plans.startDraft(user, syllabusId);
  if (!started.ok) throw new Error(started.message);
  const draft = (await plans.getDraft(user, started.draftId))!;
  await plans.saveDraft(user, started.draftId, {
    ...draft.data,
    examDate: null,
    targetDays: 60,
    minutesByWeekday: [120, 120, 120, 120, 120, 120, 120],
  });
  return started.draftId;
}

beforeEach(async () => {
  await resetDatabase();
  planLimit = 3;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("study plans", () => {
  it("opens one setup per exam, with a setting for every subject", async () => {
    const user = await makeUser();
    const syllabusId = await exam(user);
    const first = await plans.startDraft(user, syllabusId);
    const again = await plans.startDraft(user, syllabusId);
    expect(first).toMatchObject({ ok: true });
    expect(again).toEqual(first);
    const draft = (await plans.getDraft(
      user,
      (first as { draftId: string }).draftId,
    ))!;
    expect(draft.subjects.map((s) => s.name)).toEqual(["History", "English"]);
    expect(Object.values(draft.data.subjects)).toEqual([
      { confidence: 3, intensity: "STEADY" },
      { confidence: 3, intensity: "STEADY" },
    ]);

    const beginner = {
      ...(await makeUser("b@example.com")),
      beginnerMode: true,
    };
    const other = await exam(beginner);
    const theirs = await plans.startDraft(beginner, other);
    const theirDraft = (await plans.getDraft(
      beginner,
      (theirs as { draftId: string }).draftId,
    ))!;
    expect(Object.values(theirDraft.data.subjects)[0]).toMatchObject({
      confidence: 1,
    });
    // Nobody else can read or save a setup.
    expect(
      await plans.getDraft(user, (theirs as { draftId: string }).draftId),
    ).toBeNull();
  });

  it("builds and saves a plan from the board, skipping ticked topics", async () => {
    const user = await makeUser();
    const syllabusId = await exam(user);
    const [history, english] = await pods.list(user);
    await pods.arrangeBoard(user, syllabusId, {
      TO_STUDY: [history!.id],
      STUDYING: [english!.id],
      REVISING: [],
      DONE: [],
    });
    const tenses = english!.topics.find((t) => t.name === "Tenses")!;
    await pods.setTopicDone(user, english!.id, tenses.id, true);

    const draftId = await generous(user, syllabusId);
    const result = await plans.generate(user, draftId, "ALL");
    expect(result).toMatchObject({ ok: true, outcome: "PLAN" });
    const planId = (result as { planId: string }).planId;

    const plan = (await plans.get(user, planId, 400))!;
    expect(plan.title).toBe("LDC");
    expect(plan.subjects).toBe(2);
    const tasks = plan.days.flatMap((d) => d.tasks);
    const study = tasks.filter((t) => t.type === "STUDY");
    // Studying first; the ticked topic gets nothing at all.
    expect(plan.subjectNames.get(study[0]!.subjectId!)).toBe("English");
    expect(tasks.some((t) => t.topicId === tenses.id)).toBe(false);
    // Every task keeps its "why this?" and the plan its own copy of the names.
    expect(tasks.every((t) => t.reason !== null)).toBe(true);
    expect(plan.topicNames.get(study[0]!.topicId!)).toBe("Idioms");
  });

  it("keeps one active plan per exam: a new one archives the old", async () => {
    const user = await makeUser();
    const syllabusId = await exam(user);
    const draftId = await generous(user, syllabusId);
    const first = await plans.generate(user, draftId, "ALL");
    const second = await plans.generate(user, draftId, "ALL");
    expect(second).toMatchObject({ ok: true, outcome: "PLAN" });
    const all = await prisma.studyPlan.findMany({
      orderBy: { createdAt: "asc" },
    });
    expect(all.map((p) => p.status)).toEqual(["ARCHIVED", "ACTIVE"]);
    expect((await plans.activeFor(user, syllabusId))?.id).toBe(
      (second as { planId: string }).planId,
    );
    expect(first).not.toEqual(second);
  });

  it("says honestly when the work doesn't fit, and can leave topics out to fit", async () => {
    const user = await makeUser();
    const syllabusId = await exam(user);
    const started = await plans.startDraft(user, syllabusId);
    const draftId = (started as { draftId: string }).draftId;
    const draft = (await plans.getDraft(user, draftId))!;
    await plans.saveDraft(user, draftId, {
      ...draft.data,
      examDate: null,
      targetDays: 7,
      minutesByWeekday: [60, 60, 60, 60, 60, 60, 60],
    });

    const tight = await plans.generate(user, draftId, "ALL");
    expect(tight).toMatchObject({ ok: true, outcome: "WARNING" });
    expect(await prisma.studyPlan.count()).toBe(0);
    const warning = (tight as { warning: { extraMinutesPerDay: number } })
      .warning;
    expect(warning.extraMinutesPerDay).toBeGreaterThan(0);

    const partial = await plans.generate(user, draftId, "PARTIAL");
    expect(partial).toMatchObject({ ok: true, outcome: "PLAN" });
    const plan = (await plans.get(
      user,
      (partial as { planId: string }).planId,
      30,
    ))!;
    expect(plan.leftOut.length).toBeGreaterThan(0);
    // The lightest topic goes first, and nothing left out appears in the plan.
    expect(plan.leftOut[0]!.topicName).toBe("Mughals");
    const planned = new Set(
      plan.days.flatMap((d) => d.tasks.map((t) => t.topicId)),
    );
    for (const topic of plan.leftOut)
      expect(planned.has(topic.topicId)).toBe(false);
  });

  it("enforces the active plan limit across exams", async () => {
    planLimit = 1;
    const user = await makeUser();
    const ldc = await exam(user, "LDC");
    const lgs = await exam(user, "LGS");
    expect(
      await plans.generate(user, await generous(user, ldc), "ALL"),
    ).toMatchObject({ ok: true });
    expect(
      await plans.generate(user, await generous(user, lgs), "ALL"),
    ).toMatchObject({ ok: false, code: "LIMIT" });
    // Re-planning the same exam is not a new plan.
    expect(
      await plans.generate(user, await generous(user, ldc), "ALL"),
    ).toMatchObject({ ok: true });
  });
});
