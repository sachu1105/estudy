import { today as todayIn, type Clock } from "@/lib/clock";
import { studyXp } from "@/lib/progress/xp";
import type { ProgressRepository } from "@/server/repositories/progress-repository";

import { failure, type Result } from "../syllabus/deps";
import type { ProgressService } from "./progress-service";

/** A heartbeat later than this only counts this much: the rest wasn't active study. */
export const MAX_BEAT_SECONDS = 90;

type User = { id: string; timezone: string };

type Active = NonNullable<
  Awaited<ReturnType<ProgressRepository["activeSession"]>>
>;

/**
 * The focus timer. State lives on the server so a refresh never loses it; the browser
 * beats every 60 s and only time between beats (capped) counts as studied.
 */
export function createSessionService(deps: {
  progress: ProgressRepository;
  tasks: ProgressService;
  clock: Clock;
}) {
  /** Active seconds including the time since the last beat, capped. */
  function secondsOf(session: Active, now: Date) {
    if (session.paused) return session.activeSeconds;
    const gap = Math.floor(
      (now.getTime() - session.lastBeatAt.getTime()) / 1000,
    );
    return session.activeSeconds + Math.max(0, Math.min(MAX_BEAT_SECONDS, gap));
  }

  /** Closes a session: logs its minutes (if any) and their XP, then clears it. */
  async function close(user: User, session: Active) {
    const now = deps.clock.now();
    const minutes = Math.floor(secondsOf(session, now) / 60);
    const today = todayIn(deps.clock, user.timezone);
    const task = await deps.progress.findTask(session.taskId, user.id);
    await deps.progress.endSession(user.id);
    if (minutes <= 0 || !task) return 0;
    const studyRow = await deps.progress.recordStudy({
      userId: user.id,
      planId: session.planId,
      taskId: session.taskId,
      subjectId: task.subjectId,
      topicId: task.topicId,
      startedAt: session.startedAt,
      endedAt: now,
      activeMinutes: minutes,
      localDate: today,
    });
    const earned = await deps.progress.xpOn(user.id, today, "STUDY");
    const xp = studyXp(minutes, earned);
    if (xp > 0)
      await deps.progress.addXp({
        userId: user.id,
        kind: "STUDY",
        amount: xp,
        refId: studyRow.id,
        localDate: today,
      });
    return minutes;
  }

  const view = (session: Active) => ({
    taskId: session.taskId,
    seconds: secondsOf(session, deps.clock.now()),
    paused: session.paused,
  });

  return {
    async get(user: User) {
      const session = await deps.progress.activeSession(user.id);
      return session ? view(session) : null;
    },

    /** Starts (or resumes) the timer on a task. Another task's timer is closed first. */
    async start(
      user: User,
      taskId: string,
    ): Promise<Result<ReturnType<typeof view> & { closedOther: number }>> {
      const task = await deps.progress.findTask(taskId, user.id);
      if (!task || task.plan.status !== "ACTIVE")
        return failure("NOT_FOUND", "That task isn't in your current plan.");
      const existing = await deps.progress.activeSession(user.id);
      if (existing?.taskId === taskId)
        return { ok: true, ...view(existing), closedOther: 0 };
      const closedOther = existing ? await close(user, existing) : 0;
      const session = await deps.progress.startSession({
        userId: user.id,
        planId: task.planId,
        taskId,
        at: deps.clock.now(),
      });
      return { ok: true, ...view(session), closedOther };
    },

    /** Heartbeat, pause and resume all bank the time since the last beat. */
    async beat(user: User, paused?: boolean) {
      const session = await deps.progress.activeSession(user.id);
      if (!session) return null;
      const now = deps.clock.now();
      const updated = await deps.progress.updateSession(user.id, {
        activeSeconds: secondsOf(session, now),
        lastBeatAt: now,
        ...(paused === undefined ? {} : { paused }),
      });
      return view(updated);
    },

    /** Ends the timer, logging its minutes; `complete` also ticks the task. */
    async finish(
      user: User,
      complete: boolean,
    ): Promise<Result<{ minutes: number; taskId: string | null }>> {
      const session = await deps.progress.activeSession(user.id);
      if (!session) return { ok: true, minutes: 0, taskId: null };
      const minutes = await close(user, session);
      if (complete) {
        const ticked = await deps.tasks.setTaskDone(user, session.taskId, true);
        if (!ticked.ok) return ticked;
      }
      return { ok: true, minutes, taskId: session.taskId };
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
