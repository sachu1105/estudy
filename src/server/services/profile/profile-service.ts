import type { Clock } from "@/lib/clock";
import type { IdGenerator } from "@/lib/ids";
import {
  handleSchema,
  profileSchema,
  suggestHandle,
  type ProfileInput,
} from "@/lib/profile/profile";
import {
  coverFor,
  parseStoredCover,
  selectionOf,
  type CoverPreset,
  type PodCover,
  type StoredCover,
} from "@/lib/pods/covers";
import type { UserRepository } from "@/server/repositories/user-repository";
import type { ObjectStorage } from "@/server/storage/types";

import { failure, type Result } from "../syllabus/deps";
import { imageMime, sniffKind } from "../syllabus/extract";

export type ProfileDeps = {
  users: UserRepository;
  storage: ObjectStorage;
  ids: IdGenerator;
  clock: Clock;
};

type User = { id: string; displayName: string };

/** A photo is small and square; a cover is wide. Both are capped well under a pod file. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_COVER_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Profile images are shown through signed links this long, like any other upload. */
const VIEW_SECONDS = 900;

export type ProfileImageKind = "avatar" | "cover";

/**
 * A user's profile: the name and bio others see, the photo and cover, and whether it is
 * shared at a public address.
 *
 * Images follow the same path as pod covers: a presigned PUT to the user's own prefix,
 * then the bytes are sniffed before anything is saved. They are read back through
 * `/api/profile-image`, which mints a short-lived signed link, so storage keys never
 * reach the browser.
 */
