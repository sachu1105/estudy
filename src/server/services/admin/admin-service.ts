import { today as todayIn, type Clock } from "@/lib/clock";
import { addDays } from "@/lib/plan-engine";
import type { EditableTree } from "@/lib/syllabus/tree";
import type { AdminRepository } from "@/server/repositories/admin-repository";
import type { AuditLogRepository } from "@/server/repositories/audit-log-repository";
import type { RefreshTokenRepository } from "@/server/repositories/refresh-token-repository";
import type { SyllabusRepository } from "@/server/repositories/syllabus-repository";

import { failure, type Result } from "../syllabus/deps";

type Role = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
export type Admin = { id: string; role: Role; ip?: string | null };

export type AdminDeps = {
  admin: AdminRepository;
  audit: AuditLogRepository;
  tokens: RefreshTokenRepository;
  syllabuses: SyllabusRepository;
  clock: Clock;
  newId: () => string;
};

/** Dashboard days are counted in India time, where the users are. */
const TZ = "Asia/Kolkata";
const startOf = (iso: string) => new Date(`${iso}T00:00:00+05:30`);

const NO_USER = failure("NOT_FOUND", "That user doesn't exist.");

/** The admin panel's actions. Each change appends to the audit log (rule 6). */
export function createAdminService(deps: AdminDeps) {
  const log = (
    by: Admin,
    action: string,
    targetId: string | null,
    metadata: Record<string, string | number | boolean | null> = {},
  ) =>
    deps.audit.append({
      actorId: by.id,
      action,
      targetId,
      metadata,
      ip: by.ip ?? null,
    });

  /** Admins may not act on themselves, and only a super admin touches a super admin. */
  async function target(by: Admin, userId: string) {
    const user = await deps.admin.userDetail(userId);
    if (!user) return { ok: false as const, fail: NO_USER };
    if (user.id === by.id)
      return {
        ok: false as const,
        fail: failure("SELF", "Ask another admin to change your own account."),
      };
    if (user.role === "SUPER_ADMIN" && by.role !== "SUPER_ADMIN")
      return {
        ok: false as const,
        fail: failure(
          "FORBIDDEN",
          "Only a super admin can change a super admin.",
        ),
      };
    return { ok: true as const, user };
  }

  return {
    async dashboard() {
      const today = todayIn(deps.clock, TZ);
      return deps.admin.dashboard(
        today,
        startOf(addDays(today, -6)),
        startOf(`${today.slice(0, 7)}-01`),
        startOf(today),
      );
    },

    // ---- Users ----------------------------------------------------------------

    searchUsers: (query: string, page: number) =>
      deps.admin.searchUsers(query, page),

    async user(id: string) {
      const user = await deps.admin.userDetail(id);
      if (!user) return null;
      return { ...user, activity: await deps.admin.userActivity(id) };
    },

    async setStatus(
      by: Admin,
      userId: string,
      status: "ACTIVE" | "SUSPENDED" | "BANNED",
      reason: string,
    ): Promise<Result<object>> {
      const found = await target(by, userId);
      if (!found.ok) return found.fail;
      await deps.admin.setStatus(userId, status);
      // Suspending or banning signs them out everywhere at once.
      if (status !== "ACTIVE")
        await deps.tokens.revokeAllForUser(userId, deps.clock.now());
      await log(by, `admin.user.${status.toLowerCase()}`, userId, { reason });
      return { ok: true };
    },

    async setRole(
      by: Admin,
      userId: string,
      role: Role,
    ): Promise<Result<object>> {
      if (by.role !== "SUPER_ADMIN")
        return failure("FORBIDDEN", "Only a super admin changes roles.");
      const found = await target(by, userId);
      if (!found.ok) return found.fail;
      await deps.admin.setRole(userId, role);
      await log(by, "admin.user.role", userId, {
        from: found.user.role,
        to: role,
      });
      return { ok: true };
    },

    async grantPlan(
      by: Admin,
      userId: string,
      plan: "FREE" | "PRO" | "ELITE",
      months: number | null,
    ): Promise<Result<object>> {
      const found = await target(by, userId);
      if (!found.ok) return found.fail;
      const now = deps.clock.now();
      const periodEnd = months
        ? new Date(now.getTime() + months * 30 * 86_400_000)
        : null;
      await deps.admin.grantPlan(userId, plan, periodEnd);
      await log(by, "admin.user.plan", userId, {
        plan,
        months: months ?? null,
      });
      return { ok: true };
    },

    /** Abuse: the streak starts again from today. The logs themselves are never changed. */
    async resetStreak(
      by: Admin,
      userId: string,
      reason: string,
    ): Promise<Result<object>> {
      const found = await target(by, userId);
      if (!found.ok) return found.fail;
      await deps.admin.resetStreak(userId, deps.clock.now());
      await log(by, "admin.user.streak_reset", userId, { reason });
      return { ok: true };
    },

    // ---- Exams and catalogue -------------------------------------------------

    exams: () => deps.admin.listExams(),

    async createExam(
      by: Admin,
      exam: { name: string; board: string; description: string | null },
    ): Promise<Result<{ id: string }>> {
      const slug = exam.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!slug)
        return failure("BAD_NAME", "Give the exam a name with letters in it.");
      const created = await deps.admin
        .createExam({ ...exam, slug })
        .catch(() => null);
      if (!created)
        return failure("TAKEN", "An exam with that name already exists.");
      await log(by, "admin.exam.create", created.id, { name: exam.name });
      return { ok: true, id: created.id };
    },

    async updateExam(
      by: Admin,
      id: string,
      exam: { name: string; board: string; description: string | null },
    ): Promise<Result<object>> {
      await deps.admin.updateExam(id, exam);
      await log(by, "admin.exam.update", id, { name: exam.name });
      return { ok: true };
    },

    catalogue: (status?: "PENDING" | "APPROVED" | "REJECTED") =>
      deps.admin.catalogue(status),
    forReview: (id: string) => deps.admin.versionForReview(id),
    promotable: (query: string) => deps.admin.promotable(query),

    /**
     * Copies a confirmed upload into the catalogue as PENDING (rule 5): it goes through
     * the same review as any catalogue syllabus. The user's own copy stays theirs.
     */
    async promote(
      by: Admin,
      sourceId: string,
      input: { title: string; examId: string | null },
    ): Promise<Result<{ id: string }>> {
      const source = await deps.admin.versionForReview(sourceId);
      if (
        !source ||
        source.visibility !== "PRIVATE" ||
        source.status !== "APPROVED"
      )
        return failure("NOT_FOUND", "Only a confirmed upload can be promoted.");
      const copy = await deps.admin.createCatalogueCopy({
        title: input.title,
        examId: input.examId,
        parseId: source.parseId,
        fileHash: source.fileHash,
        promotedFromId: source.id,
      });
      const tree: EditableTree = {
        subjects: source.subjects.map((s) => ({
          id: deps.newId(),
          name: s.name,
          topics: s.topics.map((t) => ({
            id: deps.newId(),
            name: t.name,
            weight: t.weight,
            difficulty: t.difficulty,
            foundational: t.foundational,
          })),
        })),
      };
      await deps.syllabuses.replaceTree(copy.id, tree);
      await log(by, "admin.catalogue.promote", copy.id, { from: source.id });
      return { ok: true, id: copy.id };
    },

    async review(
      by: Admin,
      id: string,
      decision: { approve: boolean; note: string | null },
    ): Promise<Result<object>> {
      const version = await deps.admin.versionForReview(id);
      if (!version || version.visibility !== "CATALOGUE")
        return failure("NOT_FOUND", "That isn't a catalogue syllabus.");
      if (decision.approve && version.subjects.length === 0)
        return failure(
          "EMPTY",
          "A syllabus with no subjects can't be approved.",
        );
      if (!decision.approve && !decision.note?.trim())
        return failure("NO_NOTE", "Say why it's rejected, so it can be fixed.");
      await deps.admin.review(id, {
        status: decision.approve ? "APPROVED" : "REJECTED",
        note: decision.approve ? null : decision.note!.trim(),
        by: by.id,
        at: deps.clock.now(),
      });
      await log(
        by,
        decision.approve ? "admin.catalogue.approve" : "admin.catalogue.reject",
        id,
        {
          note: decision.note ?? null,
        },
      );
      return { ok: true };
    },

    // ---- Settings, jobs and the log ------------------------------------------

    logSetting: (by: Admin, key: string) =>
      log(by, `admin.setting.${key}`, null),
    logJob: (
      by: Admin,
      action: "retry" | "discard",
      queue: string,
      jobId: string,
    ) => log(by, `admin.job.${action}`, null, { queue, jobId }),

    aiUsage() {
      const today = todayIn(deps.clock, TZ);
      return deps.admin.aiUsageSince(startOf(`${today.slice(0, 7)}-01`));
    },

    audit: (filters: { action?: string; actorId?: string }, page: number) =>
      deps.admin.audit(filters, page),
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
