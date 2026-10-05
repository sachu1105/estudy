import { describe, expect, it } from "vitest";

import { addDays, toDay } from "./dates";
import { generatePlan } from "./generate";
import { dayCapacity } from "./minutes";
import type { PlanInput, PlanOutput } from "./schemas";
import {
  assertPlanInvariants,
  everyDay,
  makeInput,
  makeSubject,
  minutesForTopics,
  tasksOf,
} from "./testing";

function plan(input: PlanInput): PlanOutput {
  const result = generatePlan(input);
  if (result.kind !== "PLAN")
    throw new Error(`Expected a plan, got ${JSON.stringify(result)}`);
  assertPlanInvariants(input, result);
  return result;
}

describe("horizon", () => {
  it("ends at the earlier of the exam date and today + targetDays", () => {
    const byDays = plan(makeInput({ targetDays: 45, examDate: "2027-03-01" }));
    expect(byDays.endDate).toBe(addDays("2026-10-05", 44));
    const byExam = plan(makeInput({ targetDays: 365, examDate: "2026-12-20" }));
    expect(byExam.endDate).toBe("2026-12-19");
  });

  it("never schedules a task after the horizon, and every final revision falls inside it", () => {
    const result = plan(makeInput({ targetDays: 40 }));
    const end = toDay(result.endDate);
    for (const task of tasksOf(result))
      expect(toDay(task.date)).toBeLessThanOrEqual(end);
    const finals = tasksOf(result).filter((t) => t.type === "REVISION");
    expect(finals.length).toBeGreaterThan(0);
    expect(toDay(finals.at(-1)!.date)).toBeLessThanOrEqual(end);
  });

  it("keeps the final 15% for revision and full mocks only", () => {
    const result = plan(makeInput({ targetDays: 60 }));
    expect(result.reviewStartDate).toBe(addDays(result.startDate, 60 - 9));
    expect(tasksOf(result).some((t) => t.type === "FULL_MOCK")).toBe(true);
  });
});

describe("tasks", () => {
  it("follows every STUDY block with a CHECK_TEST for the same topic", () => {
    const result = plan(makeInput());
    const days = result.days.filter((d) =>
      d.tasks.some((t) => t.type === "STUDY"),
    );
    expect(days.length).toBeGreaterThan(5);
    for (const day of days) {
      day.tasks.forEach((task, i) => {
        if (task.type !== "STUDY") return;
        expect(day.tasks[i + 1]).toMatchObject({
          type: "CHECK_TEST",
          topicId: task.topicId,
        });
      });
    }
  });

  it("studies every topic in full exactly once", () => {
    const input = makeInput();
    const result = plan(input);
    for (const topic of input.subjects.flatMap((s) => s.topics)) {
      const studies = tasksOf(result).filter(
        (t) => t.type === "STUDY" && t.topicId === topic.id,
      );
      expect(studies.length).toBeGreaterThan(0);
      expect(studies.map((t) => t.part?.index)).toEqual(
        studies.map((_, i) => i + 1),
      );
    }
  });

  it("revises each topic at roughly 3, 10 and 30 days, with a 4th touch for confidence 1-2", () => {
    const input = makeInput({
      targetDays: 120,
      subjects: [
        makeSubject({ id: "weak", topics: 2, confidence: 1 }),
        makeSubject({ id: "ok", topics: 2, confidence: 3 }),
      ],
    });
    const result = plan(input);
    const touches = (topicId: string) =>
      tasksOf(result).filter(
        (t) => t.type === "REVISION" && !t.finalReview && t.topicId === topicId,
      );
    expect(touches("weak-t1")).toHaveLength(4);
    expect(touches("ok-t1")).toHaveLength(3);

    const studiedOn = toDay(
      tasksOf(result)
        .filter((t) => t.topicId === "ok-t1" && t.type === "STUDY")
        .at(-1)!.date,
    );
    const gaps = touches("ok-t1").map((t) => toDay(t.date) - studiedOn);
    expect(gaps[0]).toBeGreaterThanOrEqual(3);
    expect(gaps[1]).toBeGreaterThanOrEqual(10);
    expect(gaps[2]).toBeGreaterThanOrEqual(30);
  });

  it("gives low-confidence topics the user's earliest preferred window", () => {
    const input = makeInput({
      availability: {
        minutesByWeekday: everyDay(120),
        preferredWindows: ["EVENING", "MORNING"],
      },
      subjects: [
        makeSubject({ id: "weak", topics: 3, confidence: 2 }),
        makeSubject({ id: "strong", topics: 3, confidence: 4 }),
      ],
    });
    const result = plan(input);
    expect(
      new Set(
        tasksOf(result)
          .filter((t) => t.subjectId === "weak")
          .map((t) => t.window),
      ),
    ).toEqual(new Set(["MORNING"]));
    expect(
      new Set(
        tasksOf(result)
          .filter((t) => t.subjectId === "strong")
          .map((t) => t.window),
      ),
    ).toEqual(new Set(["EVENING"]));
  });

  it("adds a section mock the day after a subject's topics are studied and twice revised", () => {
    const result = plan(makeInput({ targetDays: 90 }));
    const mocks = tasksOf(result).filter((t) => t.type === "SECTION_MOCK");
    expect(mocks.map((m) => m.subjectId).sort()).toEqual([
      "aptitude",
      "constitution",
      "geography",
    ]);
    for (const mock of mocks) {
      const secondTouches = tasksOf(result).filter(
        (t) =>
          t.subjectId === mock.subjectId &&
          t.type === "REVISION" &&
          t.touch === 2,
      );
      const ready = Math.max(...secondTouches.map((t) => toDay(t.date)));
      expect(toDay(mock.date)).toBeGreaterThan(ready);
    }
  });
});

