import type { Clock } from "@/lib/clock";
import { POD_STAGES, type Board } from "@/lib/pods/stages";
import type { PodRepository } from "@/server/repositories/pod-repository";
import type { SyllabusRepository } from "@/server/repositories/syllabus-repository";
import type { TopicCompletionRepository } from "@/server/repositories/topic-completion-repository";

import { failure, type Result } from "../syllabus/deps";

export type PodDeps = {
  pods: PodRepository;
  syllabuses: SyllabusRepository;
  completions: TopicCompletionRepository;
  clock: Clock;
};

type User = { id: string };

const NOT_FOUND = failure(
  "NOT_FOUND",
  "That pod doesn't exist or isn't yours.",
);

type PodSummary = Awaited<
  ReturnType<ReturnType<typeof createPodService>["list"]>
>[number];

const examOf = (syllabus: NonNullable<PodSummary["syllabus"]>) => ({
  id: syllabus.id,
  title: syllabus.title,
  examName: syllabus.exam?.name ?? null,
  pods: [] as PodSummary[],
  topics: 0,
  topicsDone: 0,
  items: 0,
});

/** Subject pods: a subject's topics, completion and material in one place. */
export function createPodService(deps: PodDeps) {
  return {
    /**
     * Gives the user a pod per subject of an approved syllabus they may use: their own
     * confirmed upload, or an approved catalogue syllabus. Safe to call repeatedly.
     */
    async syncFromSyllabus(
      user: User,
      versionId: string,
    ): Promise<Result<object>> {
      const own = await deps.syllabuses.findOwned(versionId, user.id);
      const usable =
        (own && own.status === "APPROVED") ||
        (await deps.syllabuses.findApprovedCatalogue(versionId));
      if (!usable)
        return failure(
          "NOT_READY",
          "Confirm the syllabus first, then its pods appear.",
        );
      await deps.pods.syncSubjectPods(user.id, versionId);
      return { ok: true };
    },

    /** Every pod, grouped by syllabus, with how many topics are done in each. */
    async list(user: User) {
      const pods = await deps.pods.listOwned(user.id);
      const topicIds = pods.flatMap(
        (p) => p.subject?.topics.map((t) => t.id) ?? [],
      );
      const done = await deps.completions.doneAmong(user.id, topicIds);
      return pods.map((p) => {
        const topics = p.subject?.topics ?? [];
        return {
          id: p.id,
          name: p.name,
          kind: p.kind,
          stage: p.stage,
          stageOrder: p.stageOrder,
          order: p.order,
          syllabus: p.syllabusVersion,
          topics,
          topicsDone: topics.filter((t) => done.has(t.id)).length,
          items: p._count.items,
        };
      });
    },

    /**
     * Exam pods: one per syllabus, holding its subject pods. Nothing is stored for them;
     * they are the subject pods grouped, with totals across the exam.
     */
    async exams(user: User) {
      const pods = await this.list(user);
      const exams = new Map<string, ReturnType<typeof examOf>>();
      for (const pod of pods) {
        if (pod.kind !== "SUBJECT" || !pod.syllabus) continue;
        const exam = exams.get(pod.syllabus.id) ?? examOf(pod.syllabus);
        exam.pods.push(pod);
        exam.topics += pod.topics.length;
        exam.topicsDone += pod.topicsDone;
        exam.items += pod.items;
        exams.set(pod.syllabus.id, exam);
      }
      return {
        exams: [...exams.values()],
        own: pods.filter((p) => p.kind === "CUSTOM"),
      };
    },

    /** One exam pod, and whether the user may edit its syllabus (their own upload). */
    async exam(user: User, syllabusId: string) {
      const { exams } = await this.exams(user);
      const exam = exams.find((e) => e.id === syllabusId);
      if (!exam) return null;
      const own = await deps.syllabuses.findOwned(syllabusId, user.id);
      return { ...exam, editable: Boolean(own) };
    },

    /**
     * Saves the exam board after a drag. The columns must hold exactly the user's subject
     * pods for that syllabus, each once; anything else is refused, not half-applied.
     */
    async arrangeBoard(
      user: User,
      syllabusId: string,
      board: Board,
    ): Promise<Result<object>> {
      const ids = await deps.pods.boardPodIds(user.id, syllabusId);
      const placed = POD_STAGES.flatMap((s) => board[s]);
      const same =
        placed.length === ids.length &&
        new Set(placed).size === placed.length &&
        placed.every((id) => ids.includes(id));
      if (!same)
        return failure(
          "STALE_BOARD",
          "The board changed in another tab. Reload to see it.",
        );
      await deps.pods.arrangeBoard(
        user.id,
        POD_STAGES.flatMap((stage) =>
          board[stage].map((id, stageOrder) => ({ id, stage, stageOrder })),
        ),
      );
      return { ok: true };
    },

    async get(user: User, podId: string) {
      const pod = await deps.pods.findOwned(podId, user.id);
      if (!pod) return null;
      const topics = pod.subject?.topics ?? [];
      const done = await deps.completions.doneAmong(
        user.id,
        topics.map((t) => t.id),
      );
      return {
        id: pod.id,
        name: pod.name,
        kind: pod.kind,
        syllabus: pod.syllabusVersion,
        subjectId: pod.subjectId,
        items: pod._count.items,
        topics: topics.map((t) => ({
          id: t.id,
          name: t.name,
          weight: t.weight,
          difficulty: t.difficulty,
          foundational: t.foundational,
          done: done.has(t.id),
          items: t._count.items,
        })),
      };
    },

    /** Ticks or unticks a topic of one of the user's pods (an append-only event). */
    async setTopicDone(
      user: User,
      podId: string,
      topicId: string,
      done: boolean,
    ): Promise<Result<object>> {
      const pod = await deps.pods.findOwned(podId, user.id);
      if (!pod) return NOT_FOUND;
      if (!pod.subject?.topics.some((t) => t.id === topicId))
        return failure("NOT_FOUND", "That topic isn't in this pod.");
      await deps.completions.record(user.id, topicId, done);
      return { ok: true };
    },

    /** The user's pod for a syllabus subject, created on the way if it's missing. */
    async podIdForSubject(user: User, subjectId: string) {
      const existing = await deps.pods.findBySubject(user.id, subjectId);
      if (existing) return existing.id;
      const subject = await deps.pods.subjectVersion(subjectId);
      if (!subject) return null;
      const synced = await this.syncFromSyllabus(
        user,
        subject.syllabusVersionId,
      );
      if (!synced.ok) return null;
      return (await deps.pods.findBySubject(user.id, subjectId))?.id ?? null;
    },

    async createCustom(user: User, name: string) {
      const pod = await deps.pods.createCustom(user.id, name);
      return { ok: true as const, podId: pod.id };
    },

    async rename(
      user: User,
      podId: string,
      name: string,
    ): Promise<Result<object>> {
      const pod = await deps.pods.findOwned(podId, user.id);
      if (!pod) return NOT_FOUND;
      if (pod.kind === "SUBJECT")
        return failure(
          "SUBJECT_POD",
          "Rename the subject in its syllabus instead.",
        );
      await deps.pods.rename(podId, name);
      return { ok: true };
    },

    /** Custom pods only; a subject pod lives as long as its subject. */
    async remove(user: User, podId: string): Promise<Result<object>> {
      const pod = await deps.pods.findOwned(podId, user.id);
      if (!pod) return NOT_FOUND;
      if (pod.kind === "SUBJECT")
        return failure(
          "SUBJECT_POD",
          "Subject pods go when their subject is removed.",
        );
      await deps.pods.softDelete(podId, deps.clock.now());
      return { ok: true };
    },
  };
}

export type PodService = ReturnType<typeof createPodService>;
