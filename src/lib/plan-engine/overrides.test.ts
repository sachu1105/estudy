import { describe, expect, it } from "vitest";

import { addDays, toDay } from "./dates";
import { generatePlan } from "./generate";
import { replan } from "./replan";
import type { PlanInput, PlanOutput, PlanOverride, PlanTask } from "./schemas";
import {
  assertPlanInvariants,
  makeInput,
  makeSubject,
  simulateHistory,
  tasksOf,
} from "./testing";

const base = makeInput({ targetDays: 90 });

function plan(input: PlanInput): PlanOutput {
  const result = generatePlan(input);
  if (result.kind !== "PLAN")
    throw new Error(`expected a plan, got ${JSON.stringify(result)}`);
  assertPlanInvariants(input, result);
  return result;
}

/** What the UI stores when a user drags, resizes or locks a task. */
function pin(
  task: PlanTask,
  kind: "MOVE" | "RESIZE" | "LOCK",
  change: Partial<Pick<PlanTask, "date" | "minutes">> = {},
): PlanOverride {
  return {
    kind,
    taskId: task.id,
    type: task.type as "STUDY",
    date: change.date ?? task.date,
    minutes: change.minutes ?? task.minutes,
    window: task.window,
    subjectId: task.subjectId,
    topicId: task.topicId,
    touch: task.touch,
  };
}

const find = (p: PlanOutput, id: string) => tasksOf(p).find((t) => t.id === id);
const comparable = (t: PlanTask | undefined) =>
  t && { id: t.id, date: t.date, minutes: t.minutes, type: t.type };

describe("reasons", () => {
  it("gives every task a complete reason object", () => {
    const p = plan(
      makeInput({
        targetDays: 120,
        beginnerMode: true, // the app also starts every subject at confidence 1
        subjects: [
          makeSubject({ id: "constitution", topics: 6, confidence: 1 }),
          makeSubject({ id: "geography", topics: 5, confidence: 1 }),
        ],
      }),
    );
    // assertPlanInvariants checks each task; spot-check the numbers here.
    const study = tasksOf(p).find((t) => t.type === "STUDY")!;
    const b = study.reason.breakdown!;
    expect(b.topicMinutes).toBe(
      Math.floor(
        (2 * b.baseMinutes * b.intensityPct * b.confidencePct + 50_000) /
          100_000,
      ) * 5,
    );
    expect(study.reason.study).toMatchObject({
      blockCap: 25,
      beginnerBlock: true,
    });
    const revision = tasksOf(p).find(
      (t) => t.type === "REVISION" && !t.finalReview,
    )!;
    expect(revision.reason.revision).toMatchObject({
      touch: revision.touch,
      extra: "LOW_CONFIDENCE", // beginner mode starts every subject at confidence 1
      gapDays: 1,
    });
    expect(
      toDay(revision.date) - toDay(revision.reason.revision!.studiedOn),
    ).toBeGreaterThanOrEqual(revision.reason.revision!.gapDays);
  });

  it("explains a weak topic's extra touch and lowered confidence after replan", () => {
    const input = makeInput({
      targetDays: 90,
      subjects: [
        makeSubject({ id: "a", topics: 3, weight: 3, difficulty: 3 }),
        makeSubject({ id: "b", topics: 3, weight: 3, difficulty: 3 }),
      ],
    });
    const first = plan(input);
    const today = addDays(input.today, 12);
    const history = simulateHistory(first, today, (t) => ({
      done: true,
      accuracy: t.topicId === "a-t1" ? 0.2 : 0.75,
    }));
    const { plan: next, adjustments } = replan({
      ...input,
      today,
      targetDays: 78,
      history,
      previousPlan: first,
    });
    if (next.kind !== "PLAN") throw new Error("expected a plan");
    expect(adjustments.find((a) => a.topicId === "a-t1")?.causes).toEqual([
      "LOW_SCORE",
    ]);
    const extra = tasksOf(next).find(
      (t) => t.topicId === "a-t1" && t.reason.revision?.extra,
    );
    expect(extra?.reason.revision?.extra).toBe("WEAK_CHECK_TEST");
    expect(extra?.reason.breakdown).toMatchObject({
      subjectConfidence: 3,
      confidence: 2,
      confidenceCauses: ["LOW_SCORE"],
    });
  });
});

