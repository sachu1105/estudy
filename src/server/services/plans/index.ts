import "server-only";

import { systemClock } from "@/lib/clock";
import { limit } from "@/server/entitlements";
import { planRepository } from "@/server/repositories/plan-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";

import { createPlanService } from "./plan-service";

export type { GenerateOutcome, PlanUser, TaskEdit } from "./plan-service";
export type { LeftOutTopic } from "./fit";

export const planService = createPlanService({
  plans: planRepository,
  progress: progressRepository,
  completions: topicCompletionRepository,
  clock: systemClock,
  activePlanLimit: (user) => limit(user, "activePlans"),
});
