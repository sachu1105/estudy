import { z } from "zod";

import { isValidIsoDate, toDay } from "./dates";

// Every engine boundary is parsed with zod (CLAUDE.md rule 11). Ids are plain strings here so
// fixtures stay readable; the app passes uuids.

export const isoDateSchema = z
  .string()
  .refine(isValidIsoDate, "Expected a real date as YYYY-MM-DD.");
const id = z.string().min(1).max(100);
const level = z.number().int().min(1).max(5);

export const intensitySchema = z.enum(["LIGHT", "STEADY", "INTENSE"]);
export const timeWindowSchema = z.enum([
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "NIGHT",
]);
export const taskTypeSchema = z.enum([
  "STUDY",
  "REVISION",
  "CHECK_TEST",
  "SECTION_MOCK",
  "FULL_MOCK",
  "CUSTOM",
]);

/** Why a topic's confidence changed at a re-plan. */
export const confidenceCauseSchema = z.enum([
  "HIGH_SCORE",
  "LOW_SCORE",
  "MISSED_REVISIONS",
]);
/** Why a revision touch beyond the standard 3, 10 and 30 days was added. */
export const extraTouchSchema = z.enum(["LOW_CONFIDENCE", "WEAK_CHECK_TEST"]);
export const overrideKindSchema = z.enum([
  "MOVE",
  "RESIZE",
  "LOCK",
  "CUSTOM",
  "TOPIC_DONE",
]);

export const topicSchema = z.object({
  id,
  name: z.string().min(1).max(200),
  weight: level,
  difficulty: level,
  foundational: z.boolean().default(false),
  order: z.number().int().min(0),
});

/**
 * Where the user put the subject on the exam board. STUDYING gets study time before
 * TO_STUDY; TO_STUDY subjects start in the order given. REVISING has no study left, only
 * revision touches. DONE gets only the later, lighter touches and no section mock.
 */
export const subjectStageSchema = z.enum([
  "TO_STUDY",
  "STUDYING",
  "REVISING",
  "DONE",
]);

export const subjectSchema = z.object({
  id,
  name: z.string().min(1).max(200),
  intensity: intensitySchema,
  confidence: level,
  stage: subjectStageSchema.default("TO_STUDY"),
  topics: z.array(topicSchema).min(1).max(300),
});

export const availabilitySchema = z.object({
  /** Minutes available on each weekday, Sunday first. */
  minutesByWeekday: z.array(z.number().int().min(0).max(960)).length(7),
  /** In the user's order of preference; the earliest window goes to weak topics. */
  preferredWindows: z.array(timeWindowSchema).min(1).max(4),
});

/** What is already done for a topic. Built by replan() from the history logs. */
export const topicProgressSchema = z.object({
  topicId: id,
  studyMinutesDone: z.number().int().min(0),
  studiedOn: isoDateSchema.nullable(),
  revisionsDone: z.number().int().min(0),
  lastRevisedOn: isoDateSchema.nullable(),
});

/** Per-topic overrides computed by replan(): new confidence, and an extra touch for weak topics. */
export const topicAdjustmentSchema = z.object({
  topicId: id,
  confidence: level,
  extraRevision: z.boolean(),
  causes: z.array(confidenceCauseSchema).default([]),
});

/**
 * A user's hand edit (CLAUDE.md rule 14). MOVE, RESIZE, LOCK and CUSTOM pin one task: the
 * engine places it exactly as given and plans everything else around it. A pinned STUDY
 * always brings its CHECK_TEST along. Pins dated outside the horizon, or naming a topic or
 * subject that no longer exists, are ignored.
 */
export const pinOverrideSchema = z.object({
  kind: z.enum(["MOVE", "RESIZE", "LOCK", "CUSTOM"]),
  taskId: id,
  type: z.enum(["STUDY", "REVISION", "SECTION_MOCK", "FULL_MOCK", "CUSTOM"]),
  date: isoDateSchema,
  minutes: z.number().int().min(5).max(600),
  window: timeWindowSchema.optional(),
  subjectId: id.nullable().default(null),
  topicId: id.nullable().default(null),
  /** REVISION: which touch this is; the engine then skips its own copy of that touch. */
  touch: z.number().int().min(1).nullable().default(null),
  /** CUSTOM: the user's own label. */
  title: z.string().trim().min(1).max(120).nullable().default(null),
});

/** The user already knows this topic: no study, no check tests, no revisions. */
export const topicDoneOverrideSchema = z.object({
  kind: z.literal("TOPIC_DONE"),
  topicId: id,
});

export const planOverrideSchema = z
  .union([topicDoneOverrideSchema, pinOverrideSchema])
  .superRefine((o, ctx) => {
    if (o.kind === "TOPIC_DONE") return;
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", path: ["type"], message });
    if ((o.kind === "CUSTOM") !== (o.type === "CUSTOM"))
      issue("Custom overrides are custom tasks, and only they are.");
    if ((o.type === "STUDY" || o.type === "REVISION") && !o.topicId)
      issue("Study and revision tasks need a topic.");
    if (o.type === "SECTION_MOCK" && !o.subjectId)
      issue("A section mock needs a subject.");
    if (o.type === "CUSTOM" && !o.title) issue("A custom task needs a title.");
  });

