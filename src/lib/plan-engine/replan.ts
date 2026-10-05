import { fromDay, toDay } from "./dates";
import { generatePlan } from "./generate";
import { clampConfidence, studyMinutes, type Confidence } from "./minutes";
import {
  replanInputSchema,
  type CompletedWork,
  type CoverageWarning,
  type ParsedReplanInput,
  type PlanOutput,
  type ReplanDiff,
  type ReplanInput,
  type TopicAdjustment,
  type TopicProgress,
} from "./schemas";

const STRONG_ACCURACY = 0.85;
const WEAK_ACCURACY = 0.6;

type TopicHistory = {
  studyMinutes: number;
  lastStudy: string | null;
  revisions: number;
  lastRevision: string | null;
  accuracies: number[];
};

function summarise(history: CompletedWork[]) {
  const byTopic = new Map<string, TopicHistory>();
  const sectionMocks = new Set<string>();
  for (const entry of [...history].sort((a, b) =>
    a.date.localeCompare(b.date),
  )) {
    if (entry.type === "SECTION_MOCK" && entry.subjectId)
      sectionMocks.add(entry.subjectId);
    if (!entry.topicId) continue;
    const t = byTopic.get(entry.topicId) ?? {
      studyMinutes: 0,
      lastStudy: null,
      revisions: 0,
      lastRevision: null,
      accuracies: [],
    };
    if (entry.type === "STUDY") {
      t.studyMinutes += entry.minutes;
      t.lastStudy = entry.date;
    } else if (entry.type === "REVISION") {
      t.revisions += 1;
      t.lastRevision = entry.date;
    } else if (entry.type === "CHECK_TEST" && entry.accuracy !== null) {
      t.accuracies.push(entry.accuracy);
    }
    byTopic.set(entry.topicId, t);
  }
  return { byTopic, sectionMocks };
}

/** New confidence from check-test accuracy and how many due revisions were actually done. */
function recomputeConfidence(
  prior: Confidence,
  history: TopicHistory | undefined,
  revisionsDue: number,
) {
  let confidence: number = prior;
  let weak = false;
  if (history && history.accuracies.length > 0) {
    // Integer mean in basis points keeps this exact across machines.
    const meanBp = Math.round(
      history.accuracies.reduce((s, a) => s + a * 10_000, 0) /
        history.accuracies.length,
    );
    if (meanBp >= STRONG_ACCURACY * 10_000) confidence += 1;
    else if (meanBp < WEAK_ACCURACY * 10_000) {
      confidence -= 1;
      weak = true;
    }
  }
  const revisionsDone = history?.revisions ?? 0;
  if (revisionsDue > 0 && revisionsDone * 2 < revisionsDue) confidence -= 1;
  return { confidence: clampConfidence(confidence), weak };
}

function coverageBefore(
  input: ParsedReplanInput,
  previousPlan: PlanOutput,
  byTopic: Map<string, TopicHistory>,
  today: number,
) {
  let total = 0;
  let covered = 0;
  const futureStudy = new Map<string, number>();
  for (const day of previousPlan.days) {
    if (toDay(day.date) < today) continue;
    for (const t of day.tasks) {
      if (t.type === "STUDY" && t.topicId)
        futureStudy.set(
          t.topicId,
          (futureStudy.get(t.topicId) ?? 0) + t.minutes,
        );
    }
  }
  const prior = new Map(
    input.adjustments.map((a) => [a.topicId, a.confidence]),
  );
  for (const subject of input.subjects) {
    for (const topic of subject.topics) {
      const confidence = clampConfidence(
        prior.get(topic.id) ?? subject.confidence,
      );
      const required = studyMinutes(
        topic.weight,
        topic.difficulty,
        subject.intensity,
        confidence,
      );
      total += required;
      const done = byTopic.get(topic.id)?.studyMinutes ?? 0;
      covered += Math.min(required, done + (futureStudy.get(topic.id) ?? 0));
    }
  }
  return total > 0 ? Math.min(100, Math.floor((covered * 100) / total)) : 100;
}

