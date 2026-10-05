// Regenerates fixtures/plan-engine/*.input.json and *.expected.json.
//   pnpm fixtures:plan          write every fixture
// Review the diff before committing: an expected file changing means the engine's output
// changed, which must be intentional.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { addDays, toDay, weekdayOf } from "@/lib/plan-engine/dates";
import { generatePlan } from "@/lib/plan-engine/generate";
import { replan } from "@/lib/plan-engine/replan";
import type {
  PlanInput,
  PlanOutput,
  ReplanInput,
} from "@/lib/plan-engine/schemas";
import {
  everyDay,
  makeInput,
  makeSubject,
  simulateHistory,
  type Outcome,
} from "@/lib/plan-engine/testing";

const DIR = "fixtures/plan-engine";
const TODAY = "2026-10-05";

type Fixture =
  | { name: string; fn: "generatePlan"; input: PlanInput }
  | { name: string; fn: "replan"; input: ReplanInput };

const pscLdc = () => [
  makeSubject({
    id: "indian-constitution",
    topics: 7,
    intensity: "INTENSE",
    confidence: 2,
  }),
  makeSubject({ id: "kerala-geography", topics: 5, confidence: 3 }),
  makeSubject({
    id: "kerala-renaissance",
    topics: 5,
    intensity: "INTENSE",
    confidence: 2,
  }),
  makeSubject({ id: "general-science", topics: 6, confidence: 3 }),
  makeSubject({
    id: "quantitative-aptitude",
    topics: 6,
    confidence: 1,
    intensity: "INTENSE",
  }),
  makeSubject({ id: "english", topics: 4, intensity: "LIGHT", confidence: 4 }),
];

const twelveSubjects = () =>
  [
    "indian-constitution",
    "indian-history",
    "kerala-history",
    "kerala-renaissance",
    "indian-geography",
    "kerala-geography",
    "general-science",
    "current-affairs",
    "quantitative-aptitude",
    "mental-ability",
    "english",
    "malayalam",
  ].map((id, i) =>
    makeSubject({
      id,
      topics: 3 + (i % 3),
      intensity: (["LIGHT", "STEADY", "INTENSE"] as const)[i % 3],
      confidence: (i % 5) + 1,
      weight: (i % 4) + 2,
      difficulty: ((i * 2) % 4) + 1,
    }),
  );

const generated: Fixture[] = [
  {
    name: "30-day-steady",
    fn: "generatePlan",
    input: makeInput({ targetDays: 30, subjects: pscLdc().slice(1, 3) }),
  },
  {
    name: "60-day-default",
    fn: "generatePlan",
    input: makeInput({ targetDays: 60 }),
  },
  {
    name: "90-day-psc-ldc",
    fn: "generatePlan",
    input: makeInput({ targetDays: 90, subjects: pscLdc() }),
  },
  {
    name: "180-day-psc-ldc",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 180,
      subjects: pscLdc(),
      availability: {
        minutesByWeekday: [180, 90, 90, 90, 90, 90, 150],
        preferredWindows: ["MORNING", "NIGHT"],
      },
    }),
  },
  {
    name: "exam-date-wins",
    fn: "generatePlan",
    input: makeInput({
      examDate: "2026-12-14",
      targetDays: 200,
      subjects: pscLdc().slice(1, 4),
    }),
  },
  {
    name: "target-days-win",
    fn: "generatePlan",
    input: makeInput({
      examDate: "2027-06-01",
      targetDays: 45,
      subjects: pscLdc().slice(2, 5),
    }),
  },
  {
    name: "impossible-workload",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 20,
      availability: {
        minutesByWeekday: everyDay(45),
        preferredWindows: ["EVENING"],
      },
      subjects: pscLdc(),
    }),
  },
  {
    name: "tight-but-possible",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 50,
      availability: {
        minutesByWeekday: everyDay(75),
        preferredWindows: ["EVENING"],
      },
      subjects: pscLdc().slice(0, 3),
    }),
  },
  {
    name: "single-subject",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 45,
      subjects: [makeSubject({ id: "indian-constitution", topics: 10 })],
    }),
  },
  {
    name: "twelve-subjects",
    fn: "generatePlan",
    input: makeInput({ targetDays: 150, subjects: twelveSubjects() }),
  },
  {
    name: "weekend-only",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 120,
      availability: {
        minutesByWeekday: [240, 0, 0, 0, 0, 0, 240],
        preferredWindows: ["AFTERNOON"],
      },
      subjects: pscLdc().slice(0, 3),
    }),
  },
  {
    name: "weekdays-only",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 75,
      availability: {
        minutesByWeekday: [0, 90, 90, 90, 90, 90, 0],
        preferredWindows: ["NIGHT", "MORNING"],
      },
      subjects: pscLdc().slice(1, 4),
    }),
  },
  {
    name: "placement-warning",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 75,
      availability: {
        minutesByWeekday: [0, 90, 90, 90, 90, 90, 0],
        preferredWindows: ["NIGHT", "MORNING"],
      },
      subjects: pscLdc().slice(1, 5),
    }),
  },
  {
    name: "thirty-minutes-a-day",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 120,
      availability: {
        minutesByWeekday: everyDay(30),
        preferredWindows: ["NIGHT"],
      },
      subjects: [
        makeSubject({
          id: "kerala-geography",
          topics: 4,
          weight: 2,
          difficulty: 2,
        }),
        makeSubject({ id: "english", topics: 3, weight: 2, difficulty: 2 }),
      ],
    }),
  },
  {
    name: "beginner-90-days",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 90,
      beginnerMode: true,
      subjects: [
        makeSubject({
          id: "indian-constitution",
          topics: 6,
          confidence: 1,
          foundationalEvery: 2,
        }),
        makeSubject({
          id: "kerala-geography",
          topics: 5,
          confidence: 1,
          foundationalEvery: 3,
        }),
        makeSubject({
          id: "general-science",
          topics: 5,
          confidence: 1,
          foundationalEvery: 2,
        }),
      ],
    }),
  },
  {
    name: "beginner-30-days",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 30,
      beginnerMode: true,
      subjects: [
        makeSubject({
          id: "kerala-renaissance",
          topics: 4,
          confidence: 1,
          foundationalEvery: 2,
          weight: 2,
          difficulty: 2,
        }),
        makeSubject({
          id: "english",
          topics: 3,
          confidence: 1,
          foundationalEvery: 3,
          weight: 2,
          difficulty: 1,
        }),
      ],
    }),
  },
  {
    name: "mixed-intensities",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 90,
      subjects: [
        makeSubject({
          id: "light-subject",
          topics: 4,
          intensity: "LIGHT",
          weight: 3,
          difficulty: 3,
        }),
        makeSubject({
          id: "steady-subject",
          topics: 4,
          intensity: "STEADY",
          weight: 3,
          difficulty: 3,
        }),
        makeSubject({
          id: "intense-subject",
          topics: 4,
          intensity: "INTENSE",
          weight: 3,
          difficulty: 3,
        }),
      ],
    }),
  },
  {
    name: "all-low-confidence",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 100,
      subjects: pscLdc()
        .slice(0, 4)
        .map((s) => ({ ...s, confidence: 1 })),
    }),
  },
  {
    name: "all-high-confidence",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 40,
      subjects: pscLdc()
        .slice(0, 4)
        .map((s) => ({ ...s, confidence: 5 })),
    }),
  },
  {
    name: "uneven-week",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 70,
      availability: {
        minutesByWeekday: [300, 30, 120, 45, 120, 0, 200],
        preferredWindows: ["MORNING", "AFTERNOON"],
      },
      subjects: pscLdc().slice(0, 4),
    }),
  },
  {
    name: "five-day-sprint",
    fn: "generatePlan",
    input: makeInput({
      targetDays: 5,
      subjects: [
        makeSubject({
          id: "current-affairs",
          topics: 3,
          weight: 1,
          difficulty: 1,
          confidence: 4,
        }),
      ],
    }),
  },
];

