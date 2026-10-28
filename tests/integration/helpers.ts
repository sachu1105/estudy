import { fixedClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import type { ChannelType } from "@/lib/squads/templates";
import { prisma } from "@/server/db";
import { createMemoryMailer } from "@/server/email/mailer";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { channelRepository } from "@/server/repositories/channel-repository";
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
    'TRUNCATE "ReminderLog", "NotifyPrefs", "PushSubscription", "Payment", "Notification", "Reaction", "Reply", "Post", "Report", "Block", "GroupTest", "GroupItemFile", "GroupItem", "JoinRequest", "GroupInvite", "Membership", "Group", "AttemptAnswer", "TestAttempt", "MockTest", "QuestionReport", "Question", "AppSetting", "PlanOverride", "ActiveSession", "XpLedger", "StudySession", "TaskCompletion", "PlanTask", "PlanDay", "StudyPlan", "PlanDraft", "TopicCompletion", "PodItemTopic", "PodFile", "PodItem", "Pod", "SectionCache", "AiUsage", "ParseJob", "Topic", "Subject", "SyllabusVersion", "SyllabusParse", "Exam", "AuditLog", "RefreshToken", "EmailVerification", "PasswordReset", "Subscription", "User" CASCADE',
  );
}

export const meta = { ip: "203.0.113.7", userAgent: "vitest" };

/**
 * The typed channels squads were made with before every new channel became a chat:
 * threads, material, links and mock tests. Older squads still have them, so tests of
 * those channels add them to a fresh squad. The threads channel is "questions", clear
 * of the new "doubts" chat.
 */
export function addClassicChannels(groupId: string) {
  return channelRepository.createFromTemplate(groupId, {
    label: "Classic",
    description: "",
    categories: [
      {
        name: "Library",
        channels: [
          ["THREADS", "questions", "Ask a question, answer one"],
          ["MATERIAL", "material", "Notes, PDFs and photos shared from pods"],
          ["LINKS", "links", "Websites worth studying from"],
          ["TESTS", "mock-tests", "Mock tests to take together"],
        ].map(([type, name, topic]) => ({
          type: type as ChannelType,
          name: name!,
          topic: topic!,
          postRule: "EVERYONE" as const,
        })),
      },
    ],
  });
}
