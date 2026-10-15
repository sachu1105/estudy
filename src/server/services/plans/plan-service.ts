import { today as todayIn, toLocalDate, type Clock } from "@/lib/clock";
import {
  addDays,
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
  DEFAULT_AVAILABILITY,
  daysLeft,
  defaultDraft,
  planDraftSchema,
  planEnd,
  studyAvailabilitySchema,
  type PlanDraft,
  type StudyAvailability,
} from "@/lib/plans/draft";
import {
  focusOf,
  percentagesFor,
  scheduledExams,
  splitMinutes,
  type ExamRole,
  type ShareExam,
} from "@/lib/plans/shares";
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

  /**
   * Settings for subjects added since the draft was saved; removed ones dropped. The study
   * time is stamped from the user's own record, which is the only source of truth for it.
   */
  function reconcile(
    draft: PlanDraft,
    subjects: ExamSubject[],
    availability: StudyAvailability,
  ): PlanDraft {
    const fresh = defaultDraft(
      draft.beginnerMode,
      subjects.map((s) => s.subjectId),
      availability,
    );
    return {
      ...draft,
      ...availability,
      subjects: Object.fromEntries(
        subjects.map((s) => [
          s.subjectId,
          draft.subjects[s.subjectId] ?? fresh.subjects[s.subjectId],
        ]),
      ),
    };
  }

  /**
   * The user's study time, which belongs to the user and not to one exam. The copy saved in
   * a draft is only a cache: it is stamped from here on every read, so editing the time in
   * one exam's setup can never leave another exam planning against a stale day.
   */
  async function availabilityOf(user: PlanUser): Promise<StudyAvailability> {
    const row = await deps.plans.availabilityFor(user.id);
    const parsed = studyAvailabilitySchema.safeParse(row);
    return parsed.success ? parsed.data : DEFAULT_AVAILABILITY;
  }

  async function loadDraft(user: PlanUser, draftId: string) {
    const row = await deps.plans.findDraftById(draftId, user.id);
    if (!row) return null;
    const [parsed, availability] = await Promise.all([
      planDraftSchema.safeParseAsync(row.data),
      availabilityOf(user),
    ]);
    const subjects = await examSubjects(user, row.syllabusVersionId);
    const data = reconcile(
      parsed.success
        ? parsed.data
        : defaultDraft(
            user.beginnerMode,
            subjects.map((s) => s.subjectId),
            availability,
          ),
      subjects,
      availability,
    );
    return { row, data, subjects, availability };
  }

  /**
   * The engine input for a draft. The copy saved with the plan includes every name.
   *
   * `minutesByWeekday` is this exam's slice of the user's day, never the whole of it: the
   * engine plans one exam at a time and has no idea the others exist, so the division has to
   * have happened before it is called (CLAUDE.md rule 3).
   */
  function buildInput(
    draft: PlanDraft,
    subjects: ExamSubject[],
    today: string,
    minutesByWeekday: number[],
  ): PlanInput {
    return {
      today,
      ...(draft.examDate ? { examDate: draft.examDate } : {}),
      ...(draft.targetDays ? { targetDays: draft.targetDays } : {}),
      availability: {
        minutesByWeekday,
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
    // A topic finished by studying it in the plan is ticked in its pod too, but it still
    // needs its spaced revisions. Only a topic ticked without studying counts as known.
    const studied = new Set(
      done.flatMap((d) => (d.type === "STUDY" && d.topicId ? [d.topicId] : [])),
    );
    const known = (input.overrides ?? []).filter(
      (o) => o.kind !== "TOPIC_DONE" || !studied.has(o.topicId),
    );
    const withPins = { ...input, overrides: [...known, ...pins] };
    if (!existing)
      return { plan: generatePlan(withPins), adjustments: [], diff: null };

    const history: CompletedWork[] = done.map((d) => ({
      date: fromDbDate(d.localDate),
      type: d.type,
      subjectId: d.subjectId,
      topicId: d.topicId,
      minutes: d.minutes,
      accuracy: d.accuracy,
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
    /**
     * Whether this re-plan announces itself with a diff card. Re-planning one exam re-plans
     * its siblings, and a card from each would bury the one the user actually caused.
     */
    announce = true,
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
    // The split is recomputed here, not passed in, so that no caller can re-plan an exam at
    // the whole of the day and quietly double-book it.
    const shares = await dayShares(user);
    const slice = shares.slices.get(syllabusId);
    if (!slice) return NO_PLAN;
    if (slice.every((m) => m === 0)) return NO_TIME_LEFT(shares.running.length);
    const input = withoutLeftOut(
      {
        ...buildInput(
          reconcile(parsed.data, subjects, shares.availability),
          subjects,
          today,
          slice,
        ),
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
      role: shares.ranked.find((e) => e.id === syllabusId)?.role ?? null,
      sharePercent: shares.percentOf(syllabusId),
      output: result.plan,
      adjustments: result.adjustments,
      replanDiff: announce ? result.diff : null,
    });
    return { ok: true, planId: plan.id };
  }

  /**
   * The exams the user's day is divided between, with the role they gave each. Exams with
   * only a draft are not here: nothing is scheduled for them yet, so they take no time.
   */
  async function examRoles(user: PlanUser) {
    const [planned, priorities] = await Promise.all([
      deps.plans.plannedExams(user.id),
      deps.plans.prioritiesFor(user.id),
    ]);
    const byExam = new Map(priorities.map((p) => [p.syllabusVersionId, p]));
    return planned.map((plan) => {
      const examId = plan.syllabusVersionId!;
      const saved = byExam.get(examId);
      return {
        id: examId,
        title: plan.title,
        endDate: fromDbDate(plan.endDate),
        // A plan set aside is paused whatever the role row says, so the two can never
        // disagree about whether an exam is running.
        role: (plan.status === "PAUSED"
          ? "PAUSED"
          : (saved?.role ?? "ALONGSIDE")) as ExamRole,
        pausedAt: saved?.pausedAt ?? null,
        planId: plan.id,
      };
    });
  }
  type RankedExam = Awaited<ReturnType<typeof examRoles>>[number];

  /**
   * Exactly one exam leads. Naming a new focus steps the old one down; pausing or demoting
   * the leader hands it to the exam sat soonest, so the user is never left without one.
   */
  function withRole(
    exams: RankedExam[],
    examId: string,
    role: ExamRole,
  ): RankedExam[] {
    const next = exams.map((e) => {
      if (e.id === examId) return { ...e, role };
      if (role === "FOCUS" && e.role === "FOCUS")
        return { ...e, role: "ALONGSIDE" as ExamRole };
      return e;
    });
    if (next.some((e) => e.role === "FOCUS")) return next;
    const lead = focusOf(next as ShareExam[]);
    return lead
      ? next.map((e) => (e.id === lead.id ? { ...e, role: "FOCUS" } : e))
      : next;
  }

  const NO_TIME_LEFT = (count: number) =>
    failure(
      "NO_TIME",
      `Your day doesn't stretch to ${count} exams. Pause one, or give yourself more time.`,
    );

  /**
   * How the user's day divides right now: one slice of each weekday per exam. `pending` is an
   * exam whose plan is about to be made, so it is counted before it exists.
   */
  async function dayShares(user: PlanUser, pending?: ShareExam) {
    const [ranked, availability] = await Promise.all([
      examRoles(user),
      availabilityOf(user),
    ]);
    const exams: ShareExam[] = ranked.map((e) => ({
      id: e.id,
      role: e.role,
      endDate: e.endDate,
    }));
    if (pending && !exams.some((e) => e.id === pending.id)) exams.push(pending);
    const running = scheduledExams(exams);
    const pct = percentagesFor(Math.max(0, running.length - 1));
    const slices = splitMinutes(availability.minutesByWeekday, exams);
    return {
      ranked,
      running,
      availability,
      slices,
      /** Nominal share of the day, for the copy. Paused exams get none. */
      percentOf: (examId: string) => {
        const at = running.findIndex((e) => e.id === examId);
        return at < 0 ? 0 : pct[at];
      },
      /** An exam left with no usable minute on any day: the split has been stretched too far. */
      starved: running.filter((e) =>
        (slices.get(e.id) ?? []).every((m) => m === 0),
      ),
    };
  }

  /**
   * Someone has to lead. A newly planned exam leaves the roles alone if a focus is already
   * set, and otherwise the exam sat soonest takes it.
   */
  async function ensureFocus(user: PlanUser) {
    const exams = await examRoles(user);
    const running = exams.filter((e) => e.role !== "PAUSED");
    if (running.length === 0 || running.some((e) => e.role === "FOCUS")) return;
    const lead = focusOf(exams as ShareExam[]);
    if (lead) await deps.plans.setPriority(user.id, lead.id, "FOCUS", null);
  }

  /** Writes back only the exams whose role actually moved. */
  async function saveRoles(
    user: PlanUser,
    before: RankedExam[],
    after: RankedExam[],
    now: Date,
  ) {
    const was = new Map(before.map((e) => [e.id, e.role]));
    for (const exam of after) {
      if (was.get(exam.id) === exam.role) continue;
      await deps.plans.setPriority(
        user.id,
        exam.id,
        exam.role,
        exam.role === "PAUSED" ? (exam.pausedAt ?? now) : null,
      );
    }
  }

  /**
   * Re-plans every exam the user is running, leader first. Changing one exam's role changes
   * every other exam's share of the day, so they have to be re-planned together or the ones
   * nobody touched keep booking time they no longer have.
   *
   * The roles are already committed when this runs, so each plan is independently correct
   * for them: if one exam fails, the rest are still right and the failure is reported rather
   * than swallowed. They are not wrapped in one transaction because each runs the engine,
   * and a transaction held open across all of them would be long enough to time out.
   */
  async function replanUser(
    user: PlanUser,
    opts: {
      /** Already built against the current split: re-planning it would only undo that. */
      skip?: string;
      /** The exam the user acted on: the only one that announces a diff. */
      announce?: string | null;
    } = {},
  ) {
    const { ranked, running } = await dayShares(user);
    const planned = new Set(ranked.map((e) => e.id));
    const failures: { examId: string; message: string }[] = [];
    let remade = 0;
    for (const exam of running) {
      if (!planned.has(exam.id)) continue; // no plan yet: nothing to re-plan
      if (exam.id === opts.skip) continue;
      const result = await replanExam(
        user,
        exam.id,
        opts.announce === undefined || exam.id === opts.announce,
      ).catch((error: unknown) => ({
        ok: false as const,
        code: "FAILED",
        message: error instanceof Error ? error.message : "Re-plan failed.",
      }));
      if (result.ok && "planId" in result) remade++;
      else if (!result.ok)
        failures.push({ examId: exam.id, message: result.message });
    }
    return { remade, failures };
  }

  /** Makes an exam the focus, or steps it back alongside the one that is. */
  async function setExamRole(
    user: PlanUser,
    syllabusId: string,
    role: "FOCUS" | "ALONGSIDE",
  ): Promise<Result<object>> {
    const exams = await examRoles(user);
    const exam = exams.find((e) => e.id === syllabusId);
    if (!exam) return NO_PLAN;
    if (exam.role === "PAUSED")
      return failure(
        "PAUSED",
        "This exam is paused. Resume it before changing its share of your day.",
      );
    await saveRoles(
      user,
      exams,
      withRole(exams, syllabusId, role),
      deps.clock.now(),
    );
    await replanUser(user, { announce: syllabusId });
    return { ok: true };
  }

  /**
   * Sets an exam aside. Its plan, topics, notes and everything logged against them stay;
   * it just stops taking any of the day, which is what lifts it off Today.
   */
  async function pauseExam(
    user: PlanUser,
    syllabusId: string,
  ): Promise<Result<object>> {
    const exams = await examRoles(user);
    const exam = exams.find((e) => e.id === syllabusId);
    if (!exam) return NO_PLAN;
    if (exam.role === "PAUSED") return { ok: true };
    await deps.plans.pauseActivePlan(user.id, syllabusId);
    await saveRoles(
      user,
      exams,
      withRole(exams, syllabusId, "PAUSED"),
      deps.clock.now(),
    );
    // The time this exam was taking is now the others', so they are re-planned to use it.
    // None announces a diff: the user paused one exam, they did not re-plan the rest.
    await replanUser(user, { announce: null });
    return { ok: true };
  }

  /**
   * Brings a paused exam back. The days it spent paused are added to its timeline, so the
   * final revision window is measured against the study time the user actually had: a
   * pause must never quietly eat the days they had left to learn in.
   */
  async function resumeExam(
    user: PlanUser,
    syllabusId: string,
  ): Promise<Result<object>> {
    const exams = await examRoles(user);
    const exam = exams.find((e) => e.id === syllabusId);
    if (!exam) return NO_PLAN;
    if (exam.role !== "PAUSED") return { ok: true };

    // Pausing is not a way around the plan limit.
    const used = await deps.plans.countActiveElsewhere(user.id, syllabusId);
    if (used >= deps.activePlanLimit(user))
      return failure(
        "LIMIT",
        "Your plan allows no more active study plans. Pause another exam to resume this one.",
      );

    const paused = await deps.plans.pausedPlanFor(user.id, syllabusId);
    if (!paused) return NO_PLAN;
    const today = todayFor(user);
    if (toDay(fromDbDate(paused.endDate)) < toDay(today))
      return failure(
        "ENDED",
        "This plan has ended. Set a new date for this exam to start it again.",
      );

    const inputs = paused.inputs as PlanInput;
    const start = inputs.timelineStart ?? inputs.today;
    const pausedDays = exam.pausedAt
      ? toDay(today) - toDay(toLocalDate(exam.pausedAt, user.timezone))
      : 0;
    await deps.plans.resumePlan(paused.id, {
      ...inputs,
      // Clamped to today: the timeline can never start in the future.
      timelineStart: addDays(start, Math.max(0, pausedDays)),
    });
    await saveRoles(
      user,
      exams,
      withRole(exams, syllabusId, "ALONGSIDE"),
      deps.clock.now(),
    );
    // It comes back to a day it now shares, so every running exam is re-planned.
    await replanUser(user, { announce: syllabusId });
    return { ok: true };
  }

  /**
   * The one way in from the UI. A paused exam is resumed first, so "make this my focus" does
   * the obvious thing instead of refusing because the exam is asleep.
   */
  async function setRoleOrResume(
    user: PlanUser,
    syllabusId: string,
    role: "FOCUS" | "ALONGSIDE",
  ): Promise<Result<object>> {
    const exams = await examRoles(user);
    const exam = exams.find((e) => e.id === syllabusId);
    if (!exam) return NO_PLAN;
    if (exam.role === "PAUSED") {
      const resumed = await resumeExam(user, syllabusId);
      if (!resumed.ok) return resumed;
      if (role === "ALONGSIDE") return resumed;
    }
    return setExamRole(user, syllabusId, role);
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
          await availabilityOf(user),
        ),
      );
      return { ok: true, draftId: draft.id };
    },

    async getDraft(user: PlanUser, draftId: string) {
      const loaded = await loadDraft(user, draftId);
      if (!loaded) return null;
      const today = todayFor(user);
      const examId = loaded.row.syllabusVersionId;
      // This exam counts against the day as it will once planned, so the setup shows the
      // time it will actually get rather than the whole day it cannot have.
      const shares = await dayShares(user, {
        id: examId,
        role: "ALONGSIDE",
        endDate: planEnd(loaded.data, today),
      });
      const lead = shares.running[0] ?? null;
      const myEnd = planEnd(loaded.data, today);
      return {
        id: loaded.row.id,
        syllabus: loaded.row.syllabusVersion,
        data: loaded.data,
        subjects: loaded.subjects,
        today,
        sharing: {
          examId,
          exams: shares.running.map((e) => ({
            id: e.id,
            role: e.role,
            endDate: e.endDate,
          })),
          titles: Object.fromEntries(
            shares.running.map((e) => [
              e.id,
              e.id === examId
                ? loaded.row.syllabusVersion.title
                : (shares.ranked.find((r) => r.id === e.id)?.title ??
                  "Your other exam"),
            ]),
          ),
          /**
           * The exam leading today, when it is not this one and this one is sat sooner: the
           * user is offered the swap at review rather than it being made for them.
           */
          shouldLead:
            lead && lead.id !== examId && myEnd && (lead.endDate ?? "") > myEnd
              ? {
                  title:
                    shares.ranked.find((r) => r.id === lead.id)?.title ??
                    "Your other exam",
                }
              : null,
        },
      };
    },

    async saveDraft(
      user: PlanUser,
      draftId: string,
      data: PlanDraft,
    ): Promise<Result<object>> {
      const loaded = await loadDraft(user, draftId);
      if (!loaded) return NO_DRAFT;
      // The time belongs to the user, not to this exam, so it is written once where every
      // exam reads it. The copy left in the draft is only a cache.
      const availability = studyAvailabilitySchema.parse(data);
      await deps.plans.saveAvailability(user.id, availability);
      await deps.plans.saveDraft(
        draftId,
        reconcile(data, loaded.subjects, availability),
      );
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
      /** The user accepted the offer to make this exam their focus at the review step. */
      makeFocus = false,
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

      // This exam counts against the day from now on, even though its plan does not exist
      // yet, so the split it is built against is the one it will live with.
      const end = planEnd(loaded.data, today);
      const shares = await dayShares(user, {
        id: syllabusId,
        role: "ALONGSIDE",
        endDate: end,
      });
      const slice = shares.slices.get(syllabusId)!;
      if (slice.every((m) => m === 0))
        return NO_TIME_LEFT(shares.running.length);

      let input: PlanInput = buildInput(
        loaded.data,
        loaded.subjects,
        today,
        slice,
      );
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
        role: shares.ranked.find((e) => e.id === syllabusId)?.role ?? null,
        sharePercent: shares.percentOf(syllabusId),
        output: result,
        adjustments: run.adjustments,
        replanDiff: run.diff,
      });
      await ensureFocus(user);
      // A new exam takes time off every other one, so they are re-planned against what they
      // actually have left rather than left booking a day that is no longer theirs. Taking
      // the focus re-plans everything too, so it stands in for that.
      if (makeFocus) await setExamRole(user, syllabusId, "FOCUS");
      else if (shares.running.length > 1)
        // The new plan was built against this split already; only its siblings moved.
        await replanUser(user, { skip: syllabusId, announce: null });
      return { ok: true, outcome: "PLAN", planId: plan.id };
    },

    /** The exams competing for the user's day, focus first, with the share each one gets. */
    async roles(user: PlanUser) {
      const { ranked, running, percentOf, slices } = await dayShares(user);
      const lead = running[0] ?? null;
      return ranked
        .map((e) => ({
          examId: e.id,
          title: e.title,
          role: e.role,
          endDate: e.endDate,
          focus: e.id === lead?.id,
          sharePercent: percentOf(e.id),
          /** Minutes this exam gets across the week, for the copy. */
          weeklyMinutes: (slices.get(e.id) ?? []).reduce((n, m) => n + m, 0),
          /** More than one exam is running, so the share is worth showing at all. */
          shared: running.length > 1,
        }))
        .sort(
          (a, b) =>
            Number(b.focus) - Number(a.focus) ||
            a.endDate.localeCompare(b.endDate),
        );
    },

    setRole: setExamRole,
    setRoleOrResume,
    pause: pauseExam,
    resume: resumeExam,

    replan: replanExam,

    /**
     * The Sunday job: every user with a plan, one user at a time. Per user, not per plan:
     * someone's two exams share one day, so re-planning them independently would have each
     * one planned against the other's stale share.
     */
    async replanAll() {
      const byUser = new Map<string, PlanUser>();
      for (const p of await deps.plans.allActive()) {
        const { subscriptions, ...rest } = p.user;
        byUser.set(rest.id, {
          ...rest,
          subscription: subscriptions[0] ?? null,
        });
      }
      let remade = 0;
      for (const user of byUser.values()) {
        const result = await replanUser(user).catch(() => null);
        remade += result?.remade ?? 0;
      }
      return remade;
    },

    /**
     * Move, resize or lock a task: stored as an override, then the plan is re-made.
     *
     * One exam, not replanUser: moving a task around inside an exam leaves every exam's
     * share of the day exactly where it was, so there is nothing for the others to react to.
     * The same goes for resetTask and addCustomTask below.
     */
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
