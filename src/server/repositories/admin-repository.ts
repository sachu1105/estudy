import "server-only";

import { prisma } from "@/server/db";
import type {
  Plan,
  Prisma,
  Role,
  UserStatus,
} from "@/server/db/generated/prisma/client";

import { toDbDate } from "./plan-repository";

const PAGE = 25;

/** Queries for the admin panel (milestone 15). Reads are wide; writes are few and logged. */
export const adminRepository = {
  // ---- Dashboard ------------------------------------------------------------------

  async dashboard(
    today: string,
    since: Date,
    monthStart: Date,
    dayStart: Date,
  ) {
    const day = toDbDate(today);
    const [
      users,
      signupsToday,
      signups7,
      activeRows,
      sessions,
      aiToday,
      aiMonth,
      pending,
      failedParses,
      activePlans,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") AS count FROM (
          SELECT "userId" FROM "TaskCompletion" WHERE "localDate" = ${day}
          UNION SELECT "userId" FROM "StudySession" WHERE "localDate" = ${day}
          UNION SELECT "userId" FROM "RefreshToken" WHERE "createdAt" >= ${dayStart}
        ) active`,
      prisma.studySession.aggregate({
        where: { localDate: day },
        _count: true,
        _sum: { activeMinutes: true },
      }),
      prisma.aiUsage.aggregate({
        where: { createdAt: { gte: dayStart } },
        _sum: { costMicros: true },
        _count: true,
      }),
      prisma.aiUsage.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { costMicros: true },
        _count: true,
      }),
      prisma.syllabusVersion.count({
        where: { visibility: "CATALOGUE", status: "PENDING", deletedAt: null },
      }),
      prisma.parseJob.count({
        where: { status: "FAILED", updatedAt: { gte: dayStart } },
      }),
      prisma.studyPlan.count({ where: { status: "ACTIVE" } }),
    ]);
    return {
      users,
      signupsToday,
      signups7,
      activeToday: Number(activeRows[0]?.count ?? 0),
      sessionsToday: sessions._count,
      minutesToday: sessions._sum.activeMinutes ?? 0,
      aiToday: { calls: aiToday._count, micros: aiToday._sum.costMicros ?? 0 },
      aiMonth: { calls: aiMonth._count, micros: aiMonth._sum.costMicros ?? 0 },
      pendingReviews: pending,
      failedParsesToday: failedParses,
      activePlans,
    };
  },

  // ---- Users ----------------------------------------------------------------------

  searchUsers(query: string, page: number) {
    const q = query.trim();
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};
    return prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * PAGE,
        take: PAGE,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          subscriptions: {
            where: { status: { not: "EXPIRED" } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { plan: true, source: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);
  },

  userDetail(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        role: true,
        status: true,
        timezone: true,
        beginnerMode: true,
        emailVerifiedAt: true,
        streakResetAt: true,
        createdAt: true,
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            plan: true,
            status: true,
            source: true,
            periodEnd: true,
            createdAt: true,
          },
        },
        studyPlans: {
          where: { status: "ACTIVE" },
          select: { id: true, title: true, endDate: true },
        },
        _count: {
          select: { pods: true, podItems: true, syllabusVersions: true },
        },
      },
    });
  },

  async userActivity(id: string) {
    const [minutes, xp, lastSession, lastLogin, recent] = await Promise.all([
      prisma.studySession.aggregate({
        where: { userId: id },
        _sum: { activeMinutes: true },
      }),
      prisma.xpLedger.aggregate({
        where: { userId: id },
        _sum: { amount: true },
      }),
      prisma.studySession.findFirst({
        where: { userId: id },
        orderBy: { endedAt: "desc" },
        select: { endedAt: true },
      }),
      prisma.refreshToken.findFirst({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.auditLog.findMany({
        where: { OR: [{ actorId: id }, { targetId: id }] },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { id: true, action: true, createdAt: true, actorId: true },
      }),
    ]);
    return {
      minutes: minutes._sum.activeMinutes ?? 0,
      xp: xp._sum.amount ?? 0,
      lastSession: lastSession?.endedAt ?? null,
      lastLogin: lastLogin?.createdAt ?? null,
      recent,
    };
  },

  setStatus(id: string, status: UserStatus) {
    return prisma.user.update({ where: { id }, data: { status } });
  },

  setRole(id: string, role: Role) {
    return prisma.user.update({ where: { id }, data: { role } });
  },

  resetStreak(id: string, at: Date) {
    return prisma.user.update({ where: { id }, data: { streakResetAt: at } });
  },

  /** An admin grant replaces the current subscription row (rule 8: plans via one place). */
  async grantPlan(userId: string, plan: Plan, periodEnd: Date | null) {
    await prisma.$transaction([
      prisma.subscription.updateMany({
        where: { userId, status: { not: "EXPIRED" } },
        data: { status: "EXPIRED" },
      }),
      prisma.subscription.create({
        data: {
          userId,
          plan,
          status: "ACTIVE",
          source: plan === "FREE" ? "DEFAULT" : "ADMIN_GRANT",
          periodEnd,
        },
      }),
    ]);
  },

  // ---- Exams and catalogue --------------------------------------------------------

  listExams() {
    return prisma.exam.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            syllabuses: { where: { visibility: "CATALOGUE", deletedAt: null } },
          },
        },
      },
    });
  },

  createExam(data: {
    slug: string;
    name: string;
    board: string;
    description: string | null;
  }) {
    return prisma.exam.create({ data });
  },

  updateExam(
    id: string,
    data: { name: string; board: string; description: string | null },
  ) {
    return prisma.exam.update({ where: { id }, data });
  },

  catalogue(status?: "PENDING" | "APPROVED" | "REJECTED") {
    return prisma.syllabusVersion.findMany({
      where: {
        visibility: "CATALOGUE",
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        reviewNote: true,
        updatedAt: true,
        approvedAt: true,
        exam: { select: { name: true } },
        _count: { select: { subjects: true } },
      },
    });
  },

  /** A syllabus with its text and tree, for side-by-side review. Any visibility. */
  versionForReview(id: string) {
    return prisma.syllabusVersion.findFirst({
      where: { id, deletedAt: null },
      include: {
        exam: { select: { id: true, name: true } },
        owner: { select: { id: true, email: true } },
        parse: {
          select: {
            extractedText: true,
            provider: true,
            model: true,
            promptVersion: true,
          },
        },
        subjects: {
          orderBy: { order: "asc" },
          include: { topics: { orderBy: { order: "asc" } } },
        },
      },
    });
  },

  /** Confirmed uploads by users that could become catalogue syllabuses. */
  promotable(query: string) {
    return prisma.syllabusVersion.findMany({
      where: {
        visibility: "PRIVATE",
        status: "APPROVED",
        deletedAt: null,
        ...(query.trim()
          ? { title: { contains: query.trim(), mode: "insensitive" } }
          : {}),
      },
      orderBy: { approvedAt: "desc" },
      take: 25,
      select: {
        id: true,
        title: true,
        approvedAt: true,
        owner: { select: { email: true } },
        exam: { select: { name: true } },
        _count: { select: { subjects: true } },
      },
    });
  },

  createCatalogueCopy(data: {
    title: string;
    examId: string | null;
    parseId: string | null;
    fileHash: string | null;
    promotedFromId: string;
  }) {
    return prisma.syllabusVersion.create({
      data: { ...data, visibility: "CATALOGUE", status: "PENDING" },
    });
  },

  review(
    id: string,
    outcome: {
      status: "APPROVED" | "REJECTED";
      note: string | null;
      by: string;
      at: Date;
    },
  ) {
    return prisma.syllabusVersion.update({
      where: { id },
      data: {
        status: outcome.status,
        reviewNote: outcome.note,
        approvedAt: outcome.status === "APPROVED" ? outcome.at : null,
        approvedById: outcome.status === "APPROVED" ? outcome.by : null,
      },
    });
  },

  // ---- AI usage and the audit log -------------------------------------------------

  aiUsageSince(since: Date) {
    return prisma.aiUsage.groupBy({
      by: ["provider", "model", "promptVersion", "purpose"],
      where: { createdAt: { gte: since } },
      _count: true,
      _sum: { inputTokens: true, outputTokens: true, costMicros: true },
      orderBy: { _sum: { costMicros: "desc" } },
    });
  },

  audit(filters: { action?: string; actorId?: string }, page: number) {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.action ? { action: { startsWith: filters.action } } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
    };
    return prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * PAGE,
        take: PAGE,
        include: { actor: { select: { email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
  },
};

export const ADMIN_PAGE_SIZE = PAGE;
export type AdminRepository = typeof adminRepository;
