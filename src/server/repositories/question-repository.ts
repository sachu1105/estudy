import "server-only";

import type { QuestionInput } from "@/lib/questions/questions";
import { prisma } from "@/server/db";
import type {
  MockTestType,
  Prisma,
  QuestionStatus,
  ReportReason,
} from "@/server/db/generated/prisma/client";

import { toDbDate } from "./plan-repository";

/** Three reports take a question out of tests until an admin looks (milestone 8). */
export const SUPPRESS_AFTER = 3;
const PAGE = 25;

/** The stored columns of a question (the topic name becomes topicKey). */
const fields = (q: QuestionInput & { topicKey: string }) => ({
  topicKey: q.topicKey,
  difficulty: q.difficulty,
  language: q.language,
  body: q.body,
  options: q.options,
  correctIndex: q.correctIndex,
  explanation: q.explanation,
  sourceRef: q.sourceRef,
});

/** What a test-taker may see before submitting: never the answer. */
const playerSelect = {
  id: true,
  body: true,
  options: true,
  language: true,
} as const;

export const questionRepository = {
  // ---- The pool ------------------------------------------------------------------

  createMany(
    questions: (QuestionInput & { topicKey: string; topicId: string | null })[],
    by: {
      id: string;
      status: QuestionStatus;
      source: "ADMIN" | "USER" | "PYQ";
    },
    at: Date,
  ) {
    return prisma.question.createMany({
      data: questions.map((q) => ({
        ...fields(q),
        topicId: q.topicId,
        status: by.status,
        source: by.source,
        createdById: by.id,
        verifiedById: by.status === "VERIFIED" ? by.id : null,
        verifiedAt: by.status === "VERIFIED" ? at : null,
      })),
    });
  },

  update(id: string, q: QuestionInput & { topicKey: string }) {
    return prisma.question.update({ where: { id }, data: fields(q) });
  },

  setStatus(ids: string[], status: QuestionStatus, by: string, at: Date) {
    return prisma.question.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        ...(status === "VERIFIED"
          ? { verifiedById: by, verifiedAt: at, reportCount: 0 }
          : {}),
      },
    });
  },

  /** Resolves open reports when an admin decides about a reported question. */
  resolveReports(questionIds: string[], at: Date) {
    return prisma.questionReport.updateMany({
      where: { questionId: { in: questionIds }, resolvedAt: null },
      data: { resolvedAt: at },
    });
  },

  remove(ids: string[]) {
    return prisma.question.deleteMany({ where: { id: { in: ids } } });
  },

  find(id: string) {
    return prisma.question.findUnique({ where: { id } });
  },

  adminList(filters: { status: QuestionStatus; topic: string }, page: number) {
    const where: Prisma.QuestionWhereInput = {
      status: filters.status,
      ...(filters.topic ? { topicKey: { contains: filters.topic } } : {}),
    };
    return prisma.$transaction([
      prisma.question.findMany({
        where,
        orderBy:
          filters.status === "SUPPRESSED"
            ? [{ reportCount: "desc" }, { updatedAt: "desc" }]
            : { createdAt: "desc" },
        skip: page * PAGE,
        take: PAGE,
        include: {
          reports: {
            where: { resolvedAt: null },
            select: { reason: true, note: true },
          },
        },
      }),
      prisma.question.count({ where }),
    ]);
  },

  /** Verified questions per topic key, for the thin-pool report. */
  async verifiedCounts(keys: string[]) {
    if (keys.length === 0) return new Map<string, number>();
    const rows = await prisma.question.groupBy({
      by: ["topicKey"],
      where: { status: "VERIFIED", topicKey: { in: keys } },
      _count: true,
    });
    return new Map(rows.map((r) => [r.topicKey, r._count]));
  },

  /** Topics of approved catalogue syllabuses: what the pool ought to cover. */
  catalogueTopics() {
    return prisma.topic.findMany({
      where: {
        subject: {
          syllabusVersion: {
            visibility: "CATALOGUE",
            status: "APPROVED",
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        subject: {
          select: { name: true, syllabusVersion: { select: { title: true } } },
        },
      },
    });
  },

  /** Verified questions for any of these topics (by id or by shared name). */
  pool(topicKeys: string[]) {
    return prisma.question.findMany({
      where: { status: "VERIFIED", topicKey: { in: topicKeys } },
      select: { id: true, topicKey: true, difficulty: true },
    });
  },

  /** How often the user has met each question, so tests favour fresh ones. */
  async timesSeen(userId: string, questionIds: string[]) {
    if (questionIds.length === 0) return new Map<string, number>();
    const rows = await prisma.$queryRaw<{ questionId: string; n: bigint }[]>`
      SELECT a."questionId", COUNT(*) AS n
      FROM "AttemptAnswer" a JOIN "TestAttempt" t ON t.id = a."attemptId"
      WHERE t."userId" = ${userId}::uuid AND a."questionId" = ANY(${questionIds}::uuid[])
      GROUP BY a."questionId"`;
    return new Map(rows.map((r) => [r.questionId, Number(r.n)]));
  },

  /** A user's report; the third suppresses the question in the same transaction. */
  async report(
    questionId: string,
    userId: string,
    reason: ReportReason,
    note: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.questionReport.findUnique({
        where: { questionId_userId: { questionId, userId } },
      });
      if (existing) return { already: true };
      await tx.questionReport.create({
        data: { questionId, userId, reason, note },
      });
      const q = await tx.question.update({
        where: { id: questionId },
        data: { reportCount: { increment: 1 } },
      });
      if (q.reportCount >= SUPPRESS_AFTER && q.status === "VERIFIED")
        await tx.question.update({
          where: { id: questionId },
          data: { status: "SUPPRESSED" },
        });
      return { already: false };
    });
  },

  // ---- What a test covers ----------------------------------------------------------

  topicInfo(topicId: string) {
    return prisma.topic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        name: true,
        weight: true,
        subject: { select: { id: true, name: true, syllabusVersionId: true } },
      },
    });
  },

  subjectTopics(subjectId: string) {
    return prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true,
        syllabusVersionId: true,
        topics: { select: { id: true, name: true, weight: true } },
      },
    });
  },

  syllabusSubjects(syllabusVersionId: string) {
    return prisma.syllabusVersion.findUnique({
      where: { id: syllabusVersionId },
      select: {
        id: true,
        title: true,
        subjects: {
          orderBy: { order: "asc" },
          select: { topics: { select: { id: true, name: true, weight: true } } },
        },
      },
    });
  },

  // ---- Tests and attempts ------------------------------------------------------------

  createTest(data: {
    userId: string;
    type: MockTestType;
    title: string;
    syllabusVersionId: string | null;
    subjectId: string | null;
    topicId: string | null;
    planTaskId: string | null;
    questionIds: string[];
    durationSec: number | null;
    negativeMarking: boolean;
  }) {
    return prisma.mockTest.create({ data });
  },

  findTest(id: string, userId: string) {
    return prisma.mockTest.findFirst({
      where: { id, userId },
      include: { attempts: { select: { id: true } } },
    });
  },

  /** An open (unsubmitted) test for a plan task, to resume instead of making another. */
  openTestForTask(userId: string, planTaskId: string) {
    return prisma.mockTest.findFirst({
      where: { userId, planTaskId, attempts: { none: {} } },
      orderBy: { createdAt: "desc" },
    });
  },

  markStarted(id: string, at: Date) {
    return prisma.mockTest.updateMany({
      where: { id, startedAt: null },
      data: { startedAt: at },
    });
  },

  countTestsSince(userId: string, types: MockTestType[], since: Date) {
    return prisma.mockTest.count({
      where: { userId, type: { in: types }, createdAt: { gte: since } },
    });
  },

  /** Questions for the player, in the test's order, without answers. */
  async playerQuestions(ids: string[]) {
    const rows = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: playerSelect,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },

  /** Questions with their answers: for scoring, and for review after submitting. */
  async answerKey(ids: string[]) {
    const rows = await prisma.question.findMany({
      where: { id: { in: ids } },
      select: {
        ...playerSelect,
        correctIndex: true,
        explanation: true,
        topicKey: true,
        source: true,
        sourceRef: true,
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },

  createAttempt(data: {
    userId: string;
    mockTestId: string;
    type: MockTestType;
    subjectId: string | null;
    topicId: string | null;
    total: number;
    correct: number;
    wrong: number;
    skipped: number;
    score: number;
    accuracy: number;
    durationSec: number;
    localDate: string;
    answers: {
      questionId: string;
      topicKey: string;
      position: number;
      chosenIndex: number | null;
      correct: boolean;
      flagged: boolean;
    }[];
  }) {
    const { answers, localDate, ...attempt } = data;
    return prisma.testAttempt.create({
      data: {
        ...attempt,
        localDate: toDbDate(localDate),
        answers: { create: answers },
      },
    });
  },

  attemptFor(mockTestId: string, userId: string) {
    return prisma.testAttempt.findFirst({
      where: { mockTestId, userId },
      include: { answers: { orderBy: { position: "asc" } } },
    });
  },

  attempts(userId: string, filters: { subjectId?: string }, take = 20) {
    return prisma.testAttempt.findMany({
      where: {
        userId,
        ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: { mockTest: { select: { title: true } } },
    });
  },
};

export type QuestionRepository = typeof questionRepository;
