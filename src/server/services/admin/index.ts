import "server-only";

import { notFound } from "next/navigation";

import { canAdmin, type AdminArea } from "@/lib/admin/access";
import { systemClock } from "@/lib/clock";
import { requestMeta, requireRole } from "@/server/auth/session";
import { adminRepository } from "@/server/repositories/admin-repository";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { questionRepository } from "@/server/repositories/question-repository";
import { refreshTokenRepository } from "@/server/repositories/refresh-token-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";

import { createAdminService } from "./admin-service";
import { createQuestionAdmin } from "./question-admin";

export type { Admin } from "./admin-service";
export { THIN_BELOW } from "./question-admin";

export const questionAdmin = createQuestionAdmin({
  questions: questionRepository,
  audit: auditLogRepository,
  clock: systemClock,
});

export const adminService = createAdminService({
  admin: adminRepository,
  audit: auditLogRepository,
  tokens: refreshTokenRepository,
  syllabuses: syllabusRepository,
  clock: systemClock,
  newId: () => crypto.randomUUID(),
});

/**
 * Rule 9 for the admin panel: a staff role, and this role may use this area. Anyone
 * else gets a plain 404, so the panel's shape isn't revealed.
 */
export async function requireAdmin(area: AdminArea) {
  const user = await requireRole("MODERATOR", "ADMIN", "SUPER_ADMIN");
  if (!canAdmin(user.role, area)) notFound();
  const { ip } = await requestMeta();
  return { id: user.id, role: user.role, ip, email: user.email };
}
