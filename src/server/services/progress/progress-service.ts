import { toLocalDate, today as todayIn, type Clock } from "@/lib/clock";
import { addDays, toDay, type PlanInput } from "@/lib/plan-engine";
import { scheduledExams, type ExamRole } from "@/lib/plans/shares";
import { computeStreak, STREAK_MINUTES } from "@/lib/progress/streak";
import { streakXp, TASK_XP } from "@/lib/progress/xp";
import { fromDbDate } from "@/server/repositories/plan-repository";
import type { PlanRepository } from "@/server/repositories/plan-repository";
import type { ProgressRepository } from "@/server/repositories/progress-repository";
import type { TopicCompletionRepository } from "@/server/repositories/topic-completion-repository";

import { failure, type Result } from "../syllabus/deps";

export type ProgressDeps = {
  progress: ProgressRepository;
  plans: PlanRepository;
  completions: TopicCompletionRepository;
  clock: Clock;
};

type User = { id: string; timezone: string; streakResetAt?: Date | null };

/** How far back streaks look. A longer run still shows, capped at this many days. */
const STREAK_WINDOW = 400;

/** Ticks, streaks, XP and the day's numbers, all derived from the append-only logs. */
export function createProgressService(deps: ProgressDeps) {
  const todayFor = (user: User) => todayIn(deps.clock, user.timezone);

  async function streakOf(user: User, today: string) {
    // After an admin reset (abuse), only days from the reset on count.
    const window = addDays(today, -STREAK_WINDOW);
    const reset = user.streakResetAt
      ? toLocalDate(user.streakResetAt, user.timezone)
      : null;
    const days = await deps.progress.activeDays(
      user.id,
      reset && reset > window ? reset : window,
      STREAK_MINUTES,
    );
    return computeStreak(days, today);
  }

  /** Names for a plan's subjects and topics, from its own snapshot. */
  function namesOf(inputs: unknown) {
    const input = inputs as PlanInput;
    return {
      subjects: new Map(input.subjects.map((s) => [s.id, s.name])),
      topics: new Map(
        input.subjects.flatMap((s) => s.topics.map((t) => [t.id, t.name])),
      ),
      topicIds: input.subjects.flatMap((s) => s.topics.map((t) => t.id)),
    };
  }

  return {
    today: todayFor,
    streak: (user: User) => streakOf(user, todayFor(user)),

    /**
     * Ticks or unticks a task. Appends to the log, moves XP either way, adds the day's
     * streak bonus on its first activity, and marks the topic done once its last study
     * block is.
     */
    async setTaskDone(
      user: User,
      taskId: string,
      done: boolean,
      /** A test's score (0-1): logged for the re-plan, and it re-ticks a done task. */
      accuracy: number | null = null,
    ): Promise<Result<{ streak: number }>> {
      const task = await deps.progress.findTask(taskId, user.id);
      if (!task) return failure("NOT_FOUND", "That task isn't in your plan.");
      if (task.plan.status === "PAUSED")
        return failure(
          "PAUSED",
          "This exam is paused. Resume it to tick its tasks off again.",
        );
      if (task.plan.status !== "ACTIVE")
        return failure(
          "REPLACED",
          "This plan was replaced by a newer one. Tick the task there.",
        );
      const today = todayFor(user);
      const states = await deps.progress.taskStates(user.id, [taskId]);
      const changed = (states.get(taskId) ?? false) !== done;
      // Same state again: nothing to log, unless a test brings a new score.
      if (!changed && accuracy === null) {
        return { ok: true, streak: (await streakOf(user, today)).current };
      }
      const before = await streakOf(user, today);

      await deps.progress.recordTask({
        userId: user.id,
        planId: task.planId,
        taskId: task.id,
        taskKey: task.key,
        type: task.type,
        subjectId: task.subjectId,
        topicId: task.topicId,
        minutes: task.minutes,
        localDate: today,
        done,
        accuracy,
      });
      if (changed)
        await deps.progress.addXp({
          userId: user.id,
          kind: "TASK",
          amount: done ? TASK_XP : -TASK_XP,
          refId: task.id,
          localDate: today,
        });

      const after = await streakOf(user, today);
      if (done && !before.todayDone && after.todayDone) {
        const bonus = streakXp(after.current);
        const already = await deps.progress.xpOn(user.id, today, "STREAK");
        if (bonus > 0 && already === 0)
          await deps.progress.addXp({
            userId: user.id,
            kind: "STREAK",
            amount: bonus,
            refId: null,
            localDate: today,
          });
      }

      if (done && task.type === "STUDY" && task.topicId) {
        const blocks = await deps.progress.studyTasksOfTopic(
          task.planId,
          task.topicId,
        );
        const blockStates = await deps.progress.taskStates(
          user.id,
          blocks.map((b) => b.id),
        );
        const allDone = blocks.every((b) => blockStates.get(b.id));
        const known = await deps.completions.doneAmong(user.id, [task.topicId]);
        if (allDone && !known.has(task.topicId))
          await deps.completions.record(user.id, task.topicId, true);
      }
      return { ok: true, streak: after.current };
    },

    /**
     * A month of the user's plans: minutes and tasks per day, and what got done. Past
     * days show only what was done, never what wasn't (rule 7).
     */
    /** A month of study days: every active plan, or one exam's (its pod's Plan tab). */
    async calendar(user: User, month: string, syllabusVersionId?: string) {
      const today = todayFor(user);
      const first = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const last = addDays(
        `${String(m === 12 ? y! + 1 : y).padStart(4, "0")}-${String(m === 12 ? 1 : m! + 1).padStart(2, "0")}-01`,
        -1,
      );
      const [days, done] = await Promise.all([
        deps.progress.planDaysBetween(user.id, first, last, syllabusVersionId),
        deps.progress.doneCountsBetween(
          user.id,
          first,
          last,
          syllabusVersionId,
        ),
      ]);
      const byDate = new Map<
        string,
        { planId: string; minutes: number; tasks: number }
      >();
      for (const d of days) {
        const date = fromDbDate(d.date);
        const seen = byDate.get(date);
        byDate.set(date, {
          planId: seen?.planId ?? d.planId,
          minutes: (seen?.minutes ?? 0) + d.plannedMinutes,
          tasks: (seen?.tasks ?? 0) + d._count.tasks,
        });
      }
      return { today, first, last, days: byDate, done };
    },

    subjectStats: (user: User, subjectId: string) =>
      deps.progress.subjectStats(user.id, subjectId),

    /** "In your plan" on a topic: its next tasks and why each is there (rule 14). */
    async topicPlan(user: User, topicId: string) {
      const today = todayFor(user);
      const tasks = await deps.progress.topicTasksFrom(user.id, topicId, today);
      return tasks.map((t) => ({ ...t, date: fromDbDate(t.date) }));
    },

    /** One task with its names and done state, for the focus view. */
    async task(user: User, taskId: string) {
      const task = await deps.progress.findTask(taskId, user.id);
      if (!task) return null;
      const plan = await deps.plans.findOwned(task.planId, user.id);
      const names = namesOf(plan!.inputs);
      const states = await deps.progress.taskStates(user.id, [taskId]);
      return {
        ...task,
        active: task.plan.status === "ACTIVE",
        done: states.get(taskId) ?? false,
        subjectName:
          (task.subjectId && names.subjects.get(task.subjectId)) || null,
        topicName: (task.topicId && names.topics.get(task.topicId)) || null,
      };
    },

    /**
     * Everything the Today screen shows. The focus exam leads: its tasks come first and the
     * day's figures are its own, with the other exams gathered below it. With one exam
     * running there is nothing to gather, so the screen is exactly what it always was.
     */
    async todayView(user: User) {
      const today = todayFor(user);
      const [plans, priorities] = await Promise.all([
        deps.plans.listActiveWithInputs(user.id),
        deps.plans.prioritiesFor(user.id),
      ]);

      // Paused exams have no active plan, so they are already absent here.
      const roleOf = new Map(
        priorities.map((p) => [p.syllabusVersionId, p.role]),
      );
      const order = scheduledExams(
        plans.map((p) => ({
          id: p.syllabusVersionId!,
          role: (roleOf.get(p.syllabusVersionId!) ?? "ALONGSIDE") as ExamRole,
          endDate: fromDbDate(p.endDate),
        })),
      );
      const rankOf = new Map(order.map((e, i) => [e.id, i]));
      const focusExamId = order[0]?.id ?? null;

      const planned = await deps.progress.tasksOn(user.id, today);
      const ticked = await deps.progress.doneTasksOn(user.id, today);
      const all = [...planned, ...ticked];
      const states = await deps.progress.taskStates(
        user.id,
        all.map((t) => t.id),
      );

      // Which exam each task belongs to. A task ticked earlier today may sit on a plan a
      // re-plan has since replaced, so those are looked up one by one.
      const examOfPlan = new Map(
        plans.map((p) => [p.id, p.syllabusVersionId!]),
      );
      const names = new Map(plans.map((p) => [p.id, namesOf(p.inputs)]));
      for (const t of all) {
        if (examOfPlan.has(t.planId)) continue;
        const owner = await deps.plans.findOwned(t.planId, user.id);
        if (!owner?.syllabusVersionId) continue;
        examOfPlan.set(t.planId, owner.syllabusVersionId);
        // Replaced plans keep the same names; borrow them from the exam's active plan.
        const active = plans.find(
          (p) => p.syllabusVersionId === owner.syllabusVersionId,
        );
        if (active) names.set(t.planId, names.get(active.id)!);
      }

      /**
       * One row per piece of work, not one per plan row. A re-plan gives a task a new id
       * but the same key, so a task ticked this morning would otherwise show twice: once
       * done on the old plan and once undone on the new one.
       */
      const byWork = new Map<string, (typeof all)[number]>();
      for (const task of all) {
        const examId = examOfPlan.get(task.planId);
        const slot = `${examId ?? task.planId}:${task.key}`;
        const kept = byWork.get(slot);
        if (!kept || (states.get(task.id) && !states.get(kept.id)))
          byWork.set(slot, task);
      }

      const rows = [...byWork.values()]
        .map((t) => {
          const n = names.get(t.planId);
          const examId = examOfPlan.get(t.planId) ?? null;
          return {
            ...t,
            done: states.get(t.id) ?? false,
            examId,
            examTitle:
              plans.find((p) => p.syllabusVersionId === examId)?.title ?? null,
            subjectName: (t.subjectId && n?.subjects.get(t.subjectId)) || null,
            topicName: (t.topicId && n?.topics.get(t.topicId)) || null,
          };
        })
        .sort(
          (a, b) =>
            (rankOf.get(a.examId ?? "") ?? 99) -
              (rankOf.get(b.examId ?? "") ?? 99) ||
            a.planId.localeCompare(b.planId) ||
            a.position - b.position,
        );

      // The day's figures belong to the focus exam: a progress bar averaged across two
      // syllabuses tells the user nothing about either.
      const focusPlan =
        plans.find((p) => p.syllabusVersionId === focusExamId) ?? plans[0];
      const focusTopics = focusPlan ? names.get(focusPlan.id)!.topicIds : [];
      const [streak, topicsDone, nextMock, studied, xp] = await Promise.all([
        streakOf(user, today),
        deps.completions.doneAmong(user.id, focusTopics),
        deps.progress.nextMock(user.id, today),
        deps.progress.studyMinutesOn(user.id, today),
        deps.progress.xpTotal(user.id),
      ]);

      return {
        today,
        hasPlan: plans.length > 0,
        plans: plans.map((p) => ({
          id: p.id,
          title: p.title,
          examId: p.syllabusVersionId,
          diff: p.replanDiff && !p.diffSeenAt ? p.replanDiff : null,
        })),
        /** Every running exam, the focus first, for the sections on screen. */
        exams: order.map((e) => ({
          examId: e.id,
          title: plans.find((p) => p.syllabusVersionId === e.id)?.title ?? "",
          focus: e.id === focusExamId,
        })),
        focusExamId,
        tasks: rows,
        minutesPlanned: rows.reduce((n, t) => n + t.minutes, 0),
        minutesDone: rows
          .filter((t) => t.done)
          .reduce((n, t) => n + t.minutes, 0),
        studiedMinutes: studied,
        daysLeft: focusPlan
          ? toDay(fromDbDate(focusPlan.endDate)) - toDay(today) + 1
          : null,
        coverage: { done: topicsDone.size, total: focusTopics.length },
        nextMock: nextMock
          ? {
              type: nextMock.type,
              date: fromDbDate(nextMock.date),
              subjectName:
                (nextMock.subjectId &&
                  names
                    .get(nextMock.planId)
                    ?.subjects.get(nextMock.subjectId)) ||
                null,
            }
          : null,
        streak,
        xp,
      };
    },
  };
}

export type ProgressService = ReturnType<typeof createProgressService>;
