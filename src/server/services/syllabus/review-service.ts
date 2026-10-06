import type { EditableTree } from "@/lib/syllabus/tree";
import { jobChannel, type JobEvent } from "@/server/realtime/types";

import { failure, type Actor, type Result, type SyllabusDeps } from "./deps";
import { parserFor } from "./parser-version";

const NOT_FOUND = failure(
  "NOT_FOUND",
  "That syllabus doesn't exist or isn't yours.",
);

/** The human gate for a user's own upload (rule 5): they edit and confirm the tree. */
export function createReviewService(deps: SyllabusDeps) {
  async function owned(user: Actor, id: string) {
    return deps.syllabuses.findOwned(id, user.id);
  }

  /**
   * A user's own syllabus stays editable after it's confirmed: topics are fixed inside each
   * subject folder whenever they're noticed. Plans (milestone 5) snapshot the tree, so later
   * edits never rewrite a plan behind the user's back.
   */
  async function editable(user: Actor, id: string) {
    const version = await owned(user, id);
    if (!version) return NOT_FOUND;
    if (version.visibility !== "PRIVATE")
      return failure("READ_ONLY", "Catalogue syllabuses can't be edited.");
    if (!version.parseId)
      return failure(
        "NOT_READY",
        "This syllabus is still being read. Wait until it's ready.",
      );
    return { ok: true as const, version };
  }

  /** Queues a parse job for a version and tells anyone watching. */
  async function startJob(
    user: Actor,
    id: string,
  ): Promise<Result<{ jobId: string }>> {
    const job = await deps.parseJobs.create({
      syllabusVersionId: id,
      userId: user.id,
    });
    await deps.queue.enqueue(
      { parseJobId: job.id },
      {
        priority: deps.entitlements.can(user, "priorityParsing")
          ? "high"
          : "normal",
      },
    );
    const event: JobEvent = {
      id: job.id,
      status: "QUEUED",
      stage: "QUEUED",
      progress: 0,
      error: null,
      reused: false,
    };
    await deps.publisher.publish(jobChannel(job.id), event);
    return { ok: true, jobId: job.id };
  }

  return {
    get: owned,

    list(user: Actor) {
      return deps.syllabuses.listOwned(user.id);
    },

    async saveDraft(
      user: Actor,
      id: string,
      tree: EditableTree,
    ): Promise<Result<object>> {
      const check = await editable(user, id);
      if (!check.ok) return check;
      await deps.syllabuses.replaceTree(id, tree);
      return { ok: true };
    },

    /** The human gate (rule 5): saves the tree as the user's private APPROVED version. */
    async confirm(
      user: Actor,
      id: string,
      tree: EditableTree,
    ): Promise<Result<object>> {
      const check = await editable(user, id);
      if (!check.ok) return check;
      if (check.version.status !== "DRAFT")
        return failure("NOT_DRAFT", "This syllabus is already confirmed.");
      await deps.syllabuses.approvePrivate(id, tree, deps.clock.now());
      return { ok: true };
    },

    /** Starts a fresh parse job after a failed one. */
    async retry(user: Actor, id: string): Promise<Result<{ jobId: string }>> {
      const version = await owned(user, id);
      if (!version) return NOT_FOUND;
      const last = version.parseJobs[0];
      if (!last || last.status !== "FAILED" || version.parseId)
        return failure(
          "NOT_FAILED",
          "This syllabus isn't waiting for a retry.",
        );
      return startJob(user, id);
    },

    /**
     * Reads a syllabus again with the current parser. Replaces its subjects, edits
     * included, so the UI asks first; it returns to DRAFT for the user to confirm.
     */
    async reread(user: Actor, id: string): Promise<Result<{ jobId: string }>> {
      const version = await owned(user, id);
      if (!version) return NOT_FOUND;
      if (
        !version.parse ||
        !version.sourceKind ||
        version.parse.promptVersion ===
          parserFor(deps.readsDocuments, version.sourceKind).version
      )
        return failure(
          "UP_TO_DATE",
          "This syllabus was read with the latest reader.",
        );
      await deps.syllabuses.resetForReparse(id);
      return startJob(user, id);
    },

    /** Removes it from the list and deletes the uploaded file; it no longer counts. */
    async remove(user: Actor, id: string): Promise<Result<object>> {
      const version = await owned(user, id);
      if (!version) return NOT_FOUND;
      // Stop a parse still waiting or running: no point reading a file that is going away.
      const job = version.parseJobs[0];
      if (job && (job.status === "QUEUED" || job.status === "RUNNING")) {
        await deps.queue.cancel(job.id);
        await deps.parseJobs.update(job.id, {
          status: "FAILED",
          stage: "FAILED",
          error: "Stopped and deleted.",
          finishedAt: deps.clock.now(),
        });
      }
      await deps.syllabuses.softDelete(id, deps.clock.now());
      if (version.sourceFileKey)
        await deps.storage.delete(version.sourceFileKey);
      return { ok: true };
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
