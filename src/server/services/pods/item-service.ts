import type { Clock } from "@/lib/clock";
import { cleanDoc, docText, emptyDoc, type DocNode } from "@/lib/notes/doc";
import {
  assertPublicUrl,
  UnsafeUrlError,
  type LinkMeta,
} from "@/server/links/fetch-meta";
import type { PodQueue } from "@/server/queue/types";
import type { PodItemRepository } from "@/server/repositories/pod-item-repository";
import type { PodRepository } from "@/server/repositories/pod-repository";
import type { ObjectStorage } from "@/server/storage/types";

import { failure, type Result } from "../syllabus/deps";
import { toPrefixQuery } from "./search";

export type ItemDeps = {
  items: PodItemRepository;
  pods: PodRepository;
  queue: PodQueue;
  storage: ObjectStorage;
  clock: Clock;
  fetchLinkMeta: (url: string) => Promise<LinkMeta>;
};

type User = { id: string };

const NOT_FOUND = failure(
  "NOT_FOUND",
  "That item doesn't exist or isn't yours.",
);
const NO_POD = failure("NOT_FOUND", "That pod doesn't exist or isn't yours.");
export const TRASH_DAYS = 30;

/** Material in pods: notes, links and files, each mapped to the topics it covers. */
export function createItemService(deps: ItemDeps) {
  /** The user's pod and the topic ids that may be mapped in it. */
  async function podWithTopics(user: User, podId: string) {
    const pod = await deps.pods.findOwned(podId, user.id);
    if (!pod) return null;
    return {
      pod,
      topicIds: new Set(pod.subject?.topics.map((t) => t.id) ?? []),
    };
  }

  /** Drops topic ids that don't belong to the pod (rule 9: never trust the client). */
  const onlyPodTopics = (allowed: Set<string>, topicIds: string[]) => [
    ...new Set(topicIds.filter((id) => allowed.has(id))),
  ];

  return {
    list: (user: User, podId: string) => deps.items.listForPod(podId, user.id),
    listForTopic: (user: User, topicId: string) =>
      deps.items.listForTopic(topicId, user.id),
    get: (user: User, itemId: string) => deps.items.findOwned(itemId, user.id),
    listTrash: (user: User) => deps.items.listTrash(user.id),

    /** Words across every pod: material (titles, notes, links, PDF text) and topic names. */
    async search(
      user: User,
      text: string,
      filters: {
        podId?: string;
        type?: "NOTE" | "LINK" | "FILE" | "IMAGE";
      } = {},
    ) {
      const query = toPrefixQuery(text);
      if (!query) return { items: [], topics: [] };
      const [items, topics] = await Promise.all([
        deps.items.search(user.id, query, filters),
        filters.type ? [] : deps.pods.searchTopics(user.id, text.trim()),
      ]);
      return {
        items,
        topics: topics.flatMap((t) =>
          t.subject.pods.map((p) => ({
            topicId: t.id,
            name: t.name,
            podId: p.id,
            podName: p.name,
          })),
        ),
      };
    },

    async addNote(
      user: User,
      input: { podId: string; title: string; topicIds: string[] },
    ): Promise<Result<{ itemId: string }>> {
      const owned = await podWithTopics(user, input.podId);
      if (!owned) return NO_POD;
      const item = await deps.items.create({
        podId: input.podId,
        ownerId: user.id,
        type: "NOTE",
        title: input.title,
        topicIds: onlyPodTopics(owned.topicIds, input.topicIds),
      });
      await deps.items.saveNote(item.id, { doc: emptyDoc(), text: "" });
      return { ok: true, itemId: item.id };
    },

    async saveNote(
      user: User,
      input: { itemId: string; title: string; doc: DocNode },
    ): Promise<Result<object>> {
      const item = await deps.items.findOwned(input.itemId, user.id);
      if (!item || item.type !== "NOTE") return NOT_FOUND;
      const doc = cleanDoc(input.doc) ?? emptyDoc();
      await deps.items.saveNote(item.id, {
        title: input.title,
        doc,
        text: docText(doc).slice(0, 200_000),
      });
      return { ok: true };
    },

    /** Saves the link at once; its title and description are fetched in the background. */
    async addLink(
      user: User,
      input: { podId: string; url: string; topicIds: string[] },
    ): Promise<Result<{ itemId: string }>> {
      const owned = await podWithTopics(user, input.podId);
      if (!owned) return NO_POD;
      let url: URL;
      try {
        url = await assertPublicUrl(input.url);
      } catch (error) {
        if (error instanceof UnsafeUrlError)
          return failure("BAD_URL", error.message);
        throw error;
      }
      const item = await deps.items.create({
        podId: input.podId,
        ownerId: user.id,
        type: "LINK",
        title: url.hostname.replace(/^www\./, ""),
        url: url.href,
        status: "PENDING",
        topicIds: onlyPodTopics(owned.topicIds, input.topicIds),
      });
      await deps.queue.enqueue({ kind: "link-meta", itemId: item.id });
      return { ok: true, itemId: item.id };
    },

    /**
     * Worker: fills in a link's title, description and icon. A title the user already
     * changed is kept. A page that can't be read leaves a plain link, marked FAILED.
     */
    async fetchLinkPreview(itemId: string) {
      const item = await deps.items.findById(itemId);
      if (!item || item.type !== "LINK" || !item.url || item.deletedAt) return;
      const defaultTitle = new URL(item.url).hostname.replace(/^www\./, "");
      try {
        const meta = await deps.fetchLinkMeta(item.url);
        await deps.items.update(itemId, {
          title:
            item.title === defaultTitle && meta.title ? meta.title : item.title,
          linkDescription: meta.description,
          faviconUrl: meta.faviconUrl,
          status: "DONE",
        });
      } catch {
        await deps.items.update(itemId, { status: "FAILED" });
      }
    },

    async rename(
      user: User,
      itemId: string,
      title: string,
    ): Promise<Result<object>> {
      const item = await deps.items.findOwned(itemId, user.id);
      if (!item) return NOT_FOUND;
      await deps.items.update(itemId, { title });
      return { ok: true };
    },

    /** What the item covers, replaced as a whole. Topics outside its pod are ignored. */
    async setTopics(
      user: User,
      itemId: string,
      topicIds: string[],
    ): Promise<Result<object>> {
      const item = await deps.items.findOwned(itemId, user.id);
      if (!item) return NOT_FOUND;
      const owned = await podWithTopics(user, item.podId);
      if (!owned) return NOT_FOUND;
      await deps.items.setTopics(
        itemId,
        onlyPodTopics(owned.topicIds, topicIds),
      );
      return { ok: true };
    },

    async trash(user: User, itemId: string): Promise<Result<object>> {
      const item = await deps.items.findOwned(itemId, user.id);
      if (!item) return NOT_FOUND;
      await deps.items.trash(itemId, deps.clock.now());
      return { ok: true };
    },

    async restore(user: User, itemId: string): Promise<Result<object>> {
      const item = await deps.items.findOwned(itemId, user.id, {
        trashed: true,
      });
      if (!item || !item.deletedAt) return NOT_FOUND;
      await deps.items.restore(itemId);
      return { ok: true };
    },

    /** Worker, daily: items in the trash for 30 days go for good, with their files. */
    async purgeTrash() {
      const cutoff = new Date(
        deps.clock.now().getTime() - TRASH_DAYS * 86_400_000,
      );
      const expired = await deps.items.expiredTrash(cutoff);
      for (const item of expired)
        for (const file of item.files)
          await deps.storage.delete(file.storageKey).catch(() => {});
      await deps.items.deleteForever(expired.map((i) => i.id));
      return expired.length;
    },
  };
}

export type ItemService = ReturnType<typeof createItemService>;
