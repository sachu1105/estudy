// The study plan's setup, shared by the steps in the browser and the server that saves
// and runs it. Pure: no server, next or prisma imports.

import { z } from "zod";

import {
  addDays,
  CHECK_TEST_MINUTES,
  dayCapacity,
  intensitySchema,
  isoDateSchema,
  MAX_BLOCK,
  revisionMinutes,
  revisionOffsets,
  studyMinutes,
  timeWindowSchema,
  toDay,
  weekdayOf,
} from "@/lib/plan-engine";
import type { ShareExam } from "@/lib/plans/shares";

export const PLAN_STEPS = ["timeline", "time", "subjects", "review"] as const;
export type PlanStep = (typeof PLAN_STEPS)[number];

export const stepLabels: Record<PlanStep, string> = {
  timeline: "Date",
  time: "Time",
  subjects: "Subjects",
  review: "Review",
};

export const DAY_PRESETS = [30, 60, 90, 180] as const;
export const MAX_DAY_MINUTES = 600;

export const subjectSettingSchema = z.object({
  confidence: z.number().int().min(1).max(5),
  intensity: intensitySchema,
});

/**
 * The time the user has, which belongs to the user and not to one exam: every exam they are
 * preparing for is planned from a slice of it. The copy inside a draft is a cache of the
 * StudyAvailability row, stamped on load, never the source of truth.
 */
export const studyAvailabilitySchema = z.object({
  /** Sunday first, like the engine. */
  minutesByWeekday: z
    .array(z.number().int().min(0).max(MAX_DAY_MINUTES))
    .length(7),
  preferredWindows: z.array(timeWindowSchema).min(1).max(4),
});

export type StudyAvailability = z.infer<typeof studyAvailabilitySchema>;

/**
 * How one exam's setup sees the day it shares with the user's other exams. The exams are
 * handed over whole rather than a finished split, so the steps can re-divide the day with
 * `splitMinutes` as the user drags the minutes about and see the real answer, not an
 * estimate of it.
 */
export type DraftSharing = {
  examId: string;
  /** Every exam that counts against the day, this one included. */
  exams: ShareExam[];
  titles: Record<string, string>;
  /** The exam leading now, when this one is sat sooner and should be offered the lead. */
  shouldLead: { title: string } | null;
};

export const DEFAULT_AVAILABILITY: StudyAvailability = {
  minutesByWeekday: [180, 120, 120, 120, 120, 120, 180],
  preferredWindows: ["MORNING", "EVENING"],
};

export const planDraftSchema = z.object({
  beginnerMode: z.boolean(),
  examDate: isoDateSchema.nullable(),
  targetDays: z.number().int().min(7).max(730).nullable(),
  ...studyAvailabilitySchema.shape,
  subjects: z.record(z.uuid(), subjectSettingSchema),
});

export type PlanDraft = z.infer<typeof planDraftSchema>;
export type SubjectSetting = z.infer<typeof subjectSettingSchema>;

/** A fresh setup: a beginner starts every subject at confidence 1 (product rules). */
export function defaultDraft(
  beginnerMode: boolean,
  subjectIds: string[],
  availability: StudyAvailability = DEFAULT_AVAILABILITY,
): PlanDraft {
  return {
    beginnerMode,
    examDate: null,
    targetDays: 90,
    ...availability,
    subjects: Object.fromEntries(
      subjectIds.map((id) => [
        id,
        { confidence: beginnerMode ? 1 : 3, intensity: "STEADY" as const },
      ]),
    ),
  };
}

/** Last day of study: the earlier of the day before the exam and today + N days. */
export function planEnd(draft: PlanDraft, today: string): string | null {
  const ends: number[] = [];
  if (draft.examDate && toDay(draft.examDate) > toDay(today))
    ends.push(toDay(draft.examDate) - 1);
  if (draft.targetDays) ends.push(toDay(today) + draft.targetDays - 1);
  if (ends.length === 0) return null;
  return addDays(today, Math.min(...ends) - toDay(today));
}

export function daysLeft(draft: PlanDraft, today: string) {
  const end = planEnd(draft, today);
  return end ? toDay(end) - toDay(today) + 1 : 0;
}

/** Why a step can't be left yet, or null when it's complete. */
export function stepProblem(
  step: PlanStep,
  draft: PlanDraft,
  today: string,
): string | null {
  if (step === "timeline") {
    if (draft.examDate && toDay(draft.examDate) <= toDay(today))
      return "The exam date has to be after today.";
    if (!planEnd(draft, today))
      return "Pick your exam date or how many days you have.";
  }
  if (step === "time" && draft.minutesByWeekday.every((m) => m === 0))
    return "Give at least one day some study time.";
  return null;
}

export type EstimateTopic = {
  weight: number;
  difficulty: number;
  done: boolean;
};

/**
 * Rough hours the plan needs and the hours the user has, for the live estimate. Uses the
 * engine's own minute rules; the engine itself makes the final call.
 */
export function estimate(
  draft: PlanDraft,
  today: string,
  subjects: { id: string; stage: string; topics: EstimateTopic[] }[],
  /**
   * This exam's slice of each weekday. With another exam running the user does not have
   * their whole day for this one, and saying otherwise would promise time that is not there.
   */
  minutesByWeekday: readonly number[] = draft.minutesByWeekday,
) {
  let needed = 0;
  for (const subject of subjects) {
    const setting = draft.subjects[subject.id];
    if (!setting) continue;
    const confidence = setting.confidence as 1 | 2 | 3 | 4 | 5;
    for (const topic of subject.topics) {
      if (topic.done) continue;
      const study = studyMinutes(
        topic.weight,
        topic.difficulty,
        setting.intensity,
        confidence,
      );
      const touches = revisionOffsets(confidence, false).length;
      const revision = touches * revisionMinutes(study);
      if (subject.stage === "DONE") needed += revisionMinutes(study) * 2;
      else if (subject.stage === "REVISING") needed += revision;
      else
        needed +=
          study + Math.ceil(study / MAX_BLOCK) * CHECK_TEST_MINUTES + revision;
    }
  }
  const days = daysLeft(draft, today);
  let available = 0;
  for (let i = 0; i < days; i++)
    available += dayCapacity(
      minutesByWeekday[weekdayOf(toDay(today) + i)] ?? 0,
    );
  return {
    neededHours: Math.round(needed / 60),
    availableHours: Math.round(available / 60),
    days,
  };
}
