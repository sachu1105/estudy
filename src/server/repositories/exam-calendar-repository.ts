import "server-only";

import { Prisma } from "@/server/db/generated/prisma/client";
import type {
  ExamReminderKind,
  ProgrammeStage,
  ProgrammeStatus,
} from "@/server/db/generated/prisma/client";
import { prisma } from "@/server/db";

/** An exam date's fields as the reader and the admin form give them (ISO dates). */
export type ExamDateFields = {
  board: string;
  catNo: string | null;
  post: string;
  department: string | null;
  scope: string | null;
  examOn: string;
  timeText: string | null;
  confirmFrom: string | null;
  confirmTo: string | null;
  confirmNote: string | null;
  ticketsFrom: string | null;
  mode: string | null;
  medium: string | null;
  duration: string | null;
  candidates: number | null;
  syllabusUrl: string | null;
};

const day = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

const dateData = (f: ExamDateFields) => ({
  ...f,
  examOn: day(f.examOn)!,
  confirmFrom: day(f.confirmFrom),
  confirmTo: day(f.confirmTo),
  ticketsFrom: day(f.ticketsFrom),
});

export const DATE_SELECT = {
  id: true,
  programmeId: true,
  board: true,
  catNo: true,
  post: true,
  department: true,
  scope: true,
  examOn: true,
  timeText: true,
  confirmFrom: true,
  confirmTo: true,
  confirmNote: true,
  ticketsFrom: true,
  mode: true,
  medium: true,
  duration: true,
  candidates: true,
  syllabusUrl: true,
  cancelled: true,
  publishedAt: true,
  replacedAt: true,
  programme: {
    select: { id: true, title: true, url: true, stage: true, month: true },
  },
} satisfies Prisma.ExamDateSelect;

export type ExamDateRow = Prisma.ExamDateGetPayload<{
  select: typeof DATE_SELECT;
}>;

/** Live: published, not replaced by a later programme. */
const LIVE = { publishedAt: { not: null }, replacedAt: null } as const;

