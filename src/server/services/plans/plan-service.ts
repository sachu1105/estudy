import { today as todayIn, type Clock } from "@/lib/clock";
import {
  generatePlan,
  planInputSchema,
  type CoverageWarning,
  type PlanInput,
  type SubjectStage,
} from "@/lib/plan-engine";
import {
  daysLeft,
  defaultDraft,
  planDraftSchema,
  type PlanDraft,
} from "@/lib/plans/draft";
import type { Actor } from "@/server/services/syllabus/deps";
import {
  fromDbDate,
  type PlanRepository,
} from "@/server/repositories/plan-repository";
import type { TopicCompletionRepository } from "@/server/repositories/topic-completion-repository";

import { failure, type Result } from "../syllabus/deps";
import { leaveOutToFit, type LeftOutTopic } from "./fit";

export type PlanDeps = {
  plans: PlanRepository;
  completions: TopicCompletionRepository;
  clock: Clock;
  activePlanLimit: (user: Actor) => number;
};

export type PlanUser = Actor & { timezone: string; beginnerMode: boolean };

const STAGE_RANK: Record<SubjectStage, number> = {
  STUDYING: 0,
  TO_STUDY: 1,
  REVISING: 2,
  DONE: 3,
};

/** Plans leave the service with calendar days as "YYYY-MM-DD", never Date objects. */
function withDays<
  T extends { startDate: Date; endDate: Date; reviewStartDate: Date | null },
>(plan: T) {
  return {
    ...plan,
    startDate: fromDbDate(plan.startDate),
    endDate: fromDbDate(plan.endDate),
    reviewStartDate: plan.reviewStartDate
      ? fromDbDate(plan.reviewStartDate)
      : null,
  };
}

const NO_DRAFT = failure("NOT_FOUND", "That plan setup doesn't exist.");

export type GenerateOutcome =
  | { outcome: "PLAN"; planId: string }
  | {
      outcome: "WARNING";
      warning: CoverageWarning;
      /** Roughly how many more days the same daily time would need. */
      extraDays: number;
    };

