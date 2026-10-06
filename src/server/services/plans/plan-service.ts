import { today as todayIn, type Clock } from "@/lib/clock";
import {
  generatePlan,
  pinOverrideSchema,
  planInputSchema,
  replan,
  toDay,
  type CompletedWork,
  type CoverageWarning,
  type PinOverride,
  type PlanInput,
  type PlanOutput,
  type SubjectStage,
  type TopicAdjustment,
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
import type { ProgressRepository } from "@/server/repositories/progress-repository";
import type { TopicCompletionRepository } from "@/server/repositories/topic-completion-repository";

import { failure, type Result } from "../syllabus/deps";
import { leaveOutToFit, type LeftOutTopic } from "./fit";

export type PlanDeps = {
  plans: PlanRepository;
  progress: ProgressRepository;
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
const NO_PLAN = failure("NOT_FOUND", "There's no active plan for that exam.");

/** A hand edit to one task (rule 14). */
export type TaskEdit =
  | { kind: "MOVE"; date: string }
  | { kind: "RESIZE"; minutes: number }
  | { kind: "LOCK" };

/** Check tests travel with their study block, so they're never pinned on their own. */
const PINNABLE = new Set([
  "STUDY",
  "REVISION",
  "SECTION_MOCK",
  "FULL_MOCK",
  "CUSTOM",
]);

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

  type ActivePlan = NonNullable<
    Awaited<ReturnType<PlanRepository["findOwned"]>>
  >;

  const timelineStartOf = (plan: ActivePlan) => {
    const inputs = plan.inputs as PlanInput;
    return inputs.timelineStart ?? inputs.today;
  };

  /**
   * The one way a plan is made. With an active plan for the exam it's a re-plan: work
   * already done, last week's adjustments and the user's pinned edits carry over, and the
   * review window keeps measuring from the first day. Without one, a fresh plan.
   */
  async function engine(
    user: PlanUser,
    syllabusId: string,
    input: PlanInput,
    existing: ActivePlan | null,
  ): Promise<{
    plan: PlanOutput | CoverageWarning;
    adjustments: TopicAdjustment[];
    diff: unknown;
  }> {
    const planIds = await deps.plans.planIdsForExam(user.id, syllabusId);
    const done = await deps.progress.completedTasks(user.id, planIds);
    const doneKeys = new Set(done.map((d) => d.taskKey));
    // A pinned task that's already done would otherwise be planned twice.
    const pins = (await deps.plans.listOverrides(user.id, syllabusId))
      .map((o) => pinOverrideSchema.safeParse(o.data))
      .flatMap((r) =>
        r.success && !doneKeys.has(r.data.taskId) ? [r.data] : [],
      );
    const withPins = {
      ...input,
      overrides: [...(input.overrides ?? []), ...pins],
    };
    if (!existing)
      return { plan: generatePlan(withPins), adjustments: [], diff: null };

    const history: CompletedWork[] = done.map((d) => ({
      date: fromDbDate(d.localDate),
      type: d.type,
      subjectId: d.subjectId,
      topicId: d.topicId,
      minutes: d.minutes,
      accuracy: null,
    }));
    return replan({
      ...withPins,
      timelineStart: timelineStartOf(existing),
      adjustments: existing.adjustments as TopicAdjustment[],
      history,
      previousPlan: await deps.plans.loadOutput(existing.id),
    });
  }

  /** The same topics left out as before, so a re-plan never quietly brings them back. */
  function withoutLeftOut(input: PlanInput, leftOut: LeftOutTopic[]) {
    const out = new Set(leftOut.map((t) => t.topicId));
    if (out.size === 0) return input;
    return {
      ...input,
      subjects: input.subjects
        .map((s) => ({ ...s, topics: s.topics.filter((t) => !out.has(t.id)) }))
        .filter((s) => s.topics.length > 0),
    };
  }

  /**
   * Re-plans an exam from today with its current settings, board and progress, keeping
   * the end date. If the rest no longer fits, the plan stays and says so.
   */
  async function replanExam(
    user: PlanUser,
    syllabusId: string,
  ): Promise<Result<{ planId: string } | { warning: CoverageWarning }>> {
    const summary = await deps.plans.activeFor(user.id, syllabusId);
    if (!summary) return NO_PLAN;
    const existing = (await deps.plans.findOwned(summary.id, user.id))!;
    const draftRow = await deps.plans.findDraft(user.id, syllabusId);
    const parsed = planDraftSchema.safeParse(draftRow?.data);
    if (!parsed.success) return NO_DRAFT;
    const today = todayFor(user);
    const end = fromDbDate(existing.endDate);
    if (toDay(end) < toDay(today))
      return failure(
        "ENDED",
        "This plan has ended. Make a new one from the exam pod.",
      );
    const subjects = await examSubjects(user, syllabusId);
    const leftOut = existing.leftOut as LeftOutTopic[];
    const input = withoutLeftOut(
      {
        ...buildInput(reconcile(parsed.data, subjects), subjects, today),
        // Keep the end date: the days that remain, not "N days from now" again.
        examDate: undefined,
        targetDays: toDay(end) - toDay(today) + 1,
      },
      leftOut,
    );
    const result = await engine(user, syllabusId, input, existing);
    if (result.plan.kind === "COVERAGE_WARNING") {
      await deps.plans.setReplanWarning(existing.id, result.plan);
      return { ok: true, warning: result.plan };
    }
    const plan = await deps.plans.create({
      userId: user.id,
      syllabusVersionId: syllabusId,
      title: existing.title,
      inputs: { ...input, timelineStart: timelineStartOf(existing) },
      leftOut,
      output: result.plan,
      adjustments: result.adjustments,
      replanDiff: result.diff,
    });
    return { ok: true, planId: plan.id };
  }

  /** A task of the user's active plan that may be pinned by hand, or null. */
  async function editableTask(user: PlanUser, taskId: string) {
    const task = await deps.plans.findTask(taskId, user.id);
    if (!task || task.plan.status !== "ACTIVE" || !task.plan.syllabusVersionId)
      return null;
    return PINNABLE.has(task.type) ? task : null;
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

      let input: PlanInput = buildInput(loaded.data, loaded.subjects, today);
      if (!planInputSchema.safeParse(input).success)
        return failure(
          "TOO_BIG",
          "This syllabus is bigger than one plan can hold (40 subjects, 300 topics each).",
        );
      // Changing an active plan's settings keeps everything already done.
      const active = await deps.plans.activeFor(user.id, syllabusId);
      const existing = active
        ? await deps.plans.findOwned(active.id, user.id)
        : null;
      let leftOut: LeftOutTopic[] = [];
      let run = await engine(user, syllabusId, input, existing);
      if (run.plan.kind === "COVERAGE_WARNING" && fit === "PARTIAL") {
        const fitted = leaveOutToFit(input);
        if (!fitted)
          return failure(
            "NO_FIT",
            "Even the most important topics don't fit. Add time or move the date.",
          );
        ({ input, leftOut } = fitted);
        run = await engine(user, syllabusId, input, existing);
      }
      const result = run.plan;
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
        inputs: existing
          ? { ...input, timelineStart: timelineStartOf(existing) }
          : input,
        leftOut,
        output: result,
        adjustments: run.adjustments,
        replanDiff: run.diff,
      });
      return { ok: true, outcome: "PLAN", planId: plan.id };
    },

    replan: replanExam,

    /** The Sunday job: every active plan of every user, one at a time. */
    async replanAll() {
      let remade = 0;
      for (const p of await deps.plans.allActive()) {
        const { subscriptions, ...rest } = p.user;
        const user = { ...rest, subscription: subscriptions[0] ?? null };
        const result = await replanExam(user, p.syllabusVersionId!).catch(
          () => null,
        );
        if (result?.ok && "planId" in result) remade++;
      }
      return remade;
    },

    /** Move, resize or lock a task: stored as an override, then the plan is re-made. */
    async editTask(user: PlanUser, taskId: string, edit: TaskEdit) {
      const task = await editableTask(user, taskId);
      if (!task)
        return failure("NOT_EDITABLE", "That task can't be changed by hand.");
      const today = todayFor(user);
      const date = edit.kind === "MOVE" ? edit.date : fromDbDate(task.date);
      if (
        toDay(date) < toDay(today) ||
        toDay(date) > toDay(fromDbDate(task.plan.endDate))
      )
        return failure(
          "BAD_DATE",
          "Pick a day between today and the end of your plan.",
        );
      const pin = pinOverrideSchema.safeParse({
        kind: edit.kind,
        taskId: task.key,
        type: task.type as PinOverride["type"],
        date,
        minutes: edit.kind === "RESIZE" ? edit.minutes : task.minutes,
        window: task.window,
        subjectId: task.subjectId,
        topicId: task.topicId,
        touch: task.type === "REVISION" ? task.touch : null,
        title: task.title,
      } satisfies PinOverride);
      if (!pin.success)
        return failure("BAD_EDIT", "That change isn't possible for this task.");
      await deps.plans.saveOverride({
        userId: user.id,
        syllabusVersionId: task.plan.syllabusVersionId!,
        taskKey: task.key,
        kind: edit.kind,
        data: pin.data,
      });
      return replanExam(user, task.plan.syllabusVersionId!);
    },

    /** "Reset to suggested": drops the user's edit and the plan places the task again. */
    async resetTask(user: PlanUser, taskId: string) {
      const task = await deps.plans.findTask(taskId, user.id);
      if (
        !task ||
        task.plan.status !== "ACTIVE" ||
        !task.plan.syllabusVersionId
      )
        return failure("NOT_FOUND", "That task isn't in your current plan.");
      await deps.plans.removeOverride(
        user.id,
        task.plan.syllabusVersionId,
        task.key,
      );
      return replanExam(user, task.plan.syllabusVersionId);
    },

    /** A task of the user's own on a day of the plan. */
    async addCustomTask(
      user: PlanUser,
      syllabusId: string,
      task: { date: string; minutes: number; title: string },
    ) {
      const active = await deps.plans.activeFor(user.id, syllabusId);
      if (!active) return NO_PLAN;
      const today = todayFor(user);
      if (
        toDay(task.date) < toDay(today) ||
        toDay(task.date) > toDay(fromDbDate(active.endDate))
      )
        return failure(
          "BAD_DATE",
          "Pick a day between today and the end of your plan.",
        );
      const key = `CUSTOM:${crypto.randomUUID()}`;
      await deps.plans.saveOverride({
        userId: user.id,
        syllabusVersionId: syllabusId,
        taskKey: key,
        kind: "CUSTOM",
        data: {
          kind: "CUSTOM",
          taskId: key,
          type: "CUSTOM",
          date: task.date,
          minutes: task.minutes,
          subjectId: null,
          topicId: null,
          touch: null,
          title: task.title,
        } satisfies PinOverride,
      });
      return replanExam(user, syllabusId);
    },

    dismissDiff: (user: PlanUser, planId: string) =>
      deps.plans.markDiffSeen(planId, user.id, deps.clock.now()),

    async activeFor(user: PlanUser, syllabusId: string) {
      const plan = await deps.plans.activeFor(user.id, syllabusId);
      return plan ? withDays(plan) : null;
    },
    listActive: async (user: PlanUser) =>
      (await deps.plans.listActive(user.id)).map(withDays),
    draftFor: (user: PlanUser, syllabusId: string) =>
      deps.plans.findDraft(user.id, syllabusId),

    /** Everything "How your plan was built" shows, from the plan's own snapshot. */
    async explain(user: PlanUser, planId: string) {
      const plan = await deps.plans.findOwned(planId, user.id);
      if (!plan) return null;
      const overrides = plan.syllabusVersionId
        ? await deps.plans.listOverrides(user.id, plan.syllabusVersionId)
        : [];
      return {
        ...withDays(plan),
        input: plan.inputs as PlanInput,
        adjustments: plan.adjustments as TopicAdjustment[],
        leftOut: plan.leftOut as LeftOutTopic[],
        edits: overrides.length,
      };
    },

    /** A plan with its next `days` days, names taken from the plan's own snapshot. */
    async get(user: PlanUser, planId: string, days = 7, from?: string) {
      const plan = await deps.plans.findOwned(planId, user.id);
      if (!plan) return null;
      const today = todayFor(user);
      const input = plan.inputs as PlanInput;
      const subjectNames = new Map(input.subjects.map((s) => [s.id, s.name]));
      const topicNames = new Map(
        input.subjects.flatMap((s) => s.topics.map((t) => [t.id, t.name])),
      );
      // Never earlier than today: past days aren't a backlog (rule 7).
      const start = from && toDay(from) > toDay(today) ? from : today;
      const upcoming = await deps.plans.daysFrom(planId, start, days);
      return {
        ...withDays(plan),
        today,
        from: start,
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
