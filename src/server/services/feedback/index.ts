import "server-only";

import { systemClock } from "@/lib/clock";
import { feedbackRepository } from "@/server/repositories/feedback-repository";

import { createFeedbackService } from "./feedback-service";

export const feedbackService = createFeedbackService({
  feedback: feedbackRepository,
  clock: systemClock,
});
