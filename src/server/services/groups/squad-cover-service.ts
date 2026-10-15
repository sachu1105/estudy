import type { IdGenerator } from "@/lib/ids";
import {
  parseStoredCover,
  selectionOf,
  type CoverPreset,
  type PodCover,
  type StoredCover,
} from "@/lib/pods/covers";
import { squadCover } from "@/lib/squads/cover";
import type { GroupRepository } from "@/server/repositories/group-repository";
import type { Actor } from "@/server/services/syllabus/deps";
import type { ObjectStorage } from "@/server/storage/types";

import { failure, type Result } from "../syllabus/deps";
import { imageMime, sniffKind } from "../syllabus/extract";
import type { GroupService } from "./group-service";

type User = Actor;

export const SQUAD_COVER_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Banners are shown through signed links this long, like every other upload. */
const VIEW_SECONDS = 900;

export type SquadCoverDeps = {
  groups: GroupRepository;
  squads: Pick<GroupService, "require">;
  storage: ObjectStorage;
  ids: IdGenerator;
};

/**
 * A squad's banner: automatic, one of the gradients, or an image its admins uploaded.
 * It is the squad's face everywhere — the card on the squads page, the tile in the
 * chat rail, the header inside it — so only admins may change it (rule 9).
 */
export function createSquadCoverService(deps: SquadCoverDeps) {
  const keyPattern = (groupId: string) =>
    new RegExp(`^squad/${groupId}/[0-9a-f-]{36}$`);

  return {
    /** What the picker shows as chosen, for a squad the caller may administer. */
    async get(user: User, groupId: string) {
      const ok = await deps.squads.require(user, groupId, "ADMIN");
      if ("error" in ok) return null;
      const stored = parseStoredCover(ok.group.cover);
      return {
        selection: selectionOf(stored),
        cover: squadCover({ id: groupId, cover: ok.group.cover }),
      };
    },

    /** A presigned PUT. Nothing is saved until `set` checks what arrived. */
    async requestUpload(
      user: User,
      groupId: string,
      file: { contentType: string; size: number },
    ): Promise<
      Result<{ key: string; url: string; headers: Record<string, string> }>
    > {
      const ok = await deps.squads.require(user, groupId, "ADMIN");
      if ("error" in ok) return ok.error!;
      if (!IMAGE_TYPES.includes(file.contentType))
        return failure("UNSUPPORTED", "Use a JPG, PNG or WebP image.");
      if (file.size > SQUAD_COVER_MAX_BYTES)
        return failure("TOO_LARGE", "Use an image up to 4 MB.");
      const key = `squad/${groupId}/${deps.ids.next()}`;
      const signed = await deps.storage.signUpload({
        key,
        contentType: file.contentType,
        contentLength: file.size,
        expiresInSeconds: 600,
      });
      return { ok: true, key, ...signed };
    },

    /** Saves the banner. A replaced image is deleted from storage. */
    async set(
      user: User,
      groupId: string,
      choice:
        | { kind: "auto" }
        | { kind: "gradient"; preset: CoverPreset }
        | { kind: "image"; key: string },
    ): Promise<Result<{ cover: PodCover }>> {
      const ok = await deps.squads.require(user, groupId, "ADMIN");
      if ("error" in ok) return ok.error!;
      const before = parseStoredCover(ok.group.cover);

      let next: StoredCover | null = null;
      if (choice.kind === "gradient")
        next = { kind: "gradient", preset: choice.preset };
      if (choice.kind === "image") {
        const bad = failure(
          "BAD_IMAGE",
          "That image didn't arrive. Try choosing it again.",
        );
        if (!keyPattern(groupId).test(choice.key)) return bad;
        const head = await deps.storage.head(choice.key);
        if (!head || head.size > SQUAD_COVER_MAX_BYTES) return bad;
        const bytes = await deps.storage.getBytes(choice.key);
        // The bytes decide, not the declared type.
        if (sniffKind(bytes) !== "IMAGE") {
          await deps.storage.delete(choice.key);
          return failure("UNSUPPORTED", "Use a JPG, PNG or WebP image.");
        }
        next = { kind: "image", key: choice.key, mime: imageMime(bytes) };
      }

      await deps.groups.setCover(groupId, next);
      if (
        before?.kind === "image" &&
        !(next?.kind === "image" && next.key === before.key)
      )
        await deps.storage.delete(before.key);
      return { ok: true, cover: squadCover({ id: groupId, cover: next }) };
    },

    /**
     * A signed link to the banner, for the route that serves it. Members always see it;
     * everyone else only when the squad is listed publicly, since the banner shows on
     * its card in Discover.
     */
    async signedImage(viewer: { id: string } | null, groupId: string) {
      const group = await deps.groups.coverOf(groupId);
      if (!group || group.deletedAt) return null;
      const stored = parseStoredCover(group.cover);
      if (stored?.kind !== "image") return null;
      if (group.visibility !== "PUBLIC") {
        if (!viewer) return null;
        const member = await deps.groups.membership(groupId, viewer.id);
        if (!member) return null;
      }
      return deps.storage.signDownload(stored.key, {
        contentType: stored.mime,
        expiresInSeconds: VIEW_SECONDS,
      });
    },
  };
}

export type SquadCoverService = ReturnType<typeof createSquadCoverService>;