describe("overrides", () => {
  it("places a moved study block on its new day with its check test", () => {
    const first = plan(base);
    const study = tasksOf(first).find(
      (t) => t.type === "STUDY" && t.part!.total === 1,
    )!;
    const date = addDays(study.date, 3);
    const p = plan({ ...base, overrides: [pin(study, "MOVE", { date })] });
    const moved = find(p, study.id)!;
    expect(moved).toMatchObject({ date, pinned: true, minutes: study.minutes });
    expect(moved.reason.override).toEqual({ kind: "MOVE" });
    const day = p.days.find((d) => d.date === date)!;
    const i = day.tasks.findIndex((t) => t.id === study.id);
    expect(day.tasks[i + 1]).toMatchObject({
      type: "CHECK_TEST",
      topicId: study.topicId,
      pinned: true,
    });
    // No second copy of the topic's study.
    expect(
      tasksOf(p).filter((t) => t.type === "STUDY" && t.topicId === study.topicId),
    ).toHaveLength(1);
    // Revisions start after the moved block.
    for (const t of tasksOf(p))
      if (t.type === "REVISION" && t.topicId === study.topicId)
        expect(toDay(t.date)).toBeGreaterThan(toDay(date));
  });

  it("schedules only the rest of a topic around a resized block", () => {
    const input = makeInput({
      targetDays: 60,
      subjects: [
        makeSubject({ id: "only", topics: 3, weight: 2, difficulty: 2 }),
        makeSubject({ id: "other", topics: 3 }),
      ],
    });
    const first = plan(input);
    const study = tasksOf(first).find((t) => t.type === "STUDY")!;
    const total = study.reason.breakdown!.topicMinutes;
    const p = plan({
      ...input,
      overrides: [pin(study, "RESIZE", { minutes: 20 })],
    });
    const studied = tasksOf(p)
      .filter((t) => t.type === "STUDY" && t.topicId === study.topicId)
      .reduce((n, t) => n + t.minutes, 0);
    expect(find(p, study.id)?.minutes).toBe(20);
    expect(studied).toBe(Math.max(total, 20 + 15));
  });

  it("keeps locked and moved overrides unchanged through a replan", () => {
    const first = plan(base);
    const later = (days: number) => toDay(base.today) + days;
    const study = tasksOf(first).find(
      (t) => t.type === "STUDY" && toDay(t.date) > later(14),
    )!;
    const revision = tasksOf(first).find(
      (t) =>
        t.type === "REVISION" && !t.finalReview && toDay(t.date) > later(20),
    )!;
    const mock = tasksOf(first).find((t) => t.type === "FULL_MOCK")!;
    const overrides: PlanOverride[] = [
      pin(study, "MOVE", { date: addDays(study.date, 2) }),
      pin(revision, "LOCK"),
      pin(mock, "MOVE", { date: addDays(mock.date, -1) }),
      {
        kind: "CUSTOM",
        taskId: "custom-1",
        type: "CUSTOM",
        date: addDays(base.today, 30),
        minutes: 45,
        title: "Previous year paper",
      },
    ];
    const withPins = plan({ ...base, overrides });
    const today = addDays(base.today, 7);
    const history = simulateHistory(withPins, today, (_t, day) => ({
      done: day % 3 !== 0,
    }));
    const args = { ...base, today, targetDays: 83, overrides };
    const { plan: next } = replan({ ...args, history, previousPlan: withPins });
    if (next.kind !== "PLAN") throw new Error("expected a plan");
    assertPlanInvariants(args, next);

    for (const o of overrides) {
      if (o.kind === "TOPIC_DONE") continue;
      expect(comparable(find(next, o.taskId))).toEqual(
        comparable(find(withPins, o.taskId)),
      );
      expect(find(next, o.taskId)?.pinned).toBe(true);
    }
    expect(find(next, "custom-1")?.title).toBe("Previous year paper");
    // The engine's own copy of the locked touch is gone.
    expect(
      tasksOf(next).filter(
        (t) =>
          t.type === "REVISION" &&
          t.topicId === revision.topicId &&
          t.touch === revision.touch,
      ),
    ).toHaveLength(1);
  });

  it("drops pins that fall before today or outside the horizon", () => {
    const first = plan(base);
    const study = tasksOf(first).find((t) => t.type === "STUDY")!;
    const today = addDays(base.today, 5);
    const p = plan({
      ...base,
      today,
      targetDays: 85,
      overrides: [pin(study, "LOCK"), pin(study, "MOVE", { date: "2030-01-01" })],
    });
    expect(find(p, study.id)?.pinned ?? false).toBe(false);
  });

  it("schedules nothing for a topic marked as already done", () => {
    const p = plan({
      ...base,
      overrides: [{ kind: "TOPIC_DONE", topicId: "geography-t2" }],
    });
    expect(tasksOf(p).some((t) => t.topicId === "geography-t2")).toBe(false);
    expect(tasksOf(p).some((t) => t.topicId === "geography-t1")).toBe(true);
  });

  it("rejects malformed overrides", () => {
    expect(() =>
      generatePlan({
        ...base,
        overrides: [
          {
            kind: "MOVE",
            taskId: "x",
            type: "STUDY",
            date: base.today,
            minutes: 30,
          },
        ],
      }),
    ).toThrow(/need a topic/);
    expect(() =>
      generatePlan({
        ...base,
        overrides: [
          {
            kind: "CUSTOM",
            taskId: "x",
            type: "CUSTOM",
            date: base.today,
            minutes: 30,
          },
        ],
      }),
    ).toThrow(/title/);
  });

  it("is deterministic with overrides", () => {
    const first = plan(base);
    const study = tasksOf(first).find((t) => t.type === "STUDY")!;
    const input = {
      ...base,
      overrides: [pin(study, "MOVE", { date: addDays(study.date, 4) })],
    };
    expect(JSON.stringify(generatePlan(input))).toBe(
      JSON.stringify(generatePlan(structuredClone(input))),
    );
  });
});
