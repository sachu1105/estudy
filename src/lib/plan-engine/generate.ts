import { fromDay } from "./dates";
import { BUFFER_PCT, CHECK_TEST_MINUTES, MAX_BLOCK } from "./minutes";
import { buildModel, type Model } from "./model";
import { schedule, type ScheduleResult } from "./schedule";
import {
  planInputSchema,
  type CoverageWarning,
  type PlanDay,
  type PlanInput,
  type PlanOutput,
  type PlanTask,
} from "./schemas";

/** ceil(deficit / days of raw time, after the 10% buffer), at least 1 minute. */
function extraPerDay(deficit: number, days: number) {
  if (deficit <= 0) return 0;
  return Math.max(
    1,
    Math.ceil((deficit * 100) / ((100 - BUFFER_PCT) * Math.max(1, days))),
  );
}

function percent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.min(99, Math.max(0, Math.floor((part * 100) / whole)));
}

/** Upper-bound estimate of required work, checked before scheduling (rule: never compress). */
function estimateWorkload(model: Model) {
  const N = model.horizonDays;
  let study = 0;
  let touches = 0;
  for (const subject of model.subjects) {
    for (const topic of subject.topics) {
      const blocks = Math.ceil(topic.studyRemaining / MAX_BLOCK);
      study += topic.studyRemaining + blocks * CHECK_TEST_MINUTES;
      const offsets = topic.offsets.slice(topic.revisionsDone);
      const count =
        offsets.filter((o) => o < N).length +
        (offsets.some((o) => o >= N) ? 1 : 0);
      touches += count * topic.revMinutes;
    }
  }
  const available = model.capacities.reduce((a, b) => a + b, 0);
  const learnCapacity = model.capacities
    .slice(0, model.learnDays)
    .reduce((a, b) => a + b, 0);
  return { study, required: study + touches, available, learnCapacity };
}

function warning(
  model: Model,
  reason: CoverageWarning["reason"],
  values: Pick<
    CoverageWarning,
    | "availableMinutes"
    | "requiredMinutes"
    | "projectedCoveragePercent"
    | "extraMinutesPerDay"
  >,
): CoverageWarning {
  return {
    kind: "COVERAGE_WARNING",
    reason,
    startDate: fromDay(model.startDay),
    endDate: fromDay(model.startDay + model.horizonDays - 1),
    horizonDays: model.horizonDays,
    ...values,
  };
}

function assemble(
  model: Model,
  result: ScheduleResult,
  available: number,
): PlanOutput {
  const partsByTopic = new Map<string, number>();
  for (const day of result.days) {
    for (const task of day) {
      if (task.type === "STUDY")
        partsByTopic.set(
          task.topicId!,
          (partsByTopic.get(task.topicId!) ?? 0) + 1,
        );
    }
  }

  const days = result.days.map((draft, i): PlanDay => {
    const dayNumber = model.startDay + i;
    const date = fromDay(dayNumber);
    const tasks = draft.map((task): PlanTask => ({
      id: task.key,
      type: task.type,
      date,
      subjectId: task.subjectId,
      topicId: task.topicId,
      minutes: task.minutes,
      window: task.window,
      part:
        task.type === "STUDY"
          ? {
              index: Number(task.key.split(":").at(-1)),
              total: partsByTopic.get(task.topicId!)!,
            }
          : null,
      touch: task.touch,
      finalReview: task.finalReview,
    }));
    return {
      date,
      weekday: (((dayNumber + 4) % 7) + 7) % 7,
      phase: i < model.learnDays ? "LEARN" : "REVIEW",
      capacityMinutes: model.capacities[i],
      plannedMinutes: tasks.reduce((sum, t) => sum + t.minutes, 0),
      leadSubjectId: tasks.find((t) => t.type === "STUDY")?.subjectId ?? null,
      tasks,
    };
  });

  return {
    kind: "PLAN",
    startDate: fromDay(model.startDay),
    endDate: fromDay(model.startDay + model.horizonDays - 1),
    timelineStartDate: fromDay(model.timelineStartDay),
    horizonDays: model.horizonDays,
    reviewStartDate:
      model.learnDays < model.horizonDays
        ? fromDay(model.startDay + model.learnDays)
        : null,
    availableMinutes: available,
    requiredMinutes: result.requiredMinutesPlaced,
    plannedMinutes: days.reduce((sum, d) => sum + d.plannedMinutes, 0),
    coveragePercent: 100,
    droppedTouches: result.droppedTouches,
    days,
  };
}

/**
 * Builds a day-by-day plan, or returns a CoverageWarning when the work does not fit.
 * Pure and deterministic: the same input always gives byte-identical JSON.
 */
export function generatePlan(raw: PlanInput): PlanOutput | CoverageWarning {
  const input = planInputSchema.parse(raw);
  const model = buildModel(input);
  const load = estimateWorkload(model);

  if (load.required > load.available || load.study > load.learnCapacity) {
    return warning(model, "WORKLOAD", {
      availableMinutes: load.available,
      requiredMinutes: load.required,
      projectedCoveragePercent: Math.min(
        percent(load.available, load.required),
        load.study > 0 ? percent(load.learnCapacity, load.study) : 99,
      ),
      extraMinutesPerDay: Math.max(
        1,
        extraPerDay(load.required - load.available, model.horizonDays),
        extraPerDay(load.study - load.learnCapacity, model.learnDays),
      ),
    });
  }

  const result = schedule(model);
  if (result.unplacedStudyMinutes > 0 || result.unplacedTouches > 0) {
    const totalStudy = model.subjects
      .flatMap((s) => s.topics)
      .reduce((sum, t) => sum + t.studyTotal, 0);
    const studied = totalStudy - result.unplacedStudyMinutes;
    return warning(model, "PLACEMENT", {
      availableMinutes: load.available,
      requiredMinutes:
        result.requiredMinutesPlaced +
        result.unplacedStudyMinutes +
        result.unplacedTouchMinutes,
      projectedCoveragePercent:
        result.unplacedStudyMinutes > 0 ? percent(studied, totalStudy) : 99,
      extraMinutesPerDay: Math.max(
        1,
        extraPerDay(
          result.unplacedStudyMinutes + result.unplacedTouchMinutes,
          model.horizonDays,
        ),
      ),
    });
  }

  return assemble(model, result, load.available);
}