/** Exam dates: watched sources, programmes read from them, dates, follows, reminders. */
export const examCalendarRepository = {
  // ---- Sources --------------------------------------------------------------------
  sources() {
    return prisma.examSource.findMany({ orderBy: { createdAt: "asc" } });
  },
  enabledSources() {
    return prisma.examSource.findMany({ where: { enabled: true } });
  },
  setSourceEnabled(id: string, enabled: boolean) {
    return prisma.examSource.update({ where: { id }, data: { enabled } });
  },
  markChecked(id: string, at: Date, error: string | null) {
    return prisma.examSource.update({
      where: { id },
      data: { lastCheckedAt: at, lastError: error },
    });
  },

  // ---- Programmes -----------------------------------------------------------------
  async knownProgramme(url: string, sha256?: string) {
    return prisma.examProgramme.findFirst({
      where: { OR: [{ url }, ...(sha256 ? [{ sha256 }] : [])] },
      select: { id: true },
    });
  },

  /** A programme as read, PENDING, with its rows (not yet published). */
  createProgramme(data: {
    sourceId: string | null;
    board: string;
    url: string | null;
    storageKey: string | null;
    sha256: string;
    title: string;
    month: string | null;
    stage: ProgrammeStage;
    notes: string[];
    cancelled: string[];
    problems: string[];
    rows: ExamDateFields[];
  }) {
    const { rows, month, ...programme } = data;
    return prisma.examProgramme.create({
      data: {
        ...programme,
        month: day(month),
        dates: { create: rows.map(dateData) },
      },
      select: { id: true },
    });
  },

  programmes(status?: ProgrammeStatus) {
    return prisma.examProgramme.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        board: true,
        title: true,
        url: true,
        month: true,
        stage: true,
        status: true,
        problems: true,
        cancelled: true,
        createdAt: true,
        reviewedAt: true,
        source: { select: { listUrl: true } },
        _count: { select: { dates: true } },
      },
    });
  },

  programme(id: string) {
    return prisma.examProgramme.findUnique({
      where: { id },
      select: {
        id: true,
        board: true,
        title: true,
        url: true,
        month: true,
        stage: true,
        status: true,
        notes: true,
        problems: true,
        cancelled: true,
        createdAt: true,
        dates: { select: DATE_SELECT, orderBy: [{ examOn: "asc" }, { createdAt: "asc" }] },
      },
    });
  },

  setProgrammeStatus(
    id: string,
    status: ProgrammeStatus,
    reviewerId: string,
    at: Date,
  ) {
    return prisma.examProgramme.update({
      where: { id },
      data: { status, reviewedById: reviewerId, reviewedAt: at },
    });
  },

  /**
   * Publishes a programme's rows. A row for the same post and place in an earlier
   * programme for the same month is replaced by it; posts the programme cancels are
   * marked cancelled wherever they're live. Returns what changed for the people who
   * follow those posts.
   */
  async publishProgramme(id: string, at: Date) {
    return prisma.$transaction(async (tx) => {
      const programme = await tx.examProgramme.findUniqueOrThrow({
        where: { id },
        select: {
          month: true,
          cancelled: true,
          dates: { select: DATE_SELECT },
        },
      });
      const moved: { catNo: string; post: string; from: Date; to: Date }[] = [];
      for (const row of programme.dates) {
        if (!row.catNo) continue;
        const earlier = await tx.examDate.findMany({
          where: {
            ...LIVE,
            catNo: row.catNo,
            scope: row.scope,
            id: { not: row.id },
            programmeId: { not: id },
            OR: [
              { programme: { month: programme.month } },
              { programmeId: null },
            ],
          },
          select: { id: true, examOn: true },
        });
        if (earlier.length === 0) continue;
        await tx.examDate.updateMany({
          where: { id: { in: earlier.map((e) => e.id) } },
          data: { replacedAt: at },
        });
        const was = earlier.find((e) => e.examOn.getTime() !== row.examOn.getTime());
        if (was && !moved.some((m) => m.catNo === row.catNo))
          moved.push({ catNo: row.catNo, post: row.post, from: was.examOn, to: row.examOn });
      }
      await tx.examDate.updateMany({
        where: { programmeId: id },
        data: { publishedAt: at },
      });
      const cancelled = programme.cancelled.length
        ? await tx.examDate.findMany({
            where: { ...LIVE, catNo: { in: programme.cancelled }, cancelled: false },
            select: { id: true, catNo: true, post: true, examOn: true },
          })
        : [];
      if (cancelled.length)
        await tx.examDate.updateMany({
          where: { id: { in: cancelled.map((c) => c.id) } },
          data: { cancelled: true },
        });
      return { moved, cancelled };
    });
  },

  // ---- Dates ----------------------------------------------------------------------
  createDate(fields: ExamDateFields, by: string, at: Date) {
    return prisma.examDate.create({
      data: { ...dateData(fields), createdById: by, publishedAt: at },
      select: { id: true },
    });
  },
  updateDate(id: string, fields: ExamDateFields & { cancelled: boolean }) {
    return prisma.examDate.update({
      where: { id },
      data: dateData(fields),
      select: DATE_SELECT,
    });
  },
  findDate(id: string) {
    return prisma.examDate.findUnique({ where: { id }, select: DATE_SELECT });
  },
  deleteDate(id: string) {
    return prisma.examDate.delete({ where: { id } });
  },
  /** Hand-added dates (no programme), newest first, for the admin page. */
  handAdded() {
    return prisma.examDate.findMany({
      where: { programmeId: null, replacedAt: null },
      orderBy: { examOn: "desc" },
      take: 50,
      select: DATE_SELECT,
    });
  },

  /** Live dates from `from` on (and recent ones, for the reminders' "moved"). */
  upcoming(from: Date, catNos?: string[]) {
    return prisma.examDate.findMany({
      where: {
        ...LIVE,
        examOn: { gte: from },
        ...(catNos ? { catNo: { in: catNos } } : {}),
      },
      orderBy: [{ examOn: "asc" }, { createdAt: "asc" }],
      take: 2000,
      select: DATE_SELECT,
    });
  },

  // ---- Follows --------------------------------------------------------------------
  follows(userId: string) {
    return prisma.examFollow.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        catNo: true,
        syllabusVersionId: true,
        syllabusVersion: { select: { id: true, title: true } },
      },
    });
  },
  async follow(userId: string, catNo: string, syllabusVersionId: string | null) {
    await prisma.examFollow.upsert({
      where: { userId_catNo: { userId, catNo } },
      create: { userId, catNo, syllabusVersionId },
      update: { syllabusVersionId },
    });
  },
  async unfollow(userId: string, catNo: string) {
    await prisma.examFollow.deleteMany({ where: { userId, catNo } });
  },
  /** Who follows these posts, with the zone their "today" is in. */
  followers(catNos: string[]) {
    return prisma.examFollow.findMany({
      where: { catNo: { in: catNos } },
      select: {
        catNo: true,
        user: { select: { id: true, timezone: true } },
      },
    });
  },

  /** Whether they have an exam pod for this syllabus (pods made from it). */
  async hasExamPod(userId: string, syllabusVersionId: string) {
    return !!(await prisma.pod.findFirst({
      where: { ownerId: userId, syllabusVersionId },
      select: { id: true },
    }));
  },
  /** Their exam pods: the syllabuses their pods were made from. */
  async examPods(userId: string) {
    const pods = await prisma.pod.findMany({
      where: { ownerId: userId, syllabusVersionId: { not: null } },
      distinct: ["syllabusVersionId"],
      select: { syllabusVersion: { select: { id: true, title: true } } },
    });
    return pods.flatMap((p) => (p.syllabusVersion ? [p.syllabusVersion] : []));
  },

  // ---- Reminders ------------------------------------------------------------------
  /** Records a reminder; false when it was already sent. */
  async remember(
    userId: string,
    catNo: string,
    examOn: Date,
    kind: ExamReminderKind,
  ) {
    try {
      await prisma.examReminder.create({ data: { userId, catNo, examOn, kind } });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return false;
      throw error;
    }
  },
};

export type ExamCalendarRepository = typeof examCalendarRepository;
