import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { createSmtpMailer } from "@/server/email/mailer";
import { env } from "@/server/env";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { oneTimeTokenRepository } from "@/server/repositories/one-time-token-repository";
import { refreshTokenRepository } from "@/server/repositories/refresh-token-repository";
import { userRepository } from "@/server/repositories/user-repository";

import { createAccountService } from "./account-service";
import type { AuthDeps } from "./deps";
import { createSessionService } from "./session-service";

export type { RequestMeta } from "./deps";

const deps: AuthDeps = {
  users: userRepository,
  refreshTokens: refreshTokenRepository,
  oneTimeTokens: oneTimeTokenRepository,
  audit: auditLogRepository,
  mailer: createSmtpMailer({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.EMAIL_FROM,
  }),
  clock: systemClock,
  ids: randomIds,
  config: {
    accessSecret: env.JWT_ACCESS_SECRET,
    appUrl: env.APP_URL,
    defaultTimezone: env.DEFAULT_TIMEZONE,
  },
};

export const sessionService = createSessionService(deps);
export const accountService = createAccountService(deps);