describe("interleaving", () => {
  it("never lets one subject lead 3+ consecutive days while others still have topics", () => {
    const input = makeInput({
      targetDays: 120,
      subjects: [
        makeSubject({ id: "big", topics: 20, weight: 5, difficulty: 5 }),
        makeSubject({ id: "small", topics: 4 }),
        makeSubject({ id: "medium", topics: 8 }),
      ],
    });
    plan(input); // assertPlanInvariants checks interleaving
  });
});

describe("short days", () => {
  it("still plans for someone with 30 minutes a day", () => {
    const input = makeInput({
      targetDays: 120,
      availability: {
        minutesByWeekday: everyDay(30),
        preferredWindows: ["NIGHT"],
      },
      subjects: [
        makeSubject({
          id: "constitution",
          topics: 4,
          weight: 2,
          difficulty: 2,
        }),
        makeSubject({ id: "geography", topics: 3, weight: 2, difficulty: 2 }),
      ],
    });
    const result = plan(input);
    expect(
      tasksOf(result)
        .filter((t) => t.type === "STUDY")
        .every((t) => t.minutes <= 15),
    ).toBe(true);
  });
});

describe("multipliers", () => {
  it("gives confidence-1 topics more total minutes than confidence-5 topics", () => {
    const input = makeInput({
      targetDays: 120,
      subjects: [
        makeSubject({
          id: "unsure",
          topics: 4,
          confidence: 1,
          weight: 3,
          difficulty: 3,
        }),
        makeSubject({
          id: "sure",
          topics: 4,
          confidence: 5,
          weight: 3,
          difficulty: 3,
        }),
      ],
    });
    const result = plan(input);
    const ids = (s: string) =>
      input.subjects.find((x) => x.id === s)!.topics.map((t) => t.id);
    expect(minutesForTopics(result, ids("unsure"))).toBeGreaterThan(
      minutesForTopics(result, ids("sure")),
    );
  });

  it("gives intense subjects more minutes than light ones at equal confidence", () => {
    const input = makeInput({
      targetDays: 120,
      subjects: [
        makeSubject({
          id: "intense",
          topics: 4,
          intensity: "INTENSE",
          weight: 3,
          difficulty: 3,
        }),
        makeSubject({
          id: "light",
          topics: 4,
          intensity: "LIGHT",
          weight: 3,
          difficulty: 3,
        }),
      ],
    });
    const result = plan(input);
    const ids = (s: string) =>
      input.subjects.find((x) => x.id === s)!.topics.map((t) => t.id);
    expect(minutesForTopics(result, ids("intense"))).toBeGreaterThan(
      minutesForTopics(result, ids("light")),
    );
  });
});