function diffPlans(
  input: ParsedReplanInput,
  next: PlanOutput | CoverageWarning,
  byTopic: Map<string, TopicHistory>,
  weakTopicIds: string[],
): ReplanDiff {
  const today = toDay(input.today);
  const previous = input.previousPlan;
  const windowStart =
    previous?.startDate ?? input.history.map((h) => h.date).sort()[0] ?? null;
  const inWindow = (date: string) =>
    windowStart !== null && date >= windowStart && toDay(date) < today;

  const minutesPlanned = previous
    ? previous.days
        .filter((d) => inWindow(d.date))
        .reduce((s, d) => s + d.plannedMinutes, 0)
    : 0;
  const minutesDone = input.history
    .filter((h) => inWindow(h.date))
    .reduce((s, h) => s + h.minutes, 0);

  const nextTasks =
    next.kind === "PLAN" ? next.days.flatMap((d) => d.tasks) : [];
  const previousTasks = previous ? previous.days.flatMap((d) => d.tasks) : [];
  const topicIds = input.subjects.flatMap((s) => s.topics.map((t) => t.id));

  const topicsMoved: ReplanDiff["topicsMoved"] = [];
  const touchesAdded: ReplanDiff["touchesAdded"] = [];
  const touchesDropped: ReplanDiff["touchesDropped"] = [];
  for (const topicId of topicIds) {
    const to = nextTasks.find(
      (t) => t.type === "STUDY" && t.topicId === topicId,
    )?.date;
    if (to) {
      // Earliest previously planned study block that hasn't happened (missed, or still ahead).
      const from = previousTasks.find(
        (t) =>
          t.type === "STUDY" &&
          t.topicId === topicId &&
          (toDay(t.date) >= today ||
            !byTopic.get(topicId)?.lastStudy ||
            t.date > byTopic.get(topicId)!.lastStudy!),
      )?.date;
      if (from && from !== to) topicsMoved.push({ topicId, from, to });
    }
    if (!previous || next.kind !== "PLAN") continue;
    const required = (t: {
      type: string;
      topicId: string | null;
      finalReview: boolean;
    }) => t.type === "REVISION" && !t.finalReview && t.topicId === topicId;
    const before = Math.max(
      0,
      previousTasks.filter(required).length -
        (byTopic.get(topicId)?.revisions ?? 0),
    );
    const after = nextTasks.filter(required).length;
    if (after > before) touchesAdded.push({ topicId, count: after - before });
    if (after < before) touchesDropped.push({ topicId, count: before - after });
  }

  return {
    windowStart,
    windowEnd: fromDay(today - 1),
    minutesPlanned,
    minutesDone,
    topicsMoved,
    touchesAdded,
    touchesDropped,
    weakTopicIds,
    coverageBefore: previous
      ? coverageBefore(input, previous, byTopic, today)
      : null,
    coverageAfter: next.kind === "PLAN" ? 100 : next.projectedCoveragePercent,
  };
}

/**
 * Weekly re-plan: reads what actually happened, recomputes confidence per topic, discards
 * every unfinished task and builds a fresh plan from today. Nothing is ever overdue.
 * Persist the returned `adjustments` and pass them back next week so confidence carries over.
 */
export function replan(raw: ReplanInput): {
  plan: PlanOutput | CoverageWarning;
  diff: ReplanDiff;
  adjustments: TopicAdjustment[];
} {
  const input = replanInputSchema.parse(raw);
  const today = toDay(input.today);
  const history = input.history.filter((h) => toDay(h.date) <= today);
  const { byTopic, sectionMocks } = summarise(history);
  const prior = new Map(input.adjustments.map((a) => [a.topicId, a]));

  const revisionsDue = new Map<string, number>();
  for (const day of input.previousPlan?.days ?? []) {
    if (toDay(day.date) >= today) continue;
    for (const t of day.tasks) {
      if (t.type === "REVISION" && !t.finalReview && t.topicId) {
        revisionsDue.set(t.topicId, (revisionsDue.get(t.topicId) ?? 0) + 1);
      }
    }
  }

  const adjustments: TopicAdjustment[] = [];
  const progress: TopicProgress[] = [];
  const weakTopicIds: string[] = [];
  for (const subject of input.subjects) {
    for (const topic of subject.topics) {
      const priorConfidence = clampConfidence(
        prior.get(topic.id)?.confidence ?? subject.confidence,
      );
      const done = byTopic.get(topic.id);
      const { confidence, weak } = recomputeConfidence(
        priorConfidence,
        done,
        revisionsDue.get(topic.id) ?? 0,
      );
      if (weak) weakTopicIds.push(topic.id);
      if (confidence !== subject.confidence || weak || prior.has(topic.id)) {
        adjustments.push({
          topicId: topic.id,
          confidence,
          extraRevision: weak,
        });
      }
      if (!done) continue;
      const required = studyMinutes(
        topic.weight,
        topic.difficulty,
        subject.intensity,
        priorConfidence,
      );
      const studied = done.studyMinutes >= required;
      progress.push({
        topicId: topic.id,
        studyMinutesDone: done.studyMinutes,
        studiedOn: studied ? done.lastStudy : null,
        revisionsDone: done.revisions,
        lastRevisedOn: done.lastRevision,
      });
    }
  }

  const plan = generatePlan({
    today: input.today,
    examDate: input.examDate,
    targetDays: input.targetDays,
    availability: input.availability,
    beginnerMode: input.beginnerMode,
    subjects: input.subjects,
    adjustments,
    progress,
    completedSectionMocks: [
      ...new Set([...input.completedSectionMocks, ...sectionMocks]),
    ].sort(),
    timelineStart: input.timelineStart ?? input.previousPlan?.timelineStartDate,
    recentLeads: [today - 2, today - 1].map(
      (day) =>
        history.find((h) => h.type === "STUDY" && toDay(h.date) === day)
          ?.subjectId ?? null,
    ),
  });
  return {
    plan,
    diff: diffPlans(input, plan, byTopic, weakTopicIds),
    adjustments,
  };
}
