import "server-only";

import { systemClock } from "@/lib/clock";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { feedbackRepository } from "@/server/repositories/feedback-repository";
import { notificationService } from "@/server/services/notifications";

import { createFeedbackService } from "./feedback-service";

export type { Contributor, IdeaView, ProblemView } from "./feedback-service";

export const feedbackService = createFeedbackService({
  feedback: feedbackRepository,
  audit: auditLogRepository,
  notify: (rows) => notificationService.notify(rows),
  clock: systemClock,
});
