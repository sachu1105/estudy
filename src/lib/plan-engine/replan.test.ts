import { describe, expect, it } from "vitest";

import { addDays, toDay } from "./dates";
import { generatePlan } from "./generate";
import { replan } from "./replan";
import type { PlanOutput } from "./schemas";
import {
  assertPlanInvariants,
  makeInput,
  makeSubject,
  minutesForTopics,
  simulateHistory,
  tasksOf,
} from "./testing";

const base = makeInput({ targetDays: 90 });

function firstPlan(input = base): PlanOutput {
  const result = generatePlan(input);
  if (result.kind !== "PLAN") throw new Error("expected a plan");
  return result;
}

function asPlan(result: ReturnType<typeof replan>["plan"]): PlanOutput {
  if (result.kind !== "PLAN")
    throw new Error(`expected a plan, got ${JSON.stringify(result)}`);
  return result;
}

describe("replan", () => {
  it("after a fully missed week returns a valid plan with zero overdue tasks", () => {
    const previousPlan = firstPlan();
    const today = addDays(base.today, 7);
    const { plan, diff } = replan({
      ...base,
      today,
      targetDays: 83,
      history: [],
      previousPlan,
    });
    const next = asPlan(plan);
    assertPlanInvariants({ ...base, today, targetDays: 83 }, next);

    expect(tasksOf(next).every((t) => toDay(t.date) >= toDay(today))).toBe(
      true,
    );
    expect(next.endDate).toBe(previousPlan.endDate);
    expect(diff.minutesDone).toBe(0);
    expect(diff.minutesPlanned).toBe(
      previousPlan.days.slice(0, 7).reduce((s, d) => s + d.plannedMinutes, 0),
    );
    expect(diff.topicsMoved.length).toBeGreaterThan(0);
    expect(diff.coverageBefore).toBeLessThan(100);
    expect(diff.coverageAfter).toBe(100);
  });

  it("does not re-study topics already finished, and keeps coverage at 100 when on track", () => {
    const previousPlan = firstPlan();
    const today = addDays(base.today, 10);
    const history = simulateHistory(previousPlan, today, () => ({
      done: true,
      accuracy: 0.75,
    }));
    const studiedTopics = new Set(
      history.filter((h) => h.type === "STUDY").map((h) => h.topicId),
    );
    const finished = [...studiedTopics].filter(
      (id) =>
        !tasksOf(previousPlan).some(
          (t) =>
            t.type === "STUDY" &&
            t.topicId === id &&
            toDay(t.date) >= toDay(today),
        ),
    );
    expect(finished.length).toBeGreaterThan(0);

    const { plan, diff } = replan({
      ...base,
      today,
      targetDays: 80,
      history,
      previousPlan,
    });
    const next = asPlan(plan);
    for (const id of finished) {
      expect(
        tasksOf(next).some((t) => t.type === "STUDY" && t.topicId === id),
      ).toBe(false);
      expect(
        tasksOf(next).some((t) => t.type === "REVISION" && t.topicId === id),
      ).toBe(true);
    }
    expect(diff.minutesDone).toBe(diff.minutesPlanned);
    expect(diff.coverageBefore).toBe(100);
  });

  it("continues a half-studied topic with only the remaining minutes", () => {
    const input = makeInput({
      targetDays: 60,
      subjects: [
        makeSubject({ id: "only", topics: 3, weight: 5, difficulty: 5 }),
      ],
    });
    const previousPlan = firstPlan(input);
    const firstPart = tasksOf(previousPlan).find(
      (t) => t.type === "STUDY" && t.part!.total > 1,
    )!;
    const today = addDays(firstPart.date, 1);
    const history = simulateHistory(previousPlan, today, (t) => ({
      done: t.id === firstPart.id,
    }));
    const next = asPlan(
      replan({
        ...input,
        today,
        targetDays: 60 - (toDay(today) - toDay(input.today)),
        history,
        previousPlan,
      }).plan,
    );
    const remaining = tasksOf(next).filter(
      (t) => t.type === "STUDY" && t.topicId === firstPart.topicId,
    );
    const total = tasksOf(previousPlan)
      .filter((t) => t.type === "STUDY" && t.topicId === firstPart.topicId)
      .reduce((s, t) => s + t.minutes, 0);
    expect(remaining.reduce((s, t) => s + t.minutes, 0)).toBe(
      total - firstPart.minutes,
    );
  });

  it("gives a topic scored at 20% more scheduled minutes than one scored at 90%", () => {
    const input = makeInput({
      targetDays: 90,
      subjects: [
        makeSubject({ id: "a", topics: 3, weight: 3, difficulty: 3 }),
        makeSubject({ id: "b", topics: 3, weight: 3, difficulty: 3 }),
      ],
    });
    const previousPlan = firstPlan(input);
    const today = addDays(input.today, 12);
    const scores: Record<string, number> = { "a-t1": 0.2, "b-t1": 0.9 };
    const history = simulateHistory(previousPlan, today, (t) => ({
      done: true,
      accuracy: scores[t.topicId ?? ""] ?? 0.75,
    }));
    expect(
      history.some((h) => h.topicId === "a-t1" && h.type === "CHECK_TEST"),
    ).toBe(true);
    expect(
      history.some((h) => h.topicId === "b-t1" && h.type === "CHECK_TEST"),
    ).toBe(true);

    const { plan, diff } = replan({
      ...input,
      today,
      targetDays: 78,
      history,
      previousPlan,
    });
    const next = asPlan(plan);
    expect(minutesForTopics(next, ["a-t1"])).toBeGreaterThan(
      minutesForTopics(next, ["b-t1"]),
    );
    expect(diff.weakTopicIds).toEqual(["a-t1"]);
    expect(
      diff.touchesAdded.find((t) => t.topicId === "a-t1")?.count,
    ).toBeGreaterThan(0);
  });

  it("collapses revisions missed while away into one touch, never two on the same day", () => {
    const previousPlan = firstPlan();
    const studyOnly = simulateHistory(
      previousPlan,
      addDays(base.today, 20),
      (t) => ({ done: t.type === "STUDY" || t.type === "CHECK_TEST" }),
    );
    const today = addDays(base.today, 20);
    const next = asPlan(
      replan({
        ...base,
        today,
        targetDays: 70,
        history: studyOnly,
        previousPlan,
      }).plan,
    );
    for (const day of next.days) {
      const revised = day.tasks
        .filter((t) => t.type === "REVISION")
        .map((t) => t.topicId);
      expect(new Set(revised).size).toBe(revised.length);
    }
  });

  it("does not repeat a section mock that was already taken", () => {
    const previousPlan = firstPlan();
    const mock = tasksOf(previousPlan).find((t) => t.type === "SECTION_MOCK")!;
    const today = addDays(mock.date, 1);
    const history = simulateHistory(previousPlan, today, () => ({
      done: true,
    }));
    const days = 90 - (toDay(today) - toDay(base.today));
    const next = asPlan(
      replan({ ...base, today, targetDays: days, history, previousPlan }).plan,
    );
    expect(
      tasksOf(next).some(
        (t) => t.type === "SECTION_MOCK" && t.subjectId === mock.subjectId,
      ),
    ).toBe(false);
  });

  it("is deterministic", () => {
    const previousPlan = firstPlan();
    const today = addDays(base.today, 9);
    const history = simulateHistory(previousPlan, today, (_t, day) => ({
      done: day % 2 === 0,
      accuracy: 0.5,
    }));
    const args = { ...base, today, targetDays: 81, history, previousPlan };
    expect(JSON.stringify(replan(args))).toBe(
      JSON.stringify(replan(structuredClone(args))),
    );
  });
});
