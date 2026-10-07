import type { Clock } from "@/lib/clock";
import type { PlanRepository } from "@/server/repositories/plan-repository";
import type { PodRepository } from "@/server/repositories/pod-repository";
import type { SyllabusRepository } from "@/server/repositories/syllabus-repository";
import type { ObjectStorage } from "@/server/storage/types";

import { failure, type Result } from "../syllabus/deps";

export type ExamDeps = {
  pods: PodRepository;
  plans: PlanRepository;
  syllabuses: SyllabusRepository;
  storage: ObjectStorage;
  clock: Clock;
};

type User = { id: string };

/** The exam pod as a whole: one syllabus, its subject pods and its plan. */
export function createExamService(deps: ExamDeps) {
  return {
    /**
     * Deletes an exam pod in one go, so nothing is left half-removed: the plan stops
     * (Today no longer shows it), empty subject pods go, and pods holding material stay
     * as the user's own. The user's own upload is deleted and stops counting toward
     * their uploads; a catalogue syllabus is shared, so only the user's pods go.
     */
    async remove(
      user: User,
      syllabusId: string,
    ): Promise<Result<{ kept: number }>> {
      const [podIds, own] = await Promise.all([
        deps.pods.boardPodIds(user.id, syllabusId),
        deps.syllabuses.findOwned(syllabusId, user.id),
      ]);
      if (podIds.length === 0 && !own)
        return failure("NOT_FOUND", "That exam doesn't exist or isn't yours.");
      const now = deps.clock.now();
      await deps.plans.archiveForExam(user.id, syllabusId);
      const { kept } = await deps.pods.releaseExam(user.id, syllabusId, now);
      if (own) {
        await deps.syllabuses.softDelete(syllabusId, now);
        if (own.sourceFileKey) await deps.storage.delete(own.sourceFileKey);
      }
      return { ok: true, kept };
    },
  };
}

export type ExamService = ReturnType<typeof createExamService>;
