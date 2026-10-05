// Builders and invariant checks shared by the engine tests and the fixture generator.
// Not imported by app code.

import { toDay } from "./dates";
import { BEGINNER_BLOCK, BEGINNER_DAYS, dayCapacity } from "./minutes";
import type { PlanInput, PlanOutput, Subject } from "./schemas";

type SubjectSpec = {
  id: string;
  topics: number;
  intensity?: Subject["intensity"];
  confidence?: number;
  weight?: number;
  difficulty?: number;
  /** Every nth topic is foundational (1-based). */
  foundationalEvery?: number;
};

export function makeSubject(spec: SubjectSpec): Subject {
  return {
    id: spec.id,
    name: spec.id.replace(/-/g, " "),
    intensity: spec.intensity ?? "STEADY",
    confidence: spec.confidence ?? 3,
    topics: Array.from({ length: spec.topics }, (_, i) => ({
      id: `${spec.id}-t${i + 1}`,
      name: `${spec.id} topic ${i + 1}`,
      // Vary weight and difficulty deterministically unless pinned.
      weight: spec.weight ?? ((i * 2) % 5) + 1,
      difficulty: spec.difficulty ?? ((i * 3) % 5) + 1,
      foundational: spec.foundationalEvery
        ? (i + 1) % spec.foundationalEvery === 0
        : false,
      order: i,
    })),
  };
}

export const everyDay = (minutes: number) =>
  Array.from({ length: 7 }, () => minutes);

export function makeInput(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    today: "2026-10-05",
    targetDays: 60,
    availability: {
      minutesByWeekday: everyDay(120),
      preferredWindows: ["MORNING", "EVENING"],
    },
    beginnerMode: false,
    subjects: [
      makeSubject({ id: "constitution", topics: 6 }),
      makeSubject({ id: "geography", topics: 5 }),
      makeSubject({ id: "aptitude", topics: 6 }),
    ],
    ...overrides,
  };
}

/** Throws with a readable message on the first broken rule. Used on every generated plan. */
export function assertPlanInvariants(input: PlanInput, plan: PlanOutput) {
  const fail = (message: string): never => {
    throw new Error(`Plan invariant broken: ${message}`);
  };
  const start = toDay(plan.startDate);
  const end = toDay(plan.endDate);
  const reviewStart = plan.reviewStartDate
    ? toDay(plan.reviewStartDate)
    : end + 1;
  const subjectsByTopic = new Map(
    input.subjects.flatMap((s) => s.topics.map((t) => [t.id, s.id] as const)),
  );

  if (plan.days.length !== end - start + 1) fail("one PlanDay per horizon day");
  if (input.examDate && end >= toDay(input.examDate))
    fail("nothing on or after the exam date");
  if (start !== toDay(input.today)) fail("plan starts today");

  plan.days.forEach((day, index) => {
    const date = toDay(day.date);
    if (date !== start + index) fail(`days are consecutive (${day.date})`);
    const total = day.tasks.reduce((sum, t) => sum + t.minutes, 0);
    if (total !== day.plannedMinutes)
      fail(`plannedMinutes adds up on ${day.date}`);
    // The user may overfill a day by hand; the engine only fills what pins leave free.
    const pinnedTotal = day.tasks
      .filter((t) => t.pinned)
      .reduce((sum, t) => sum + t.minutes, 0);
    if (total - pinnedTotal > Math.max(0, day.capacityMinutes - pinnedTotal))
      fail(`over capacity on ${day.date}`);
    if (
      day.capacityMinutes !==
      dayCapacity(input.availability.minutesByWeekday[day.weekday])
    ) {
      fail(`capacity keeps the 10% buffer on ${day.date}`);
    }
    const firstStudy = day.tasks.find((t) => t.type === "STUDY");
    if ((firstStudy?.subjectId ?? null) !== day.leadSubjectId)
      fail(`lead subject on ${day.date}`);

    day.tasks.forEach((task, i) => {
      if (task.date !== day.date)
        fail(`task ${task.id} is filed under its own date`);
      if (task.topicId && subjectsByTopic.get(task.topicId) !== task.subjectId)
        fail(`subject of ${task.id}`);
      assertReason(task, fail);
      if (task.pinned) return; // the user's choice overrides phase and block rules
      if (
        date >= reviewStart &&
        task.type !== "REVISION" &&
        task.type !== "FULL_MOCK"
      ) {
        fail(
          `only revision and full mocks in the final 15% (${task.id} on ${day.date})`,
        );
      }
      if (task.type === "STUDY") {
        const next = day.tasks[i + 1];
        if (
          !next ||
          next.type !== "CHECK_TEST" ||
          next.topicId !== task.topicId
        ) {
          fail(`STUDY ${task.id} is followed by its CHECK_TEST`);
        }
        if (
          input.beginnerMode &&
          index < BEGINNER_DAYS &&
          task.minutes > BEGINNER_BLOCK
        ) {
          fail(`beginner blocks are ${BEGINNER_BLOCK} minutes in week one`);
        }
      }
      if (
        task.type === "SECTION_MOCK" &&
        input.beginnerMode &&
        index < BEGINNER_DAYS
      ) {
        fail("no section mock in a beginner's first week");
      }
    });
  });

  const ids = plan.days.flatMap((d) => d.tasks.map((t) => t.id));
  if (new Set(ids).size !== ids.length) fail("task ids are unique");
  assertInterleaving(plan);
}

