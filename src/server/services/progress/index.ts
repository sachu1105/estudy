import "server-only";

import { systemClock } from "@/lib/clock";
import { planRepository } from "@/server/repositories/plan-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";

import { createProgressService } from "./progress-service";
import { createSessionService } from "./session-service";

export const progressService = createProgressService({
  progress: progressRepository,
  plans: planRepository,
  completions: topicCompletionRepository,
  clock: systemClock,
});

export const sessionService = createSessionService({
  progress: progressRepository,
  tasks: progressService,
  clock: systemClock,
});
