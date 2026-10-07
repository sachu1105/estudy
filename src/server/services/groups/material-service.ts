import type { Clock } from "@/lib/clock";
import { docImageIds, rewriteImages, type DocNode } from "@/lib/notes/doc";
import { assertPublicUrl, UnsafeUrlError } from "@/server/links/fetch-meta";
import type { GroupItemRepository } from "@/server/repositories/group-item-repository";
import type { PodItemRepository } from "@/server/repositories/pod-item-repository";
import type { ObjectStorage } from "@/server/storage/types";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";
import type { ChannelService } from "./channel-service";
import type { GroupService } from "./group-service";

type User = Actor;

export type MaterialDeps = {
  groups: GroupService;
  /** Picks and checks the channel a write lands in. */
  channels: Pick<ChannelService, "place">;
  items: GroupItemRepository;
  podItems: PodItemRepository;
  storage: ObjectStorage;
  clock: Clock;
  newId: () => string;
  /** The group owner's plan: group storage counts against it. */
  ownerStorageLimit: (ownerId: string) => Promise<number>;
};

const MUTED = failure(
  "MUTED",
  "A squad admin has muted you for now, so you can't share.",
);

/** Shared material in groups: copies of pod items, or links (milestone 13, rule 15). */
export function createMaterialService(deps: MaterialDeps) {
  /** A member who may share: in the group and not muted. */
  async function sharer(user: User, groupId: string) {
    const ok = await deps.groups.require(user, groupId, "MEMBER");
    if ("error" in ok) return { fail: ok.error! } as const;
    if (ok.me.mutedUntil && ok.me.mutedUntil > deps.clock.now())
      return { fail: MUTED } as const;
    return { group: ok.group, me: ok.me } as const;
  }

  async function underStorage(ownerId: string, adding: number) {
    const [used, max] = await Promise.all([
      deps.items.bytesForOwner(ownerId),
      deps.ownerStorageLimit(ownerId),
    ]);
    return used + adding <= max
      ? null
      : failure(
          "STORAGE",
          "This squad is out of space on its owner's plan. Share a link instead, or remove old files.",
        );
  }

  /** Copies stored files under the group, so the sharer's own copies stay private. */
  async function copyFiles(
    groupId: string,
    files: {
      id: string;
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
    }[],
  ) {
    const copies = [];
    for (const [order, f] of files.entries()) {
      const id = deps.newId();
      const storageKey = `groups/${groupId}/${id}`;
      await deps.storage.put(
        storageKey,
        await deps.storage.getBytes(f.storageKey),
        f.mimeType,
      );
      copies.push({
        from: f.id,
        id,
        order,
        storageKey,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
      });
    }
    return copies;
  }

  return {
    /** What the user could share: their latest pod material. */
    shareable: (user: User) => deps.podItems.recent(user.id),

    async list(user: User, groupId: string, channelId: string | null = null) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      return deps.items.list(
        groupId,
        await deps.groups.blockedIds(user),
        channelId,
      );
    },

    async get(user: User, groupId: string, itemId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const item = await deps.items.find(groupId, itemId);
      if (!item) return null;
      const blocked = await deps.groups.blockedIds(user);
      if (blocked.has(item.sharedById)) return null;
      const role = ok.me.role;
      return {
        item,
        canRemove: item.sharedById === user.id || role !== "MEMBER",
      };
    },

    /** Shares a copy of one of the user's pod items, tagged with its subject and topic. */
    async shareFromPod(
      user: User,
      groupId: string,
      podItemId: string,
      channelId: string | null = null,
    ): Promise<Result<{ itemId: string }>> {
      const ok = await sharer(user, groupId);
      if (ok.fail) return ok.fail;
      const source = await deps.podItems.findOwned(podItemId, user.id);
      if (!source) return failure("NOT_FOUND", "That item isn't in your pods.");
      const place = await deps.channels.place(
        groupId,
        ok.me.role,
        source.type === "LINK" ? ["LINKS", "MATERIAL"] : ["MATERIAL"],
        channelId,
      );
      if (!place.ok) return place;

      // A note's images are its own files: copy those too and point the note at them.
      const imageIds =
        source.type === "NOTE" && source.noteJson
          ? docImageIds(source.noteJson as DocNode)
          : [];
      const noteImages = imageIds.length
        ? await deps.podItems.filesOwned(imageIds, user.id)
        : [];
      // A note's images are usually its own files too: copy each file once.
      const files = [
        ...new Map(
          [...source.files, ...noteImages].map((f) => [f.id, f]),
        ).values(),
      ];
      const bytes = files.reduce((n, f) => n + f.sizeBytes, 0);
      const full = await underStorage(ok.group.ownerId, bytes);
      if (full) return full;

      const copies = await copyFiles(groupId, files);
      const newSrc = new Map(
        copies.map((c) => [c.from, `/api/groups/files/${c.id}`]),
      );
      const note = source.noteJson
        ? rewriteImages(source.noteJson as DocNode, newSrc)
        : null;
      const created = await deps.items.create({
        groupId,
        channelId: place.channelId,
        sharedById: user.id,
        type: source.type,
        title: source.title,
        noteJson: note,
        noteText: source.noteText,
        url: source.url,
        linkDescription: source.linkDescription,
        subjectName: source.pod.name,
        topicName: null,
        sizeBytes: bytes,
        files: copies.map((c) => ({
          id: c.id,
          order: c.order,
          storageKey: c.storageKey,
          mimeType: c.mimeType,
          sizeBytes: c.sizeBytes,
        })),
      });
      return { ok: true, itemId: created.id };
    },

    async addLink(
      user: User,
      groupId: string,
      input: {
        url: string;
        title: string | null;
        subjectName: string | null;
        topicName: string | null;
      },
      channelId: string | null = null,
    ): Promise<Result<{ itemId: string }>> {
      const ok = await sharer(user, groupId);
      if (ok.fail) return ok.fail;
      const place = await deps.channels.place(
        groupId,
        ok.me.role,
        ["LINKS", "MATERIAL"],
        channelId,
      );
      if (!place.ok) return place;
      let url: URL;
      try {
        url = await assertPublicUrl(input.url);
      } catch (error) {
        if (error instanceof UnsafeUrlError)
          return failure("BAD_URL", error.message);
        throw error;
      }
      const created = await deps.items.create({
        groupId,
        channelId: place.channelId,
        sharedById: user.id,
        type: "LINK",
        title: input.title || url.hostname.replace(/^www\./, ""),
        url: url.href,
        subjectName: input.subjectName,
        topicName: input.topicName,
        sizeBytes: 0,
        files: [],
      });
      return { ok: true, itemId: created.id };
    },

    /** The sharer, or a group admin, takes an item down; its files go too. */
    async remove(
      user: User,
      groupId: string,
      itemId: string,
    ): Promise<Result<object>> {
      const found = await this.get(user, groupId, itemId);
      if (!found?.canRemove)
        return failure(
          "FORBIDDEN",
          "Only whoever shared it, or a squad admin, can remove it.",
        );
      await deps.items.softDelete(itemId, deps.clock.now());
      for (const f of found.item.files)
        await deps.storage.delete(f.storageKey).catch(() => {});
      return { ok: true };
    },

    /** A file of a group item, for members only (rule 15: files only through signed URLs). */
    async fileUrl(user: User, fileId: string) {
      const file = await deps.items.file(fileId);
      if (!file || file.item.deletedAt || file.item.hiddenAt) return null;
      const ok = await deps.groups.require(user, file.item.groupId, "MEMBER");
      if ("error" in ok) return null;
      return deps.storage.signDownload(file.storageKey, {
        contentType: file.mimeType,
        expiresInSeconds: 300,
      });
    },
  };
}

export type MaterialService = ReturnType<typeof createMaterialService>;