type Task = PlanOutput["days"][number]["tasks"][number];

/** Every task explains itself (CLAUDE.md rule 14). */
export function assertReason(task: Task, fail: (message: string) => never) {
  const r = task.reason;
  const topicTask =
    task.type === "STUDY" ||
    task.type === "CHECK_TEST" ||
    task.type === "REVISION";
  if (topicTask !== (r.breakdown !== null))
    fail(`${task.id} has a minutes breakdown exactly when it is a topic task`);
  if (task.pinned !== (r.override !== null))
    fail(`${task.id} names its override exactly when pinned`);
  if (task.type === "STUDY" && !task.pinned && !r.study)
    fail(`${task.id} explains its block size`);
  const spaced =
    task.type === "REVISION" && !task.finalReview && !task.pinned;
  if (spaced !== (r.revision !== null))
    fail(`${task.id} explains its revision gap`);
  if (r.revision && r.revision.touch !== task.touch)
    fail(`${task.id} reason names its own touch`);
  const rules: Record<Task["type"], string> = {
    STUDY: "STUDY_BLOCK",
    CHECK_TEST: "CHECK_AFTER_STUDY",
    REVISION: task.finalReview ? "FINAL_REVIEW" : "SPACED_REVISION",
    SECTION_MOCK: "SECTION_COMPLETE",
    FULL_MOCK: "FULL_MOCK",
    CUSTOM: "USER_TASK",
  };
  if (r.rule !== rules[task.type]) fail(`${task.id} reason rule ${r.rule}`);
}

/**
 * No subject leads 3+ days in a row while another subject still has unstudied topics.
 * (With one subject left the rule cannot be met, so it is relaxed.)
 */
export function assertInterleaving(plan: PlanOutput) {
  const lastStudyIndex = new Map<string, number>();
  plan.days.forEach((day, index) =>
    day.tasks.forEach(
      (t) =>
        t.type === "STUDY" &&
        t.subjectId &&
        lastStudyIndex.set(t.subjectId, index),
    ),
  );
  for (let i = 2; i < plan.days.length; i++) {
    const lead = plan.days[i].leadSubjectId;
    const pinnedLead = [0, 1, 2].some((k) =>
      plan.days[i - k].tasks.some((t) => t.type === "STUDY" && t.pinned),
    );
    if (
      !lead ||
      pinnedLead ||
      plan.days[i - 1].leadSubjectId !== lead ||
      plan.days[i - 2].leadSubjectId !== lead
    )
      continue;
    const othersRemain = [...lastStudyIndex].some(
      ([subject, last]) => subject !== lead && last >= i,
    );
    if (othersRemain) {
      throw new Error(
        `Plan invariant broken: ${lead} leads 3 days in a row ending ${plan.days[i].date}`,
      );
    }
  }
}

export function tasksOf(plan: PlanOutput) {
  return plan.days.flatMap((d) => d.tasks);
}

export function minutesForTopics(plan: PlanOutput, topicIds: string[]) {
  const wanted = new Set(topicIds);
  return tasksOf(plan)
    .filter((t) => t.topicId && wanted.has(t.topicId) && !t.finalReview)
    .reduce((sum, t) => sum + t.minutes, 0);
}

/** What the simulated user did with one planned task. */
export type Outcome = { done: boolean; accuracy?: number };

/**
 * Turns a plan into the append-only history a real user would leave behind, for every task
 * dated before `untilDate`. `decide` says which tasks were done and how tests went.
 */
export function simulateHistory(
  plan: PlanOutput,
  untilDate: string,
  decide: (
    task: PlanOutput["days"][number]["tasks"][number],
    dayIndex: number,
  ) => Outcome,
) {
  const until = toDay(untilDate);
  return plan.days
    .filter((day) => toDay(day.date) < until)
    .flatMap((day, dayIndex) =>
      day.tasks.flatMap((task) => {
        const outcome = decide(task, dayIndex);
        if (!outcome.done) return [];
        const isTest =
          task.type === "CHECK_TEST" ||
          task.type === "SECTION_MOCK" ||
          task.type === "FULL_MOCK";
        return [
          {
            date: task.date,
            type: task.type,
            subjectId: task.subjectId,
            topicId: task.topicId,
            minutes: task.minutes,
            accuracy: isTest ? (outcome.accuracy ?? 0.75) : null,
          },
        ];
      }),
    );
}