const planInputBase = z.object({
  today: isoDateSchema,
  examDate: isoDateSchema.optional(),
  targetDays: z.number().int().min(1).max(730).optional(),
  availability: availabilitySchema,
  beginnerMode: z.boolean().default(false),
  subjects: z.array(subjectSchema).min(1).max(40),
  progress: z.array(topicProgressSchema).default([]),
  adjustments: z.array(topicAdjustmentSchema).default([]),
  completedSectionMocks: z.array(id).default([]),
  /**
   * First day of the whole study timeline, for re-plans. The final 15% review window is
   * measured on the full timeline, so it doesn't shift every week. Defaults to today.
   */
  timelineStart: isoDateSchema.optional(),
  /** Lead subjects of the two days before today, oldest first, so interleaving carries over. */
  recentLeads: z.array(id.nullable()).max(2).default([]),
  overrides: z.array(planOverrideSchema).max(2000).default([]),
});

type PlanInputShape = z.output<typeof planInputBase>;

function checkPlanInput(input: PlanInputShape, ctx: z.RefinementCtx) {
  if (!input.examDate && !input.targetDays) {
    ctx.addIssue({
      code: "custom",
      path: ["examDate"],
      message: "Give an exam date or a number of days.",
    });
  }
  if (input.timelineStart && toDay(input.timelineStart) > toDay(input.today)) {
    ctx.addIssue({
      code: "custom",
      path: ["timelineStart"],
      message: "The timeline can't start after today.",
    });
  }
  if (input.examDate && toDay(input.examDate) <= toDay(input.today)) {
    ctx.addIssue({
      code: "custom",
      path: ["examDate"],
      message: "The exam date must be after today.",
    });
  }
  const subjectIds = input.subjects.map((s) => s.id);
  const topicIds = input.subjects.flatMap((s) => s.topics.map((t) => t.id));
  if (new Set(subjectIds).size !== subjectIds.length) {
    ctx.addIssue({
      code: "custom",
      path: ["subjects"],
      message: "Subject ids must be unique.",
    });
  }
  if (new Set(topicIds).size !== topicIds.length) {
    ctx.addIssue({
      code: "custom",
      path: ["subjects"],
      message: "Topic ids must be unique.",
    });
  }
}

export const planInputSchema = planInputBase.superRefine(checkPlanInput);

/** The numbers behind a topic's study time: base minutes x intensity x confidence. */
export const minutesBreakdownSchema = z.object({
  weight: level,
  difficulty: level,
  baseMinutes: z.number().int().positive(),
  intensity: intensitySchema,
  intensityPct: z.number().int().positive(),
  /** What the user set for the subject. */
  subjectConfidence: level,
  /** What the plan used: differs after a re-plan moved it (see confidenceCauses). */
  confidence: level,
  confidencePct: z.number().int().positive(),
  confidenceCauses: z.array(confidenceCauseSchema),
  /** Total study time for the topic, before it is split into blocks. */
  topicMinutes: z.number().int().positive(),
});

/** "Why this?" for one task. Codes, not sentences, so the UI can translate them. */
export const taskReasonSchema = z.object({
  rule: z.enum([
    "STUDY_BLOCK",
    "CHECK_AFTER_STUDY",
    "SPACED_REVISION",
    "FINAL_REVIEW",
    "SECTION_COMPLETE",
    "FULL_MOCK",
    "USER_TASK",
  ]),
  /** Every task tied to a topic. */
  breakdown: minutesBreakdownSchema.nullable(),
  study: z
    .object({
      /** Longest block allowed that day: 60, or 25 in a beginner's first week. */
      blockCap: z.number().int().positive(),
      beginnerBlock: z.boolean(),
      /** Beginner mode put this foundational topic ahead of the rest. */
      foundationalFirst: z.boolean(),
    })
    .nullable(),
  revision: z
    .object({
      touch: z.number().int().min(1),
      /** Planned gap after studying: 1, 3, 6, 10 or 30 days. */
      gapDays: z.number().int().min(1),
      studiedOn: isoDateSchema,
      extra: extraTouchSchema.nullable(),
      /** The gap ran past the end of the plan, so the touch moved inside it. */
      clampedToEnd: z.boolean(),
      /**
       * Set when the topic had no study in the plan because the user put its subject in
       * Revising or Done on the board; the gap then counts from the day before the plan.
       */
      fromBoard: z.enum(["REVISING", "DONE"]).optional(),
    })
    .nullable(),
  /** Set when the user placed this task by hand. */
  override: z.object({ kind: overrideKindSchema }).nullable(),
});

