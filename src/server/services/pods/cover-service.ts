import type { IdGenerator } from "@/lib/ids";
import {
  coverFor,
  parseStoredCover,
  type CoverChoice,
  type PodCover,
  type StoredCover,
} from "@/lib/pods/covers";
import type { CoverRepository } from "@/server/repositories/cover-repository";
import type { PodRepository } from "@/server/repositories/pod-repository";
import type { ObjectStorage } from "@/server/storage/types";

import { failure, type Result } from "../syllabus/deps";
import { imageMime, sniffKind } from "../syllabus/extract";

export type CoverDeps = {
  covers: CoverRepository;
  pods: PodRepository;
  storage: ObjectStorage;
  ids: IdGenerator;
};

type User = { id: string };

/** An exam pod (by its syllabus) or one pod of the user's own. */
export type CoverTarget =
  { kind: "exam"; syllabusId: string } | { kind: "pod"; podId: string };

export const COVER_MAX_BYTES = 3 * 1024 * 1024;
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Cover images are shown through signed links this long (rule 15). */
const VIEW_SECONDS = 900;

const NOT_FOUND = failure(
  "NOT_FOUND",
  "That pod doesn't exist or isn't yours.",
);

/**
 * Pod covers: automatic, one of the gradients, or the user's own image. Images are
 * private like any pod file: stored under the user's prefix, checked byte by byte, and
 * only ever shown through short-lived signed links.
 */
export function createCoverService(deps: CoverDeps) {
  const keyPattern = (userId: string) =>
    new RegExp(`^covers/${userId}/[0-9a-f-]{36}$`);

  async function current(
    user: User,
    target: CoverTarget,
  ): Promise<{ found: boolean; stored: StoredCover | null }> {
    if (target.kind === "pod") {
      const pod = await deps.covers.podCover(target.podId, user.id);
      return { found: Boolean(pod), stored: parseStoredCover(pod?.cover) };
    }
    const pods = await deps.pods.boardPodIds(user.id, target.syllabusId);
    if (pods.length === 0) return { found: false, stored: null };
    return {
      found: true,
      stored: parseStoredCover(
        await deps.covers.examCover(user.id, target.syllabusId),
      ),
    };
  }

  /** What a card draws: the saved choice, or the automatic gradient for this id. */
  async function resolve(
    stored: StoredCover | null,
    id: string,
  ): Promise<PodCover> {
    if (!stored) return coverFor(id);
    if (stored.kind === "gradient") return stored;
    return {
      kind: "image",
      url: await deps.storage.signDownload(stored.key, {
        contentType: stored.mime,
        expiresInSeconds: VIEW_SECONDS,
      }),
    };
  }

  return {
    resolve: (value: unknown, id: string) =>
      resolve(parseStoredCover(value), id),

    /** Every exam cover the user saved, ready to draw. */
    async examCovers(user: User, examIds: string[]) {
      const rows = await deps.covers.examCovers(user.id);
      const saved = new Map(rows.map((r) => [r.syllabusVersionId, r.cover]));
      return new Map(
        await Promise.all(
          examIds.map(
            async (id) =>
              [id, await resolve(parseStoredCover(saved.get(id)), id)] as const,
          ),
        ),
      );
    },

    /** The choice as the picker shows it. */
    async get(user: User, target: CoverTarget) {
      const { found, stored } = await current(user, target);
      return found ? stored : null;
    },

    /**
     * The pod is gone (deleted, or its exam removed): its cover image goes too. Pass what
     * `get` returned before the delete.
     */
    async discard(user: User, stored: StoredCover | null) {
      if (stored?.kind === "image" && keyPattern(user.id).test(stored.key))
        await deps.storage.delete(stored.key);
    },

    /** A presigned PUT for a cover image; nothing is saved until `set` checks it. */
    async requestUpload(
      user: User,
      file: { contentType: string; size: number },
    ): Promise<
      Result<{ key: string; url: string; headers: Record<string, string> }>
    > {
      if (!COVER_TYPES.includes(file.contentType))
        return failure("UNSUPPORTED", "Use a JPG, PNG or WebP image.");
      if (file.size > COVER_MAX_BYTES)
        return failure("TOO_LARGE", "Use an image up to 3 MB.");
      const key = `covers/${user.id}/${deps.ids.next()}`;
      const signed = await deps.storage.signUpload({
        key,
        contentType: file.contentType,
        contentLength: file.size,
        expiresInSeconds: 600,
      });
      return { ok: true, key, ...signed };
    },

    /** Saves the user's choice. A replaced image is deleted from storage. */
    async set(
      user: User,
      target: CoverTarget,
      choice: CoverChoice,
    ): Promise<Result<{ cover: PodCover }>> {
      const { found, stored: before } = await current(user, target);
      if (!found) return NOT_FOUND;

      let next: StoredCover | null = null;
      if (choice.kind === "gradient") next = choice;
      if (choice.kind === "image") {
        const bad = failure(
          "BAD_IMAGE",
          "That image didn't arrive. Try choosing it again.",
        );
        if (!keyPattern(user.id).test(choice.key)) return bad;
        const head = await deps.storage.head(choice.key);
        if (!head || head.size > COVER_MAX_BYTES) return bad;
        const bytes = await deps.storage.getBytes(choice.key);
        // The bytes decide, not the declared type: only real images become covers.
        if (sniffKind(bytes) !== "IMAGE") {
          await deps.storage.delete(choice.key);
          return failure("UNSUPPORTED", "Use a JPG, PNG or WebP image.");
        }
        next = { kind: "image", key: choice.key, mime: imageMime(bytes) };
      }

      if (target.kind === "pod")
        await deps.covers.setPodCover(target.podId, user.id, next);
      else await deps.covers.setExamCover(user.id, target.syllabusId, next);
      if (
        before?.kind === "image" &&
        !(next?.kind === "image" && next.key === before.key)
      )
        await deps.storage.delete(before.key);

      const id = target.kind === "pod" ? target.podId : target.syllabusId;
      return { ok: true, cover: await resolve(next, id) };
    },
  };
}

export type CoverService = ReturnType<typeof createCoverService>;
