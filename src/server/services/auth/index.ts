import "server-only";

import { systemClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { mailer } from "@/server/email";
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
  mailer,
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
