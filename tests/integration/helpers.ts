import { fixedClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { prisma } from "@/server/db";
import { createMemoryMailer } from "@/server/email/mailer";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { oneTimeTokenRepository } from "@/server/repositories/one-time-token-repository";
import { refreshTokenRepository } from "@/server/repositories/refresh-token-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { createAccountService } from "@/server/services/auth/account-service";
import type { AuthDeps } from "@/server/services/auth/deps";
import { createSessionService } from "@/server/services/auth/session-service";

export const ACCESS_SECRET = "integration-access-secret-0123456789abcdef";

/** Real repositories and database; fake clock and mailer. */
export function buildAuth(start = "2026-10-05T04:30:00Z") {
  const clock = fixedClock(start);
  const mailer = createMemoryMailer();
  const deps: AuthDeps = {
    users: userRepository,
    refreshTokens: refreshTokenRepository,
    oneTimeTokens: oneTimeTokenRepository,
    audit: auditLogRepository,
    mailer,
    clock,
    ids: randomIds,
    config: {
      accessSecret: ACCESS_SECRET,
      appUrl: "http://localhost:3000",
      defaultTimezone: "Asia/Kolkata",
    },
  };
  return {
    clock,
    mailer,
    session: createSessionService(deps),
    account: createAccountService(deps),
  };
}

/** Pulls the token out of the most recent email's link. */
export function tokenFromLastEmail(
  mailer: ReturnType<typeof createMemoryMailer>,
) {
  const text = mailer.sent.at(-1)?.text ?? "";
  const match = text.match(/token=([\w-]+)/);
  if (!match) throw new Error(`No token in email: ${text}`);
  return match[1];
}

export async function resetDatabase() {
  // TRUNCATE is not blocked by the append-only row triggers.
  await prisma.$executeRawUnsafe(
    'TRUNCATE "AiUsage", "ParseJob", "Topic", "Subject", "SyllabusVersion", "SyllabusParse", "Exam", "AuditLog", "RefreshToken", "EmailVerification", "PasswordReset", "Subscription", "User" CASCADE',
  );
}

export const meta = { ip: "203.0.113.7", userAgent: "vitest" };
