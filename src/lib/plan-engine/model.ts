// Internal working model built from a validated PlanInput. Day indexes are relative to
// `today` (0 = today), so progress from the past has negative indexes.

import { toDay } from "./dates";
import {
  clampConfidence,
  dayCapacity,
  MIN_BLOCK,
  revisionMinutes,
  revisionOffsets,
  reviewDayCount,
  studyMinutes,
  type Confidence,
} from "./minutes";
import type { ParsedPlanInput, TimeWindow } from "./schemas";

const WINDOW_ORDER: TimeWindow[] = ["MORNING", "AFTERNOON", "EVENING", "NIGHT"];

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
  revisionsDone: number;
  studiedDay: number | null;
  lastRevisedDay: number | null;
};

export type ModelSubject = {
  id: string;
  index: number;
  window: TimeWindow;
  topics: ModelTopic[];
  sectionMockDone: boolean;
};

export type Model = {
  startDay: number;
  timelineStartDay: number;
  horizonDays: number;
  learnDays: number;
  capacities: number[];
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
  const capacities = Array.from({ length: horizonDays }, (_, i) => {
    const weekday = (((start + i + 4) % 7) + 7) % 7;
    return dayCapacity(input.availability.minutesByWeekday[weekday]);
  });

  const preferred = input.availability.preferredWindows;
  const earliest =
    WINDOW_ORDER.find((w) => preferred.includes(w)) ?? preferred[0];
  const windowFor = (confidence: number) =>
    confidence <= 2 ? earliest : preferred[0];

  const progress = new Map(input.progress.map((p) => [p.topicId, p]));
  const adjustments = new Map(input.adjustments.map((a) => [a.topicId, a]));
  const relative = (iso: string | null) => (iso ? toDay(iso) - start : null);

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
      const total = studyMinutes(
        topic.weight,
        topic.difficulty,
        subject.intensity,
        confidence,
      );
      const done = progress.get(topic.id);
      const studiedDay = relative(done?.studiedOn ?? null);
      let remaining =
        studiedDay === null
          ? Math.max(0, total - (done?.studyMinutesDone ?? 0))
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
        offsets: revisionOffsets(
          confidence,
          adjustment?.extraRevision ?? false,
        ),
        revisionsDone: done?.revisionsDone ?? 0,
        studiedDay,
        lastRevisedDay: relative(done?.lastRevisedOn ?? null),
      };
    });
    return {
      id: subject.id,
      index: subjectIndex,
      window: windowFor(subject.confidence),
      topics,
      sectionMockDone: input.completedSectionMocks.includes(subject.id),
    };
  });

  // The review window is 15% of the whole timeline, which began at timelineStart.
  const timelineDays =
    end - (input.timelineStart ? toDay(input.timelineStart) : start) + 1;
  const learnDays = Math.max(0, horizonDays - reviewDayCount(timelineDays));

  return {
    startDay: start,
    timelineStartDay: input.timelineStart ? toDay(input.timelineStart) : start,
    horizonDays,
    learnDays: Math.min(horizonDays, learnDays),
    capacities,
    beginner: input.beginnerMode,
    recentLeads: [null, null, ...input.recentLeads].slice(-2),
    defaultWindow: preferred[0],
    subjects,
  };
}
