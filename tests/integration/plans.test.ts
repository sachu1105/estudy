import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { dayCapacity } from "@/lib/plan-engine";
import type { EditableTree } from "@/lib/syllabus/tree";
import { prisma } from "@/server/db";
import { Prisma } from "@/server/db/generated/prisma/client";
import { redis } from "@/server/redis";
import { planRepository } from "@/server/repositories/plan-repository";
import { podRepository } from "@/server/repositories/pod-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";
import { createPlanService } from "@/server/services/plans/plan-service";
import { createPodService } from "@/server/services/pods/pod-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-06T04:30:00Z");
let planLimit = 3;
const plans = createPlanService({
  plans: planRepository,
  progress: progressRepository,
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
const addDaysIso = (iso: string, days: number) =>
  new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
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

  it("keeps study time on the user, so every exam's setup sees the same day", async () => {
    const user = await makeUser();
    const ldc = await exam(user, "LDC");
    const lgs = await exam(user, "LGS");
    const ldcDraft = (await plans.startDraft(user, ldc)) as { draftId: string };
    const week = [200, 90, 90, 90, 90, 90, 200];
    await plans.saveDraft(user, ldcDraft.draftId, {
      ...(await plans.getDraft(user, ldcDraft.draftId))!.data,
      minutesByWeekday: week,
      preferredWindows: ["NIGHT"],
    });

    // A setup opened afterwards starts from the time they already gave us...
    const lgsDraft = (await plans.startDraft(user, lgs)) as { draftId: string };
    const fresh = (await plans.getDraft(user, lgsDraft.draftId))!;
    expect(fresh.data.minutesByWeekday).toEqual(week);
    expect(fresh.data.preferredWindows).toEqual(["NIGHT"]);

    // ...and changing it there changes it for the first exam too.
    await plans.saveDraft(user, lgsDraft.draftId, {
      ...fresh.data,
      minutesByWeekday: [60, 60, 60, 60, 60, 60, 60],
    });
    const reopened = (await plans.getDraft(user, ldcDraft.draftId))!;
    expect(reopened.data.minutesByWeekday).toEqual([
      60, 60, 60, 60, 60, 60, 60,
    ]);
    // The per-exam settings are untouched by a shared edit.
    expect(reopened.data.targetDays).toBe(90);
  });

  it("falls back to the default day until the user sets one", async () => {
    const user = await makeUser();
    const started = (await plans.startDraft(user, await exam(user))) as {
      draftId: string;
    };
    const draft = (await plans.getDraft(user, started.draftId))!;
    expect(draft.data.minutesByWeekday).toEqual([
      180, 120, 120, 120, 120, 120, 180,
    ]);
  });

  /** Two exams, each with a plan. Returns their syllabus ids. */
  async function twoPlannedExams(user: User) {
    const ldc = await exam(user, "LDC");
    const lgs = await exam(user, "LGS");
    for (const id of [ldc, lgs]) {
      const made = await plans.generate(user, await generous(user, id), "ALL");
      if (!made.ok) throw new Error(made.message);
    }
    return { ldc, lgs };
  }

  /** Minutes planned on each of the first `days` days, across every active plan. */
  async function plannedPerDay(user: User, days = 7) {
    const rows = await prisma.planDay.findMany({
      where: { plan: { userId: user.id, status: "ACTIVE" } },
      orderBy: { date: "asc" },
      select: { date: true, plannedMinutes: true, capacityMinutes: true },
    });
    const byDate = new Map<string, number>();
    for (const r of rows) {
      const key = r.date.toISOString().slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) + r.capacityMinutes);
    }
    return [...byDate.entries()].slice(0, days);
  }

  it("two exams share one day instead of booking it twice", async () => {
    const user = await makeUser();
    const ldc = await exam(user, "LDC");

    // One exam: the whole 120-minute day is its own.
    await plans.generate(user, await generous(user, ldc), "ALL");
    const alone = await plannedPerDay(user);
    expect(alone.length).toBeGreaterThan(0);
    for (const [, capacity] of alone) expect(capacity).toBe(dayCapacity(120));

    // A second exam: the day is divided, never doubled.
    const lgs = await exam(user, "LGS");
    await plans.generate(user, await generous(user, lgs), "ALL");
    const shared = await plannedPerDay(user);
    for (const [date, capacity] of shared) {
      // 120 split 70/30 is 85/35; each plan buffers its own slice, so the total sits at or
      // just under what one plan would have had.
      expect(capacity, date).toBeLessThanOrEqual(dayCapacity(120));
      expect(capacity, date).toBeGreaterThan(dayCapacity(120) - 5);
    }

    // And each plan records the share it was built with.
    const built = await prisma.studyPlan.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: { syllabusVersionId: true, sharePercent: true, role: true },
    });
    expect(built.map((p) => p.sharePercent).sort()).toEqual([30, 70]);
    expect(built.filter((p) => p.role === "FOCUS")).toHaveLength(1);
  });

  it("hands the time back when an exam is paused", async () => {
    const user = await makeUser();
    const { ldc } = await twoPlannedExams(user);
    const shared = await plannedPerDay(user);
    await plans.pause(user, ldc);
    const alone = await plannedPerDay(user);
    // One exam was taking 30% of every day; paused, the other gets it back.
    expect(alone[0][1]).toBeGreaterThan(shared[0][1] * 0.6);
    expect(alone[0][1]).toBe(dayCapacity(120));
  });

  it("only the exam the user acted on announces a re-plan", async () => {
    const user = await makeUser();
    const { ldc, lgs } = await twoPlannedExams(user);
    await prisma.studyPlan.updateMany({
      where: { userId: user.id },
      data: { replanDiff: Prisma.DbNull },
    });

    await plans.setRole(user, lgs, "FOCUS");

    const active = await prisma.studyPlan.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: { syllabusVersionId: true, replanDiff: true },
    });
    // Both were re-planned, because the shares moved for both...
    expect(active).toHaveLength(2);
    // ...but only the one the user touched gets a card on Today.
    expect(
      active.find((p) => p.syllabusVersionId === lgs)!.replanDiff,
    ).not.toBeNull();
    expect(
      active.find((p) => p.syllabusVersionId === ldc)!.replanDiff,
    ).toBeNull();
  });

  it("gives one exam the focus and lets the user hand it over", async () => {
    const user = await makeUser();
    const { ldc, lgs } = await twoPlannedExams(user);

    // Both end on the same day here, so the first planned leads; either way exactly one does.
    const before = await plans.roles(user);
    expect(before.filter((e) => e.role === "FOCUS")).toHaveLength(1);

    expect(await plans.setRole(user, lgs, "FOCUS")).toMatchObject({ ok: true });
    const after = await plans.roles(user);
    expect(after.find((e) => e.examId === lgs)!.role).toBe("FOCUS");
    expect(after.find((e) => e.examId === ldc)!.role).toBe("ALONGSIDE");
    expect(after[0].examId).toBe(lgs);
  });

  it("pausing lifts an exam off the day and hands the focus on", async () => {
    const user = await makeUser();
    const { ldc, lgs } = await twoPlannedExams(user);
    await plans.setRole(user, ldc, "FOCUS");

    expect(await plans.pause(user, ldc)).toMatchObject({ ok: true });
    const roles = await plans.roles(user);
    expect(roles.find((e) => e.examId === ldc)!.role).toBe("PAUSED");
    // Someone has to lead, so the other exam takes it over.
    expect(roles.find((e) => e.examId === lgs)!.role).toBe("FOCUS");

    // The plan and everything logged against it stay; it is simply no longer active.
    const active = await plans.listActive(user);
    expect(active.map((p) => p.syllabusVersionId)).toEqual([lgs]);
    expect(
      await prisma.studyPlan.count({
        where: { userId: user.id, syllabusVersionId: ldc, status: "PAUSED" },
      }),
    ).toBe(1);
    expect(
      await prisma.planTask.count({
        where: { plan: { syllabusVersionId: ldc } },
      }),
    ).toBeGreaterThan(0);
  });

  it("a pause does not eat the days left to learn in", async () => {
    const user = await makeUser();
    const ldc = await exam(user, "LDC");
    const made = await plans.generate(user, await generous(user, ldc), "ALL");
    expect(made).toMatchObject({ ok: true });
    const timelineOf = async (status: "ACTIVE" | "PAUSED") => {
      const row = await prisma.studyPlan.findFirstOrThrow({
        where: { userId: user.id, syllabusVersionId: ldc, status },
      });
      return row.inputs as unknown as {
        today: string;
        timelineStart?: string;
      };
    };
    const before = await timelineOf("ACTIVE");
    const started = before.timelineStart ?? before.today;

    await plans.pause(user, ldc);
    clock.advance(20 * 24 * 60 * 60 * 1000);
    expect(await plans.resume(user, ldc)).toMatchObject({ ok: true });
    clock.set("2026-10-06T04:30:00Z");

    const after = await timelineOf("ACTIVE");
    // The 20 days paused move the timeline, so the final review window is still measured
    // against the study time the user actually had, not the calendar.
    expect(after.timelineStart).toBe(addDaysIso(started, 20));
    expect((await plans.roles(user)).find((e) => e.examId === ldc)!.role).toBe(
      "FOCUS",
    );
  });

  it("pausing is not a way around the active plan limit", async () => {
    planLimit = 1;
    const user = await makeUser();
    const ldc = await exam(user, "LDC");
    const lgs = await exam(user, "LGS");
    expect(
      await plans.generate(user, await generous(user, ldc), "ALL"),
    ).toMatchObject({ ok: true });
    await plans.pause(user, ldc);
    expect(
      await plans.generate(user, await generous(user, lgs), "ALL"),
    ).toMatchObject({ ok: true });
    // Both active would be two plans on a one-plan allowance.
    expect(await plans.resume(user, ldc)).toMatchObject({
      ok: false,
      code: "LIMIT",
    });
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