describe("coverage warning", () => {
  it("returns a warning for an impossible workload instead of compressing", () => {
    const input = makeInput({
      targetDays: 14,
      availability: {
        minutesByWeekday: everyDay(30),
        preferredWindows: ["NIGHT"],
      },
      subjects: [
        makeSubject({
          id: "huge",
          topics: 40,
          weight: 5,
          difficulty: 5,
          confidence: 1,
        }),
      ],
    });
    const result = generatePlan(input);
    expect(result.kind).toBe("COVERAGE_WARNING");
    if (result.kind !== "COVERAGE_WARNING") return;
    expect(result.reason).toBe("WORKLOAD");
    expect(result.projectedCoveragePercent).toBeLessThan(100);
    expect(result.requiredMinutes).toBeGreaterThan(result.availableMinutes);
    // Adding exactly the suggested minutes to every day covers the estimated deficit.
    const raisedCapacity =
      dayCapacity(30 + result.extraMinutesPerDay) * result.horizonDays;
    expect(raisedCapacity).toBeGreaterThanOrEqual(result.requiredMinutes);
  });

  it("warns when nobody has any time at all", () => {
    const result = generatePlan(
      makeInput({
        availability: {
          minutesByWeekday: everyDay(0),
          preferredWindows: ["MORNING"],
        },
      }),
    );
    expect(result).toMatchObject({
      kind: "COVERAGE_WARNING",
      projectedCoveragePercent: 0,
    });
  });
});

describe("beginner mode", () => {
  it("uses 25-minute blocks in week one, foundations first and no section mock", () => {
    const input = makeInput({
      beginnerMode: true,
      targetDays: 90,
      subjects: [
        makeSubject({
          id: "constitution",
          topics: 6,
          confidence: 1,
          foundationalEvery: 3,
        }),
        makeSubject({
          id: "geography",
          topics: 6,
          confidence: 1,
          foundationalEvery: 2,
        }),
      ],
    });
    const result = plan(input); // invariants check blocks and section mocks
    const firstStudyDay = new Map<string, number>();
    result.days.forEach((d, i) =>
      d.tasks.forEach(
        (t) =>
          t.type === "STUDY" &&
          !firstStudyDay.has(t.topicId!) &&
          firstStudyDay.set(t.topicId!, i),
      ),
    );
    // Within every subject, foundational topics are started before the rest.
    for (const subject of input.subjects) {
      const starts = (foundational: boolean) =>
        subject.topics
          .filter((t) => t.foundational === foundational)
          .map((t) => firstStudyDay.get(t.id)!);
      expect(Math.max(...starts(true))).toBeLessThanOrEqual(
        Math.min(...starts(false)),
      );
    }
    // Day one opens with a foundational topic.
    const firstTopic = result.days[0].tasks.find(
      (t) => t.type === "STUDY",
    )!.topicId!;
    expect(
      input.subjects.flatMap((s) => s.topics).find((t) => t.id === firstTopic)
        ?.foundational,
    ).toBe(true);
  });
});

describe("determinism", () => {
  it("produces byte-identical JSON for the same input", () => {
    const input = makeInput({ beginnerMode: true, targetDays: 75 });
    const a = JSON.stringify(generatePlan(input));
    const b = JSON.stringify(generatePlan(structuredClone(input)));
    expect(a).toBe(b);
  });

  it("does not depend on the order subjects arrive in beyond their listed order", () => {
    const input = makeInput();
    expect(JSON.stringify(generatePlan(input))).toBe(
      JSON.stringify(generatePlan(JSON.parse(JSON.stringify(input)))),
    );
  });
});

describe("validation", () => {
  it("rejects input without a horizon or with an exam in the past", () => {
    expect(() =>
      generatePlan({ ...makeInput(), targetDays: undefined }),
    ).toThrow(/exam date or a number of days/);
    expect(() => generatePlan(makeInput({ examDate: "2026-10-01" }))).toThrow(
      /after today/,
    );
  });
});
