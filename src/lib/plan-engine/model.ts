// Internal working model built from a validated PlanInput. Day indexes are relative to
// `today` (0 = today), so progress from the past has negative indexes.

import { toDay } from "./dates";
import {
  baseMinutes,
  CHECK_TEST_MINUTES,
  clampConfidence,
  CONFIDENCE_PCT,
  dayCapacity,
  INTENSITY_PCT,
  MIN_BLOCK,
  revisionMinutes,
  revisionSchedule,
  reviewDayCount,
  studyMinutes,
  type Confidence,
  type ExtraTouch,
} from "./minutes";
import type {
  MinutesBreakdown,
  ParsedPlanInput,
  PinOverride,
  SubjectStage,
  TaskReason,
  TaskType,
  TimeWindow,
} from "./schemas";

const WINDOW_ORDER: TimeWindow[] = ["MORNING", "AFTERNOON", "EVENING", "NIGHT"];

/** A task as the scheduler builds it, before dates are attached. */
export type DraftTask = {
  key: string;
  type: TaskType;
  subjectId: string | null;
  topicId: string | null;
  minutes: number;
  window: TimeWindow;
  touch: number | null;
  finalReview: boolean;
  pinned: boolean;
  title: string | null;
  reason: TaskReason;
};

export type ModelTopic = {
  id: string;
  subjectId: string;
  subjectIndex: number;
  /** Position in the subject's study order (beginner mode puts foundations first). */
  rank: number;
  weight: number;
  foundational: boolean;
  confidence: Confidence;
  window: TimeWindow;
  studyTotal: number;
  studyRemaining: number;
  /** Partly studied before today: continues first instead of waiting in the queue. */
  started: boolean;
  revMinutes: number;
  offsets: number[];
  /** Parallel to offsets: why each touch beyond the standard three exists. */
  extras: (ExtraTouch | null)[];
  breakdown: MinutesBreakdown;
  /** The user marked it as already known: nothing is scheduled for it. */
  skipped: boolean;
  /** Its subject sits in Revising or Done on the board: no study, revisions only. */
  fromBoard: "REVISING" | "DONE" | null;
  /** Minutes of STUDY the user pinned from today on, and the day of the last such pin. */
  pinnedStudyMinutes: number;
  pinnedStudyLastDay: number | null;
  /** Revision touches the user pinned: their numbers and days. */
  pinnedTouches: Set<number>;
  pinnedRevisionDays: number[];
  revisionsDone: number;
  studiedDay: number | null;
  lastRevisedDay: number | null;
};

export type ModelSubject = {
  id: string;
  index: number;
  stage: SubjectStage;
  window: TimeWindow;
  topics: ModelTopic[];
  sectionMockDone: boolean;
};

/** Reason for a task tied to a topic, with the topic's minutes breakdown filled in. */
export function topicReason(
  topic: ModelTopic,
  rule: TaskReason["rule"],
  extra: Partial<Pick<TaskReason, "study" | "revision" | "override">> = {},
): TaskReason {
  return {
    rule,
    breakdown: topic.breakdown,
    study: null,
    revision: null,
    override: null,
    ...extra,
  };
}

export function plainReason(
  rule: TaskReason["rule"],
  override: TaskReason["override"] = null,
): TaskReason {
  return { rule, breakdown: null, study: null, revision: null, override };
}

export type Model = {
  startDay: number;
  timelineStartDay: number;
  horizonDays: number;
  learnDays: number;
  /** The user's minutes per day after the 10% buffer. */
  dayCapacities: number[];
  /** What is left for the scheduler once pinned tasks are placed. */
  capacities: number[];
  /** Pinned tasks per day, placed first and never moved. */
  pinned: DraftTask[][];
  /** Ids of pinned tasks; scheduled tasks never reuse them. */
  pinnedKeys: Set<string>;
  beginner: boolean;
  defaultWindow: TimeWindow;
  /** Lead subjects of days -2 and -1. */
  recentLeads: (string | null)[];
  subjects: ModelSubject[];
};

export function horizonOf(input: ParsedPlanInput) {
  const start = toDay(input.today);
  const ends = [
    input.targetDays ? start + input.targetDays - 1 : Infinity,
    input.examDate ? toDay(input.examDate) - 1 : Infinity,
  ];
  return { start, end: Math.min(...ends) };
}

