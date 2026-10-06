import "server-only";

import { systemClock } from "@/lib/clock";
import { limit } from "@/server/entitlements";
import { planRepository } from "@/server/repositories/plan-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";

import { createPlanService } from "./plan-service";

export type { GenerateOutcome, PlanUser } from "./plan-service";
export type { LeftOutTopic } from "./fit";

export const planService = createPlanService({
  plans: planRepository,
  completions: topicCompletionRepository,
  clock: systemClock,
  activePlanLimit: (user) => limit(user, "activePlans"),
});