export function createProfileService(deps: ProfileDeps) {
  const prefix = (kind: ProfileImageKind, userId: string) =>
    `profile/${kind}/${userId}`;
  const keyPattern = (kind: ProfileImageKind, userId: string) =>
    new RegExp(`^profile/${kind}/${userId}/[0-9a-f-]{36}$`);
  const maxBytes = (kind: ProfileImageKind) =>
    kind === "avatar" ? AVATAR_MAX_BYTES : PROFILE_COVER_MAX_BYTES;

  /**
   * The path the browser asks for. The version is the tail of the storage key, so a new
   * photo gets a new URL and no cache holds on to the old one.
   */
  const servingPath = (userId: string, kind: ProfileImageKind, key: string) =>
    `/api/profile-image/${userId}?kind=${kind}&v=${key.slice(-8)}`;

  async function coverOf(userId: string, stored: StoredCover | null) {
    if (!stored) return coverFor(userId);
    if (stored.kind === "gradient") return stored;
    return {
      kind: "image" as const,
      url: servingPath(userId, "cover", stored.key),
    };
  }

  /** A signed GET for whichever image the serving route was asked for. */
  async function signedImage(userId: string, kind: ProfileImageKind) {
    const row = await deps.users.imageKeysOf(userId);
    if (!row) return null;
    if (kind === "avatar") {
      if (!row.avatarKey) return null;
      const head = await deps.storage.head(row.avatarKey);
      return deps.storage.signDownload(row.avatarKey, {
        contentType: head?.contentType ?? "image/jpeg",
        expiresInSeconds: VIEW_SECONDS,
      });
    }
    const stored = parseStoredCover(row.profileCover);
    if (stored?.kind !== "image") return null;
    return deps.storage.signDownload(stored.key, {
      contentType: stored.mime,
      expiresInSeconds: VIEW_SECONDS,
    });
  }

  /** Checks an uploaded key really is an image of the right size, then returns its type. */
  async function acceptImage(
    kind: ProfileImageKind,
    userId: string,
    key: string,
  ): Promise<Result<{ mime: "image/jpeg" | "image/png" | "image/webp" }>> {
    const bad = failure(
      "BAD_IMAGE",
      "That image didn't arrive. Try choosing it again.",
    );
    if (!keyPattern(kind, userId).test(key)) return bad;
    const head = await deps.storage.head(key);
    if (!head || head.size > maxBytes(kind)) return bad;
    const bytes = await deps.storage.getBytes(key);
    // The bytes decide, not the declared type.
    if (sniffKind(bytes) !== "IMAGE") {
      await deps.storage.delete(key);
      return failure("UNSUPPORTED", "Use a JPG, PNG or WebP image.");
    }
    return { ok: true, mime: imageMime(bytes) };
  }

  return {
    /** Everything the settings page shows, with the cover already resolved for drawing. */
    async get(user: User) {
      const row = await deps.users.profileOf(user.id);
      if (!row) return null;
      const stored = parseStoredCover(row.profileCover);
      return {
        displayName: row.displayName,
        bio: row.bio,
        avatarUrl: row.avatarUrl,
        hasAvatar: Boolean(row.avatarKey),
        cover: (await coverOf(row.id, stored)) as PodCover,
        coverSelection: selectionOf(stored),
        handle: row.handle,
        profilePublic: row.profilePublic,
        suggestedHandle: suggestHandle(row.displayName, row.id.slice(0, 4)),
        joinedAt: row.createdAt,
      };
    },

    async save(user: User, input: ProfileInput): Promise<Result<object>> {
      const parsed = profileSchema.safeParse(input);
      if (!parsed.success)
        return failure(
          "INVALID",
          parsed.error.issues[0]?.message ?? "Check the form and try again.",
        );
      await deps.users.updateProfile(user.id, parsed.data);
      return { ok: true };
    },

    /** A presigned PUT. Nothing is saved until `setImage` checks what arrived. */
    async requestUpload(
      user: User,
      kind: ProfileImageKind,
      file: { contentType: string; size: number },
    ): Promise<
      Result<{ key: string; url: string; headers: Record<string, string> }>
    > {
      if (!IMAGE_TYPES.includes(file.contentType))
        return failure("UNSUPPORTED", "Use a JPG, PNG or WebP image.");
      if (file.size > maxBytes(kind))
        return failure(
          "TOO_LARGE",
          `Use an image up to ${maxBytes(kind) / 1024 ** 2} MB.`,
        );
      const key = `${prefix(kind, user.id)}/${deps.ids.next()}`;
      const signed = await deps.storage.signUpload({
        key,
        contentType: file.contentType,
        contentLength: file.size,
        expiresInSeconds: 600,
      });
      return { ok: true, key, ...signed };
    },

    /** Saves an uploaded photo. Passing no key removes the photo instead. */
    async setAvatar(
      user: User,
      key: string | null,
    ): Promise<Result<{ avatarUrl: string | null }>> {
      const before = await deps.users.profileOf(user.id);
      if (key) {
        const checked = await acceptImage("avatar", user.id, key);
        if (!checked.ok) return checked;
      }
      await deps.users.setAvatar(
        user.id,
        key ? { key, url: servingPath(user.id, "avatar", key) } : null,
      );
      if (before?.avatarKey && before.avatarKey !== key)
        await deps.storage.delete(before.avatarKey);
      return {
        ok: true,
        avatarUrl: key ? servingPath(user.id, "avatar", key) : null,
      };
    },

    /** Saves the cover: automatic, one of the gradients, or an uploaded image. */
    async setCover(
      user: User,
      choice:
        | { kind: "auto" }
        | { kind: "gradient"; preset: CoverPreset }
        | { kind: "image"; key: string },
    ): Promise<Result<{ cover: PodCover }>> {
      const row = await deps.users.profileOf(user.id);
      const before = parseStoredCover(row?.profileCover);
      let next: StoredCover | null = null;
      if (choice.kind === "gradient")
        next = { kind: "gradient", preset: choice.preset };
      if (choice.kind === "image") {
        const checked = await acceptImage("cover", user.id, choice.key);
        if (!checked.ok) return checked;
        next = { kind: "image", key: choice.key, mime: checked.mime };
      }
      await deps.users.setProfileCover(user.id, next);
      if (
        before?.kind === "image" &&
        !(next?.kind === "image" && next.key === before.key)
      )
        await deps.storage.delete(before.key);
      return { ok: true, cover: (await coverOf(user.id, next)) as PodCover };
    },

    /**
     * Turns sharing on or off. Turning it on needs a handle that is free; turning it off
     * keeps the handle, so the same address comes back if they share again.
     */
    async setSharing(
      user: User,
      input: { profilePublic: boolean; handle?: string | null },
    ): Promise<Result<{ handle: string | null; profilePublic: boolean }>> {
      const row = await deps.users.profileOf(user.id);
      if (!row) return failure("NOT_FOUND", "Sign in again to do that.");

      let handle = row.handle;
      if (input.handle !== undefined && input.handle !== null) {
        const parsed = handleSchema.safeParse(input.handle);
        if (!parsed.success)
          return failure(
            "INVALID",
            parsed.error.issues[0]?.message ?? "Pick another handle.",
          );
        if (await deps.users.handleTaken(parsed.data, user.id))
          return failure("TAKEN", "That handle is taken. Try another.");
        handle = parsed.data;
      }
      if (input.profilePublic && !handle)
        return failure("INVALID", "Pick a handle for your profile address.");

      await deps.users.setSharing(user.id, {
        handle,
        profilePublic: input.profilePublic,
      });
      return { ok: true, handle, profilePublic: input.profilePublic };
    },

    /** A shared profile, for /u/<handle>. Null when it doesn't exist or isn't shared. */
    async shared(handle: string) {
      const parsed = handleSchema.safeParse(handle);
      if (!parsed.success) return null;
      const row = await deps.users.findSharedByHandle(parsed.data);
      if (!row) return null;
      return {
        id: row.id,
        displayName: row.displayName,
        bio: row.bio,
        avatarUrl: row.avatarUrl,
        cover: (await coverOf(
          row.id,
          parseStoredCover(row.profileCover),
        )) as PodCover,
        handle: row.handle!,
        timezone: row.timezone,
        streakResetAt: row.streakResetAt,
        joinedAt: row.createdAt,
      };
    },

    signedImage,
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