/** Study plans built from an exam's pods by the plan engine (rule 3: no AI here). */
export function createPlanService(deps: PlanDeps) {
  const todayFor = (user: PlanUser) => todayIn(deps.clock, user.timezone);

  /** The exam's subjects in board order (Studying, To study, Revising, Done), with ticks. */
  async function examSubjects(user: PlanUser, syllabusId: string) {
    const pods = await deps.plans.examTree(user.id, syllabusId);
    const withTopics = pods.filter((p) => p.subject!.topics.length > 0);
    withTopics.sort(
      (a, b) =>
        STAGE_RANK[a.stage] - STAGE_RANK[b.stage] ||
        a.stageOrder - b.stageOrder ||
        a.order - b.order,
    );
    const done = await deps.completions.doneAmong(
      user.id,
      withTopics.flatMap((p) => p.subject!.topics.map((t) => t.id)),
    );
    return withTopics.map((p) => ({
      podId: p.id,
      subjectId: p.subject!.id,
      name: p.name,
      stage: p.stage,
      topics: p.subject!.topics.map((t) => ({ ...t, done: done.has(t.id) })),
    }));
  }
  type ExamSubject = Awaited<ReturnType<typeof examSubjects>>[number];

  /** Settings for subjects added since the draft was saved; removed ones dropped. */
  function reconcile(draft: PlanDraft, subjects: ExamSubject[]): PlanDraft {
    const fresh = defaultDraft(
      draft.beginnerMode,
      subjects.map((s) => s.subjectId),
    );
    return {
      ...draft,
      subjects: Object.fromEntries(
        subjects.map((s) => [
          s.subjectId,
          draft.subjects[s.subjectId] ?? fresh.subjects[s.subjectId],
        ]),
      ),
    };
  }

  async function loadDraft(user: PlanUser, draftId: string) {
    const row = await deps.plans.findDraftById(draftId, user.id);
    if (!row) return null;
    const parsed = planDraftSchema.safeParse(row.data);
    const subjects = await examSubjects(user, row.syllabusVersionId);
    const data = reconcile(
      parsed.success
        ? parsed.data
        : defaultDraft(
            user.beginnerMode,
            subjects.map((s) => s.subjectId),
          ),
      subjects,
    );
    return { row, data, subjects };
  }

  /** The engine input for a draft. The copy saved with the plan includes every name. */
  function buildInput(
    draft: PlanDraft,
    subjects: ExamSubject[],
    today: string,
  ): PlanInput {
    return {
      today,
      ...(draft.examDate ? { examDate: draft.examDate } : {}),
      ...(draft.targetDays ? { targetDays: draft.targetDays } : {}),
      availability: {
        minutesByWeekday: draft.minutesByWeekday,
        preferredWindows: draft.preferredWindows,
      },
      beginnerMode: draft.beginnerMode,
      subjects: subjects.map((s) => ({
        id: s.subjectId,
        name: s.name,
        intensity: draft.subjects[s.subjectId].intensity,
        confidence: draft.subjects[s.subjectId].confidence,
        stage: s.stage,
        topics: s.topics.map((t) => ({
          id: t.id,
          name: t.name,
          weight: t.weight,
          difficulty: t.difficulty,
          foundational: t.foundational,
          order: t.order,
        })),
      })),
      // Topics ticked in a pod are already known (rule 14 override).
      overrides: subjects.flatMap((s) =>
        s.topics
          .filter((t) => t.done)
          .map((t) => ({ kind: "TOPIC_DONE" as const, topicId: t.id })),
      ),
    };
  }

  return {
    today: todayFor,

    /** Opens the exam's plan setup, resuming the saved one if there is one. */
    async startDraft(
      user: PlanUser,
      syllabusId: string,
    ): Promise<Result<{ draftId: string }>> {
      const subjects = await examSubjects(user, syllabusId);
      if (subjects.length === 0)
        return failure(
          "NO_SUBJECTS",
          "This exam has no subjects with topics yet. Confirm its syllabus first.",
        );
      const existing = await deps.plans.findDraft(user.id, syllabusId);
      if (existing) return { ok: true, draftId: existing.id };
      const draft = await deps.plans.createDraft(
        user.id,
        syllabusId,
        defaultDraft(
          user.beginnerMode,
          subjects.map((s) => s.subjectId),
        ),
      );
      return { ok: true, draftId: draft.id };
    },

    async getDraft(user: PlanUser, draftId: string) {
      const loaded = await loadDraft(user, draftId);
      if (!loaded) return null;
      return {
        id: loaded.row.id,
        syllabus: loaded.row.syllabusVersion,
        data: loaded.data,
        subjects: loaded.subjects,
        today: todayFor(user),
      };
    },

    async saveDraft(
      user: PlanUser,
      draftId: string,
      data: PlanDraft,
    ): Promise<Result<object>> {
      const loaded = await loadDraft(user, draftId);
      if (!loaded) return NO_DRAFT;
      await deps.plans.saveDraft(draftId, reconcile(data, loaded.subjects));
      return { ok: true };
    },

    /**
     * Runs the plan engine on the setup. When the work doesn't fit, nothing is saved and
     * the user gets the honest numbers, unless they chose to leave topics out to fit.
     */
    async generate(
      user: PlanUser,
      draftId: string,
      fit: "ALL" | "PARTIAL",
    ): Promise<Result<GenerateOutcome>> {
      const loaded = await loadDraft(user, draftId);
      if (!loaded) return NO_DRAFT;
      const syllabusId = loaded.row.syllabusVersionId;
      const used = await deps.plans.countActiveElsewhere(user.id, syllabusId);
      if (used >= deps.activePlanLimit(user))
        return failure(
          "LIMIT",
          "Your plan allows no more active study plans. Archive one to make another.",
        );
      const today = todayFor(user);
      if (daysLeft(loaded.data, today) === 0)
        return failure("NO_TIME", "Pick an exam date after today.");

      let input = buildInput(loaded.data, loaded.subjects, today);
      if (!planInputSchema.safeParse(input).success)
        return failure(
          "TOO_BIG",
          "This syllabus is bigger than one plan can hold (40 subjects, 300 topics each).",
        );
      let leftOut: LeftOutTopic[] = [];
      let result = generatePlan(input);
      if (result.kind === "COVERAGE_WARNING" && fit === "PARTIAL") {
        const fitted = leaveOutToFit(input);
        if (!fitted)
          return failure(
            "NO_FIT",
            "Even the most important topics don't fit. Add time or move the date.",
          );
        ({ input, leftOut } = fitted);
        result = generatePlan(input);
      }
      if (result.kind === "COVERAGE_WARNING") {
        const ratio =
          result.requiredMinutes / Math.max(1, result.availableMinutes);
        return {
          ok: true,
          outcome: "WARNING",
          warning: result,
          extraDays: Math.max(
            1,
            Math.ceil(result.horizonDays * Math.max(0, ratio - 1)),
          ),
        };
      }
      const plan = await deps.plans.create({
        userId: user.id,
        syllabusVersionId: syllabusId,
        title: loaded.row.syllabusVersion.title,
        inputs: input,
        leftOut,
        output: result,
      });
      return { ok: true, outcome: "PLAN", planId: plan.id };
    },

    async activeFor(user: PlanUser, syllabusId: string) {
      const plan = await deps.plans.activeFor(user.id, syllabusId);
      return plan ? withDays(plan) : null;
    },
    listActive: async (user: PlanUser) =>
      (await deps.plans.listActive(user.id)).map(withDays),
    draftFor: (user: PlanUser, syllabusId: string) =>
      deps.plans.findDraft(user.id, syllabusId),

    /** A plan with its next `days` days, names taken from the plan's own snapshot. */
    async get(user: PlanUser, planId: string, days = 7) {
      const plan = await deps.plans.findOwned(planId, user.id);
      if (!plan) return null;
      const today = todayFor(user);
      const input = plan.inputs as PlanInput;
      const subjectNames = new Map(input.subjects.map((s) => [s.id, s.name]));
      const topicNames = new Map(
        input.subjects.flatMap((s) => s.topics.map((t) => [t.id, t.name])),
      );
      const upcoming = await deps.plans.daysFrom(planId, today, days);
      return {
        ...withDays(plan),
        today,
        subjects: input.subjects.length,
        leftOut: plan.leftOut as LeftOutTopic[],
        subjectNames,
        topicNames,
        days: upcoming.map((d) => ({ ...d, date: fromDbDate(d.date) })),
      };
    },
  };
}

export type PlanService = ReturnType<typeof createPlanService>;
