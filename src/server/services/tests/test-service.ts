import { today as todayIn, type Clock } from "@/lib/clock";
import {
  pickQuestions,
  scoreAnswers,
  spreadQuestions,
  topicKey,
} from "@/lib/questions/questions";
import type { PodRepository } from "@/server/repositories/pod-repository";
import type { ProgressRepository } from "@/server/repositories/progress-repository";
import type { QuestionRepository } from "@/server/repositories/question-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";

/** Product rules: 5-question checks; 20-30 question section mocks; PSC full mocks. */
export const CHECK_COUNT = 5;
export const SECTION_COUNT = 25;
export const FULL_COUNT = 100;
/** PSC pace: 100 questions in 75 minutes. */
export const SECONDS_PER_QUESTION = 45;
/** Fewer than this and a section or full mock isn't worth taking yet. */
const MIN_MOCK = { SECTION: 5, FULL: 20 } as const;
/** Two points per correct answer (XP: test points). */
export const XP_PER_CORRECT = 2;
const DAY = 86_400_000;

type User = Actor & { timezone: string };

export type TestDeps = {
  questions: QuestionRepository;
  progress: ProgressRepository;
  pods: PodRepository;
  clock: Clock;
  random: () => number;
  limit: (
    user: Actor,
    feature: "afterTaskMocksPerDay" | "sectionMocksPerWeek",
  ) => number;
  /** Ticks the plan task a test belongs to, with its score (progress service). */
  completeTask: (
    user: User,
    taskId: string,
    accuracy: number,
  ) => Promise<unknown>;
};

const THIN = (n: number) =>
  failure(
    "THIN_POOL",
    n === 0
      ? "There are no practice questions for this yet. They're being added; tick the task when you've revised instead."
      : `Only ${n} practice question${n === 1 ? "" : "s"} for this so far, too few for a fair test. Try a topic check instead.`,
  );