export const planTaskSchema = z.object({
  id: z.string(),
  type: taskTypeSchema,
  date: isoDateSchema,
  subjectId: id.nullable(),
  topicId: id.nullable(),
  minutes: z.number().int().positive(),
  window: timeWindowSchema,
  /** STUDY only: which part of a topic split across blocks. */
  part: z
    .object({ index: z.number().int().min(1), total: z.number().int().min(1) })
    .nullable(),
  /** REVISION only: 1 for the first touch, 2 for the second... */
  touch: z.number().int().min(1).nullable(),
  /** Optional final-review revision in the last 15%; not counted as required work. */
  finalReview: z.boolean(),
  /** Placed by a user override; re-plans keep it exactly where it is. */
  pinned: z.boolean(),
  /** CUSTOM only: the user's label. */
  title: z.string().nullable(),
  reason: taskReasonSchema,
});

export const planDaySchema = z.object({
  date: isoDateSchema,
  weekday: z.number().int().min(0).max(6),
  phase: z.enum(["LEARN", "REVIEW"]),
  capacityMinutes: z.number().int().min(0),
  plannedMinutes: z.number().int().min(0),
  /** Subject of the day's first STUDY block, or null when the day has none. */
  leadSubjectId: id.nullable(),
  tasks: z.array(planTaskSchema),
});

export const planOutputSchema = z.object({
  kind: z.literal("PLAN"),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  /** First day of the whole timeline (earlier than startDate after a re-plan). */
  timelineStartDate: isoDateSchema,
  horizonDays: z.number().int().min(1),
  reviewStartDate: isoDateSchema.nullable(),
  availableMinutes: z.number().int().min(0),
  requiredMinutes: z.number().int().min(0),
  plannedMinutes: z.number().int().min(0),
  coveragePercent: z.literal(100),
  droppedTouches: z.number().int().min(0),
  days: z.array(planDaySchema),
});

export const coverageWarningSchema = z.object({
  kind: z.literal("COVERAGE_WARNING"),
  /** WORKLOAD: not enough minutes in total. PLACEMENT: enough minutes, but not where they're needed. */
  reason: z.enum(["WORKLOAD", "PLACEMENT"]),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  horizonDays: z.number().int().min(1),
  availableMinutes: z.number().int().min(0),
  requiredMinutes: z.number().int().min(0),
  projectedCoveragePercent: z.number().int().min(0).max(99),
  extraMinutesPerDay: z.number().int().min(1),
});

/** One completed log entry (StudySession / TaskCompletion / TestAttempt). Only done work appears. */
export const completedWorkSchema = z.object({
  date: isoDateSchema,
  type: taskTypeSchema,
  subjectId: id.nullable(),
  topicId: id.nullable(),
  minutes: z.number().int().min(0),
  /** CHECK_TEST and mocks: fraction correct, 0-1. */
  accuracy: z.number().min(0).max(1).nullable(),
});

/** replan(input & { history }): the plan input plus what actually happened. */
export const replanInputSchema = planInputBase
  .extend({
    history: z.array(completedWorkSchema).default([]),
    previousPlan: planOutputSchema.optional(),
  })
  .superRefine(checkPlanInput);

export const replanDiffSchema = z.object({
  windowStart: isoDateSchema.nullable(),
  windowEnd: isoDateSchema,
  minutesPlanned: z.number().int().min(0),
  minutesDone: z.number().int().min(0),
  topicsMoved: z.array(
    z.object({ topicId: id, from: isoDateSchema, to: isoDateSchema }),
  ),
  touchesAdded: z.array(
    z.object({ topicId: id, count: z.number().int().positive() }),
  ),
  touchesDropped: z.array(
    z.object({ topicId: id, count: z.number().int().positive() }),
  ),
  weakTopicIds: z.array(id),
  coverageBefore: z.number().int().min(0).max(100).nullable(),
  coverageAfter: z.number().int().min(0).max(100),
});

export type TimeWindow = z.infer<typeof timeWindowSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type SubjectStage = z.infer<typeof subjectStageSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type TopicProgress = z.infer<typeof topicProgressSchema>;
export type TopicAdjustment = z.infer<typeof topicAdjustmentSchema>;
export type ConfidenceCause = z.infer<typeof confidenceCauseSchema>;
export type ExtraTouch = z.infer<typeof extraTouchSchema>;
export type PlanOverride = z.input<typeof planOverrideSchema>;
export type ParsedPlanOverride = z.output<typeof planOverrideSchema>;
export type PinOverride = z.output<typeof pinOverrideSchema>;
export type MinutesBreakdown = z.infer<typeof minutesBreakdownSchema>;
export type TaskReason = z.infer<typeof taskReasonSchema>;
export type PlanInput = z.input<typeof planInputSchema>;
export type ParsedPlanInput = z.output<typeof planInputSchema>;
export type PlanTask = z.infer<typeof planTaskSchema>;
export type PlanDay = z.infer<typeof planDaySchema>;
export type PlanOutput = z.infer<typeof planOutputSchema>;
export type CoverageWarning = z.infer<typeof coverageWarningSchema>;
export type CompletedWork = z.infer<typeof completedWorkSchema>;
export type ReplanInput = z.input<typeof replanInputSchema>;
export type ParsedReplanInput = z.output<typeof replanInputSchema>;
export type ReplanDiff = z.infer<typeof replanDiffSchema>;
