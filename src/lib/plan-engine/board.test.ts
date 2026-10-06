import { describe, expect, it } from "vitest";

import { addDays } from "./dates";
import { generatePlan } from "./generate";
import { replan } from "./replan";
import type { PlanInput, PlanOutput } from "./schemas";
import {
  assertPlanInvariants,
  everyDay,
  makeInput,
  makeSubject,
  tasksOf,
} from "./testing";

function plan(input: PlanInput): PlanOutput {
  const result = generatePlan(input);
  if (result.kind !== "PLAN")
    throw new Error(`Expected a plan, got ${JSON.stringify(result)}`);
  assertPlanInvariants(input, result);
  return result;
}

const firstStudyDay = (result: PlanOutput, subjectId: string) =>
  tasksOf(result).find((t) => t.type === "STUDY" && t.subjectId === subjectId)
    ?.date;

describe("the exam board", () => {
  it("leaves plans without stages exactly as before", () => {
    const input = makeInput({ targetDays: 60 });
    const withStages = {
      ...input,
      subjects: input.subjects.map((s) => ({
        ...s,
        stage: "TO_STUDY" as const,
      })),
    };
    expect(JSON.stringify(generatePlan(withStages))).toBe(
      JSON.stringify(generatePlan(input)),
    );
  });

  it("gives Studying subjects time before To study ones, wherever they're listed", () => {
    const result = plan(
      makeInput({
        targetDays: 90,
        availability: {
          minutesByWeekday: everyDay(120),
          preferredWindows: ["MORNING"],
        },
        subjects: [
          makeSubject({ id: "history", topics: 6 }),
          makeSubject({ id: "english", topics: 6, stage: "STUDYING" }),
        ],
      }),
    );
    expect(tasksOf(result).find((t) => t.type === "STUDY")!.subjectId).toBe(
      "english",
    );
    expect(
      firstStudyDay(result, "english")! < firstStudyDay(result, "history")!,
    ).toBe(true);
  });

  it("starts To study subjects in board order", () => {
    const result = plan(
      makeInput({
        targetDays: 90,
        subjects: [
          makeSubject({ id: "polity", topics: 4 }),
          makeSubject({ id: "maths", topics: 4 }),
        ],
      }),
    );
    expect(tasksOf(result).find((t) => t.type === "STUDY")!.subjectId).toBe(
      "polity",
    );
  });

  it("plans no study for Revising, only revision touches that say why", () => {
    const result = plan(
      makeInput({
        targetDays: 60,
        subjects: [
          makeSubject({ id: "history", topics: 4 }),
          makeSubject({ id: "english", topics: 3, stage: "REVISING" }),
        ],
      }),
    );
    const english = tasksOf(result).filter((t) => t.subjectId === "english");
    expect(english.some((t) => t.type === "STUDY")).toBe(false);
    const revisions = english.filter(
      (t) => t.type === "REVISION" && !t.finalReview,
    );
    expect(revisions.length).toBeGreaterThanOrEqual(3 * 3);
    for (const task of revisions)
      expect(task.reason.revision?.fromBoard).toBe("REVISING");
    // Studied the day before the plan: the first touch keeps its normal gap from then.
    const first = revisions[0]!;
    expect(first.reason.revision!.studiedOn).toBe(
      addDays(result.startDate, -1),
    );
    expect(first.date).toBe(
      addDays(first.reason.revision!.studiedOn, first.reason.revision!.gapDays),
    );
  });

  it("gives Done only the later, lighter touches and no section mock", () => {
    const input = (stage: "REVISING" | "DONE") =>
      makeInput({
        targetDays: 90,
        subjects: [
          makeSubject({ id: "history", topics: 4 }),
          makeSubject({ id: "english", topics: 3, stage }),
        ],
      });
    const touches = (result: PlanOutput) =>
      tasksOf(result).filter(
        (t) =>
          t.subjectId === "english" && t.type === "REVISION" && !t.finalReview,
      );
    const revising = plan(input("REVISING"));
    const done = plan(input("DONE"));
    expect(touches(done).length).toBeGreaterThan(0);
    expect(touches(done).length).toBeLessThan(touches(revising).length);
    for (const task of touches(done)) {
      expect(task.touch).toBeGreaterThanOrEqual(3);
      expect(task.reason.revision?.fromBoard).toBe("DONE");
    }
    expect(
      tasksOf(done).some(
        (t) => t.type === "SECTION_MOCK" && t.subjectId === "english",
      ),
    ).toBe(false);
  });

  it("keeps a Revising subject's spacing steady across weekly re-plans", () => {
    const input = makeInput({
      today: "2026-10-05",
      targetDays: 60,
      subjects: [
        makeSubject({ id: "history", topics: 4 }),
        makeSubject({ id: "english", topics: 2, stage: "REVISING" }),
      ],
    });
    const first = plan(input);
    const later = replan({
      ...input,
      today: "2026-10-12",
      timelineStart: "2026-10-05",
      targetDays: 53,
      history: [],
    });
    if (later.plan.kind !== "PLAN") throw new Error("expected a plan");
    const studiedOn = (p: PlanOutput) =>
      tasksOf(p).find((t) => t.subjectId === "english" && t.type === "REVISION")
        ?.reason.revision?.studiedOn;
    expect(studiedOn(later.plan)).toBe(studiedOn(first));
  });
});
