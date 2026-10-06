import { today as todayIn, type Clock } from "@/lib/clock";
import { addDays, toDay, type PlanInput } from "@/lib/plan-engine";
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

type User = { id: string; timezone: string };

/** How far back streaks look. A longer run still shows, capped at this many days. */
const STREAK_WINDOW = 400;

/** Ticks, streaks, XP and the day's numbers, all derived from the append-only logs. */
export function createProgressService(deps: ProgressDeps) {
  const todayFor = (user: User) => todayIn(deps.clock, user.timezone);

  async function streakOf(user: User, today: string) {
    const days = await deps.progress.activeDays(
      user.id,
      addDays(today, -STREAK_WINDOW),
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
    ): Promise<Result<{ streak: number }>> {
      const task = await deps.progress.findTask(taskId, user.id);
      if (!task) return failure("NOT_FOUND", "That task isn't in your plan.");
      if (task.plan.status !== "ACTIVE")
        return failure(
          "REPLACED",
          "This plan was replaced by a newer one. Tick the task there.",
        );
      const today = todayFor(user);
      const states = await deps.progress.taskStates(user.id, [taskId]);
      if ((states.get(taskId) ?? false) === done) {
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
      });
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
    async calendar(user: User, month: string) {
      const today = todayFor(user);
      const first = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const last = addDays(
        `${String(m === 12 ? y! + 1 : y).padStart(4, "0")}-${String(m === 12 ? 1 : m! + 1).padStart(2, "0")}-01`,
        -1,
      );
      const [days, done] = await Promise.all([
        deps.progress.planDaysBetween(user.id, first, last),
        deps.progress.doneCountsBetween(user.id, first, last),
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

    /** Everything the Today screen shows, across the user's active plans. */
    async todayView(user: User) {
      const today = todayFor(user);
      const plans = await deps.plans.listActiveWithInputs(user.id);
      const planned = await deps.progress.tasksOn(user.id, today);
      // Ticked today on a plan that a re-plan has since replaced: still today's work.
      const earlier = (await deps.progress.doneTasksOn(user.id, today)).filter(
        (t) => !planned.some((p) => p.id === t.id),
      );
      const tasks = [...planned, ...earlier];
      const states = await deps.progress.taskStates(
        user.id,
        tasks.map((t) => t.id),
      );
      const names = new Map(plans.map((p) => [p.id, namesOf(p.inputs)]));
      // Replaced plans keep the same names; borrow them from the exam's active plan.
      const byExam = new Map(plans.map((p) => [p.syllabusVersionId, p.id]));
      for (const t of tasks)
        if (!names.has(t.planId)) {
          const owner = await deps.plans.findOwned(t.planId, user.id);
          const active = owner && byExam.get(owner.syllabusVersionId);
          if (active) names.set(t.planId, names.get(active)!);
        }
      const allTopics = [
        ...new Set(plans.flatMap((p) => names.get(p.id)!.topicIds)),
      ];
      const [streak, topicsDone, nextMock, studied, xp] = await Promise.all([
        streakOf(user, today),
        deps.completions.doneAmong(user.id, allTopics),
        deps.progress.nextMock(user.id, today),
        deps.progress.studyMinutesOn(user.id, today),
        deps.progress.xpTotal(user.id),
      ]);
      const rows = tasks.map((t) => {
        const n = names.get(t.planId);
        return {
          ...t,
          done: states.get(t.id) ?? false,
          subjectName: (t.subjectId && n?.subjects.get(t.subjectId)) || null,
          topicName: (t.topicId && n?.topics.get(t.topicId)) || null,
        };
      });
      const ending = plans
        .map((p) => fromDbDate(p.endDate))
        .sort((a, b) => toDay(a) - toDay(b))[0];
      return {
        today,
        hasPlan: plans.length > 0,
        plans: plans.map((p) => ({
          id: p.id,
          title: p.title,
          diff: p.replanDiff && !p.diffSeenAt ? p.replanDiff : null,
        })),
        tasks: rows,
        minutesPlanned: rows.reduce((n, t) => n + t.minutes, 0),
        minutesDone: rows
          .filter((t) => t.done)
          .reduce((n, t) => n + t.minutes, 0),
        studiedMinutes: studied,
        daysLeft: ending ? toDay(ending) - toDay(today) + 1 : null,
        coverage: { done: topicsDone.size, total: allTopics.length },
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
