import "server-only";

import { systemClock } from "@/lib/clock";
import { limit } from "@/server/entitlements";
import { podRepository } from "@/server/repositories/pod-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import { questionRepository } from "@/server/repositories/question-repository";
import { progressService } from "@/server/services/progress";

import { createTestService } from "./test-service";

export const testService = createTestService({
  questions: questionRepository,
  progress: progressRepository,
  pods: podRepository,
  clock: systemClock,
  random: Math.random,
  limit,
  completeTask: (user, taskId, accuracy) =>
    progressService.setTaskDone(user, taskId, true, accuracy),
});