/** A replan fixture: plan from `base`, simulate `days` of history with `decide`, replan. */
function replanFixture(
  name: string,
  base: PlanInput,
  days: number,
  decide: (
    t: PlanOutput["days"][number]["tasks"][number],
    day: number,
  ) => Outcome,
): Fixture {
  const first = generatePlan(base);
  if (first.kind !== "PLAN")
    throw new Error(`${name}: base input must produce a plan`);
  const today = addDays(base.today, days);
  return {
    name,
    fn: "replan",
    input: {
      ...base,
      today,
      targetDays: base.targetDays! - days,
      history: simulateHistory(first, today, decide),
      previousPlan: first,
    },
  };
}

const replanBase = makeInput({
  targetDays: 90,
  subjects: pscLdc().slice(0, 3),
});

const replans: Fixture[] = [
  replanFixture("replan-missed-week", replanBase, 7, () => ({ done: false })),
  replanFixture("replan-on-track", replanBase, 7, () => ({
    done: true,
    accuracy: 0.75,
  })),
  replanFixture("replan-half-done", replanBase, 14, (_t, day) => ({
    done: day % 2 === 0,
    accuracy: 0.7,
  })),
  replanFixture("replan-skipped-revisions", replanBase, 21, (t) => ({
    done: t.type !== "REVISION",
    accuracy: 0.8,
  })),
  replanFixture("replan-weak-scores", replanBase, 14, (t) => ({
    done: true,
    accuracy: t.subjectId === "kerala-geography" ? 0.3 : 0.9,
  })),
  replanFixture("replan-strong-scores", replanBase, 14, () => ({
    done: true,
    accuracy: 0.95,
  })),
  replanFixture("replan-weekend-slump", replanBase, 14, (t) => {
    const weekday = weekdayOf(toDay(t.date));
    return { done: weekday !== 0 && weekday !== 6, accuracy: 0.7 };
  }),
  replanFixture("replan-month-away", replanBase, 30, () => ({ done: false })),
  replanFixture(
    "replan-beginner-first-week",
    makeInput({
      targetDays: 60,
      beginnerMode: true,
      subjects: [
        makeSubject({
          id: "indian-constitution",
          topics: 4,
          confidence: 1,
          foundationalEvery: 2,
        }),
        makeSubject({
          id: "kerala-geography",
          topics: 4,
          confidence: 1,
          foundationalEvery: 2,
        }),
      ],
    }),
    7,
    (_t, day) => ({ done: day < 4, accuracy: 0.55 }),
  ),
];

export const fixtures: Fixture[] = [...generated, ...replans];

function run(fixture: Fixture) {
  return fixture.fn === "generatePlan"
    ? generatePlan(fixture.input)
    : replan(fixture.input);
}

mkdirSync(DIR, { recursive: true });
for (const file of readdirSync(DIR))
  if (file.endsWith(".json")) rmSync(join(DIR, file));
for (const fixture of fixtures) {
  const { name, ...input } = fixture;
  writeFileSync(
    join(DIR, `${name}.input.json`),
    `${JSON.stringify(input, null, 2)}\n`,
  );
  writeFileSync(
    join(DIR, `${name}.expected.json`),
    `${JSON.stringify(run(fixture), null, 2)}\n`,
  );
}
console.log(
  `Wrote ${fixtures.length} fixture pairs to ${DIR} (today ${TODAY}).`,
);
