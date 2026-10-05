import type { Clock } from "@/lib/clock";
import type { IdGenerator } from "@/lib/ids";
import type { Mailer } from "@/server/email/mailer";
import type { AuditLogRepository } from "@/server/repositories/audit-log-repository";
import type { OneTimeTokenRepository } from "@/server/repositories/one-time-token-repository";
import type { RefreshTokenRepository } from "@/server/repositories/refresh-token-repository";
import type { UserRepository } from "@/server/repositories/user-repository";

export type AuthDeps = {
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  oneTimeTokens: OneTimeTokenRepository;
  audit: AuditLogRepository;
  mailer: Mailer;
  clock: Clock;
  ids: IdGenerator;
  config: { accessSecret: string; appUrl: string; defaultTimezone: string };
};

/** Where a request came from; stored on refresh tokens and audit entries. */
export type RequestMeta = { ip?: string | null; userAgent?: string | null };

export type Failure<Code extends string> = {
  ok: false;
  code: Code;
  message: string;
};

export function fail<Code extends string>(
  code: Code,
  message: string,
): Failure<Code> {
  return { ok: false, code, message };
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}