export function buildModel(input: ParsedPlanInput): Model {
  const { start, end } = horizonOf(input);
  const horizonDays = end - start + 1;
  const dayCapacities = Array.from({ length: horizonDays }, (_, i) => {
    const weekday = (((start + i + 4) % 7) + 7) % 7;
    return dayCapacity(input.availability.minutesByWeekday[weekday]);
  });

  const preferred = input.availability.preferredWindows;
  const earliest =
    WINDOW_ORDER.find((w) => preferred.includes(w)) ?? preferred[0];
  const windowFor = (confidence: number) =>
    confidence <= 2 ? earliest : preferred[0];

  const progress = new Map(input.progress.map((p) => [p.topicId, p]));
  const timelineStart = input.timelineStart ? toDay(input.timelineStart) : start;
  const adjustments = new Map(input.adjustments.map((a) => [a.topicId, a]));
  const relative = (iso: string | null) => (iso ? toDay(iso) - start : null);

  const skippedTopics = new Set(
    input.overrides.flatMap((o) =>
      o.kind === "TOPIC_DONE" ? [o.topicId] : [],
    ),
  );
  const topicSubject = new Map(
    input.subjects.flatMap((s) => s.topics.map((t) => [t.id, s.id] as const)),
  );
  const subjectIds = new Set(input.subjects.map((s) => s.id));
  // Pins inside the horizon whose topic or subject still exists; the first pin of an id wins.
  const seen = new Set<string>();
  const pins = input.overrides.filter((o): o is PinOverride => {
    if (o.kind === "TOPIC_DONE" || seen.has(o.taskId)) return false;
    const day = toDay(o.date);
    if (day < start || day > end) return false;
    if (o.topicId && !topicSubject.has(o.topicId)) return false;
    if (!o.topicId && o.subjectId && !subjectIds.has(o.subjectId)) return false;
    if (o.topicId && skippedTopics.has(o.topicId)) return false;
    seen.add(o.taskId);
    return true;
  });
  const pinsByTopic = new Map<string, PinOverride[]>();
  for (const pin of pins) {
    if (!pin.topicId) continue;
    pinsByTopic.set(pin.topicId, [
      ...(pinsByTopic.get(pin.topicId) ?? []),
      pin,
    ]);
  }

  const subjects = input.subjects.map((subject, subjectIndex): ModelSubject => {
    const ordered = [...subject.topics].sort((a, b) =>
      input.beginnerMode && a.foundational !== b.foundational
        ? a.foundational
          ? -1
          : 1
        : a.order - b.order,
    );
    const topics = ordered.map((topic, rank): ModelTopic => {
      const adjustment = adjustments.get(topic.id);
      const confidence = clampConfidence(
        adjustment?.confidence ?? subject.confidence,
      );
      const slots = revisionSchedule(
        confidence,
        adjustment?.extraRevision ?? false,
      );
      const total = studyMinutes(
        topic.weight,
        topic.difficulty,
        subject.intensity,
        confidence,
      );
      const skipped = skippedTopics.has(topic.id);
      const topicPins = pinsByTopic.get(topic.id) ?? [];
      const studyPins = topicPins.filter((p) => p.type === "STUDY");
      const revisionPins = topicPins.filter((p) => p.type === "REVISION");
      const pinnedStudyMinutes = studyPins.reduce((n, p) => n + p.minutes, 0);
      const done = progress.get(topic.id);
      // Revising or Done on the board: studied before the plan began. The day before the
      // timeline starts is a fixed anchor, so weekly re-plans keep the same spacing.
      const fromBoard =
        !skipped &&
        !done?.studiedOn &&
        (subject.stage === "REVISING" || subject.stage === "DONE")
          ? subject.stage
          : null;
      const studiedDay = skipped
        ? null
        : fromBoard
          ? timelineStart - start - 1
          : relative(done?.studiedOn ?? null);
      let remaining =
        studiedDay === null && !skipped
          ? Math.max(
              0,
              total - (done?.studyMinutesDone ?? 0) - pinnedStudyMinutes,
            )
          : 0;
      if (remaining > 0 && remaining < MIN_BLOCK) remaining = MIN_BLOCK;
      remaining = Math.ceil(remaining / 5) * 5;
      return {
        id: topic.id,
        subjectId: subject.id,
        subjectIndex,
        rank,
        weight: topic.weight,
        foundational: topic.foundational,
        confidence,
        window: windowFor(confidence),
        studyTotal: total,
        studyRemaining: remaining,
        started:
          studiedDay === null &&
          remaining > 0 &&
          (done?.studyMinutesDone ?? 0) > 0,
        revMinutes: revisionMinutes(total),
        offsets: slots.map((s) => s.offset),
        extras: slots.map((s) => s.extra),
        breakdown: {
          weight: topic.weight,
          difficulty: topic.difficulty,
          baseMinutes: baseMinutes(topic.weight, topic.difficulty),
          intensity: subject.intensity,
          intensityPct: INTENSITY_PCT[subject.intensity],
          subjectConfidence: subject.confidence,
          confidence,
          confidencePct: CONFIDENCE_PCT[confidence],
          confidenceCauses: adjustment?.causes ?? [],
          topicMinutes: total,
        },
        skipped,
        fromBoard,
        pinnedStudyMinutes,
        pinnedStudyLastDay: studyPins.length
          ? Math.max(...studyPins.map((p) => toDay(p.date) - start))
          : null,
        pinnedTouches: new Set(
          revisionPins.flatMap((p) => (p.touch ? [p.touch] : [])),
        ),
        pinnedRevisionDays: revisionPins
          .map((p) => toDay(p.date) - start)
          .sort((a, b) => a - b),
        // Done: the first two touches count as already done, so only the later, lighter
        // ones are planned.
        revisionsDone:
          fromBoard === "DONE"
            ? Math.max(2, done?.revisionsDone ?? 0)
            : (done?.revisionsDone ?? 0),
        studiedDay,
        lastRevisedDay: relative(done?.lastRevisedOn ?? null),
      };
    });
    return {
      id: subject.id,
      index: subjectIndex,
      stage: subject.stage,
      window: windowFor(subject.confidence),
      topics,
      sectionMockDone:
        subject.stage === "DONE" ||
        input.completedSectionMocks.includes(subject.id) ||
        pins.some(
          (p) => p.type === "SECTION_MOCK" && p.subjectId === subject.id,
        ),
    };
  });

  const topicsById = new Map(
    subjects.flatMap((s) => s.topics.map((t) => [t.id, t] as const)),
  );
  const windowOfSubject = new Map(subjects.map((s) => [s.id, s.window]));
  const pinned: DraftTask[][] = Array.from({ length: horizonDays }, () => []);
  const pinnedKeys = new Set<string>();
  for (const pin of pins) {
    const day = toDay(pin.date) - start;
    const topic = pin.topicId ? topicsById.get(pin.topicId)! : null;
    const subjectId = topic?.subjectId ?? pin.subjectId;
    const override = { kind: pin.kind };
    const base = {
      subjectId,
      topicId: topic?.id ?? null,
      window:
        pin.window ??
        topic?.window ??
        (subjectId ? windowOfSubject.get(subjectId)! : preferred[0]),
      touch: null,
      finalReview: false,
      pinned: true,
      title: null,
    };
    const reason: TaskReason = topic
      ? topicReason(
          topic,
          pin.type === "STUDY" ? "STUDY_BLOCK" : "SPACED_REVISION",
          { override },
        )
      : pin.type === "CUSTOM"
        ? plainReason("USER_TASK", override)
        : plainReason(
            pin.type === "FULL_MOCK" ? "FULL_MOCK" : "SECTION_COMPLETE",
            override,
          );
    pinned[day].push({
      ...base,
      key: pin.taskId,
      type: pin.type,
      minutes: pin.minutes,
      touch: pin.type === "REVISION" ? pin.touch : null,
      title: pin.type === "CUSTOM" ? pin.title : null,
      reason,
    });
    pinnedKeys.add(pin.taskId);
    if (pin.type === "STUDY" && topic) {
      // A study block always brings its check test (CLAUDE.md product rules).
      const checkKey = pin.taskId.startsWith("STUDY:")
        ? `CHECK_TEST:${pin.taskId.slice("STUDY:".length)}`
        : `${pin.taskId}:check`;
      pinned[day].push({
        ...base,
        key: checkKey,
        type: "CHECK_TEST",
        minutes: CHECK_TEST_MINUTES,
        reason: topicReason(topic, "CHECK_AFTER_STUDY", { override }),
      });
      pinnedKeys.add(checkKey);
    }
  }
  const capacities = dayCapacities.map((capacity, i) =>
    Math.max(0, capacity - pinned[i].reduce((n, t) => n + t.minutes, 0)),
  );

  // The review window is 15% of the whole timeline, which began at timelineStart.
  const timelineDays =
    end - (input.timelineStart ? toDay(input.timelineStart) : start) + 1;
  const learnDays = Math.max(0, horizonDays - reviewDayCount(timelineDays));

  return {
    startDay: start,
    timelineStartDay: input.timelineStart ? toDay(input.timelineStart) : start,
    horizonDays,
    learnDays: Math.min(horizonDays, learnDays),
    dayCapacities,
    capacities,
    pinned,
    pinnedKeys,
    beginner: input.beginnerMode,
    recentLeads: [null, null, ...input.recentLeads].slice(-2),
    defaultWindow: preferred[0],
    subjects,
  };
}