/** Mock tests: picked from the verified pool, scored only on the server (milestone 8). */
export function createTestService(deps: TestDeps) {
  const now = () => deps.clock.now();

  async function underLimit(user: User, kind: "CHECK" | "MOCK") {
    if (kind === "CHECK") {
      const max = deps.limit(user, "afterTaskMocksPerDay");
      const used = await deps.questions.countTestsSince(
        user.id,
        ["CHECK"],
        new Date(now().getTime() - DAY),
      );
      return used < max
        ? null
        : failure(
            "LIMIT",
            `Your plan includes ${max} topic checks a day. More tomorrow.`,
          );
    }
    const max = deps.limit(user, "sectionMocksPerWeek");
    const used = await deps.questions.countTestsSince(
      user.id,
      ["SECTION", "FULL"],
      new Date(now().getTime() - 7 * DAY),
    );
    return used < max
      ? null
      : failure(
          "LIMIT",
          `Your plan includes ${max} section or full mock${max === 1 ? "" : "s"} a week.`,
        );
  }

  /** A topic the user has in a pod: their own syllabus, or one they adopted. */
  async function ownTopic(user: User, topicId: string) {
    const topic = await deps.questions.topicInfo(topicId);
    if (!topic) return null;
    const pod = await deps.pods.findBySubject(user.id, topic.subject.id);
    return pod ? topic : null;
  }

  async function checkTest(
    user: User,
    topicId: string,
    planTaskId: string | null,
  ) {
    const topic = await ownTopic(user, topicId);
    if (!topic) return failure("NOT_FOUND", "That topic isn't in your pods.");
    const limited = await underLimit(user, "CHECK");
    if (limited) return limited;
    const pool = await deps.questions.pool([topicKey(topic.name)]);
    if (pool.length === 0) return THIN(0);
    const seen = await deps.questions.timesSeen(
      user.id,
      pool.map((q) => q.id),
    );
    const picked = pickQuestions(pool, CHECK_COUNT, seen, deps.random);
    const test = await deps.questions.createTest({
      userId: user.id,
      type: "CHECK",
      title: `Check: ${topic.name}`,
      syllabusVersionId: topic.subject.syllabusVersionId,
      subjectId: topic.subject.id,
      topicId: topic.id,
      planTaskId,
      questionIds: picked.map((q) => q.id),
      durationSec: null,
      negativeMarking: false,
    });
    return { ok: true as const, testId: test.id };
  }

  async function sectionMock(
    user: User,
    subjectId: string,
    planTaskId: string | null,
  ) {
    const subject = await deps.questions.subjectTopics(subjectId);
    if (!subject || !(await deps.pods.findBySubject(user.id, subjectId)))
      return failure("NOT_FOUND", "That subject isn't in your pods.");
    const limited = await underLimit(user, "MOCK");
    if (limited) return limited;
    const topics = subject.topics.map((t) => ({
      key: topicKey(t.name),
      weight: t.weight,
    }));
    const pool = await deps.questions.pool(topics.map((t) => t.key));
    if (pool.length < MIN_MOCK.SECTION) return THIN(pool.length);
    const seen = await deps.questions.timesSeen(
      user.id,
      pool.map((q) => q.id),
    );
    const picked = spreadQuestions(
      pool,
      topics,
      SECTION_COUNT,
      seen,
      deps.random,
    );
    const test = await deps.questions.createTest({
      userId: user.id,
      type: "SECTION",
      title: `Section mock: ${subject.name}`,
      syllabusVersionId: subject.syllabusVersionId,
      subjectId,
      topicId: null,
      planTaskId,
      questionIds: picked.map((q) => q.id),
      durationSec: picked.length * SECONDS_PER_QUESTION,
      negativeMarking: true,
    });
    return { ok: true as const, testId: test.id };
  }

  async function fullMock(
    user: User,
    syllabusId: string,
    planTaskId: string | null,
  ) {
    const syllabus = await deps.questions.syllabusSubjects(syllabusId);
    const owned = await deps.pods.boardPodIds(user.id, syllabusId);
    if (!syllabus || owned.length === 0)
      return failure("NOT_FOUND", "That exam isn't in your pods.");
    const limited = await underLimit(user, "MOCK");
    if (limited) return limited;
    const topics = syllabus.subjects.flatMap((s) =>
      s.topics.map((t) => ({ key: topicKey(t.name), weight: t.weight })),
    );
    const pool = await deps.questions.pool([
      ...new Set(topics.map((t) => t.key)),
    ]);
    if (pool.length < MIN_MOCK.FULL) return THIN(pool.length);
    const seen = await deps.questions.timesSeen(
      user.id,
      pool.map((q) => q.id),
    );
    const picked = spreadQuestions(pool, topics, FULL_COUNT, seen, deps.random);
    const test = await deps.questions.createTest({
      userId: user.id,
      type: "FULL",
      title: `Full mock: ${syllabus.title}`,
      syllabusVersionId: syllabusId,
      subjectId: null,
      topicId: null,
      planTaskId,
      questionIds: picked.map((q) => q.id),
      durationSec: picked.length * SECONDS_PER_QUESTION,
      negativeMarking: true,
    });
    return { ok: true as const, testId: test.id };
  }

  return {
    practiceTopic: (user: User, topicId: string) =>
      checkTest(user, topicId, null),
    sectionMock: (user: User, subjectId: string) =>
      sectionMock(user, subjectId, null),
    fullMock: (user: User, syllabusId: string) =>
      fullMock(user, syllabusId, null),

    /** "Start" on a plan task: its check test or mock, resumed if one is already open. */
    async startForTask(
      user: User,
      taskId: string,
    ): Promise<Result<{ testId: string }>> {
      const task = await deps.progress.findTask(taskId, user.id);
      if (!task || task.plan.status !== "ACTIVE")
        return failure("NOT_FOUND", "That task isn't in your current plan.");
      const open = await deps.questions.openTestForTask(user.id, taskId);
      if (open) return { ok: true, testId: open.id };
      if (task.type === "CHECK_TEST" && task.topicId)
        return checkTest(user, task.topicId, taskId);
      if (task.type === "SECTION_MOCK" && task.subjectId)
        return sectionMock(user, task.subjectId, taskId);
      if (task.type === "FULL_MOCK" && task.plan.syllabusVersionId)
        return fullMock(user, task.plan.syllabusVersionId, taskId);
      return failure("NOT_A_TEST", "That task isn't a test.");
    },

    /** What the player shows: the questions without answers, and the clock. */
    async forPlayer(user: User, testId: string) {
      const test = await deps.questions.findTest(testId, user.id);
      if (!test) return null;
      if (!test.startedAt) await deps.questions.markStarted(test.id, now());
      const startedAt = test.startedAt ?? now();
      return {
        id: test.id,
        type: test.type,
        title: test.title,
        negativeMarking: test.negativeMarking,
        durationSec: test.durationSec,
        startedAt,
        submitted: test.attempts.length > 0,
        questions: await deps.questions.playerQuestions(test.questionIds),
      };
    },

    /**
     * Scores on the server only. Answers to questions not in the test are ignored; a
     * test is scored once. A plan task's test also ticks the task with its accuracy.
     */
    async submit(
      user: User,
      testId: string,
      answers: {
        questionId: string;
        chosenIndex: number | null;
        flagged: boolean;
      }[],
    ): Promise<Result<{ attemptId: string }>> {
      const test = await deps.questions.findTest(testId, user.id);
      if (!test) return failure("NOT_FOUND", "That test isn't yours.");
      const existing = await deps.questions.attemptFor(testId, user.id);
      if (existing) return { ok: true, attemptId: existing.id };
      const key = await deps.questions.answerKey(test.questionIds);
      const given = new Map(answers.map((a) => [a.questionId, a]));
      const score = scoreAnswers(
        key,
        new Map(key.map((q) => [q.id, given.get(q.id)?.chosenIndex ?? null])),
        test.negativeMarking,
      );
      const started = test.startedAt ?? now();
      const localDate = todayIn(deps.clock, user.timezone);
      const attempt = await deps.questions.createAttempt({
        userId: user.id,
        mockTestId: test.id,
        type: test.type,
        subjectId: test.subjectId,
        topicId: test.topicId,
        ...score,
        durationSec: Math.max(
          0,
          Math.round((now().getTime() - started.getTime()) / 1000),
        ),
        localDate,
        answers: key.map((q, position) => {
          const a = given.get(q.id);
          const chosen = a?.chosenIndex ?? null;
          return {
            questionId: q.id,
            topicKey: q.topicKey,
            position,
            chosenIndex: chosen,
            correct: chosen === q.correctIndex,
            flagged: a?.flagged ?? false,
          };
        }),
      });
      if (score.correct > 0)
        await deps.progress.addXp({
          userId: user.id,
          kind: "TEST",
          amount: score.correct * XP_PER_CORRECT,
          refId: attempt.id,
          localDate,
        });
      if (test.planTaskId)
        await deps.completeTask(user, test.planTaskId, score.accuracy);
      return { ok: true, attemptId: attempt.id };
    },

    /** After submitting: every question with the right answer, the explanation and source. */
    async review(user: User, testId: string) {
      const test = await deps.questions.findTest(testId, user.id);
      if (!test) return null;
      const attempt = await deps.questions.attemptFor(testId, user.id);
      if (!attempt) return null;
      const key = await deps.questions.answerKey(test.questionIds);
      const chosen = new Map(attempt.answers.map((a) => [a.questionId, a]));
      return {
        test: {
          id: test.id,
          title: test.title,
          type: test.type,
          negativeMarking: test.negativeMarking,
        },
        attempt,
        questions: key.map((q) => ({
          ...q,
          chosenIndex: chosen.get(q.id)?.chosenIndex ?? null,
        })),
      };
    },

    async report(
      user: User,
      questionId: string,
      reason: "WRONG_ANSWER" | "UNCLEAR" | "TYPO" | "OTHER",
      note: string | null,
    ): Promise<Result<{ already: boolean }>> {
      const question = await deps.questions.find(questionId);
      if (!question)
        return failure("NOT_FOUND", "That question doesn't exist.");
      const result = await deps.questions.report(
        questionId,
        user.id,
        reason,
        note,
      );
      return { ok: true, ...result };
    },

    history: (user: User, filters: { subjectId?: string } = {}) =>
      deps.questions.attempts(user.id, filters),
  };
}

export type TestService = ReturnType<typeof createTestService>;
