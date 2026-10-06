import type { Clock } from "@/lib/clock";
import type { IdGenerator } from "@/lib/ids";
import type { EntitlementSubject } from "@/server/entitlements/resolve";
import type { LimitFeature } from "@/server/entitlements/config";
import type { PodQueue } from "@/server/queue/types";
import type { PodFileRepository } from "@/server/repositories/pod-file-repository";
import type { PodItemRepository } from "@/server/repositories/pod-item-repository";
import type { PodRepository } from "@/server/repositories/pod-repository";
import type { ObjectStorage } from "@/server/storage/types";

import { failure, sha256Hex, type Result } from "../syllabus/deps";
import { imageMime, sniffKind } from "../syllabus/extract";

export type FileDeps = {
  files: PodFileRepository;
  items: PodItemRepository;
  pods: PodRepository;
  storage: ObjectStorage;
  queue: PodQueue;
  clock: Clock;
  ids: IdGenerator;
  limit: (user: EntitlementSubject, feature: LimitFeature) => number;
  /** The text layer of a PDF and its page count; null text for a scan. */
  readPdf: (
    bytes: Uint8Array,
  ) => Promise<{ text: string | null; pages: number }>;
};

type User = EntitlementSubject & { id: string };

export const FILE_MAX_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
/** Signed links to view a file last this long (rule 15). */
const VIEW_SECONDS = 300;

const FULL = (max: number) =>
  failure(
    "STORAGE_FULL",
    `Your pods are full (${Math.round(max / 1024 / 1024)} MB on your plan). Empty the trash or delete some files.`,
  );

/** Files in pods: PDFs, photos (one each, or several pages as one document), note images. */
export function createFileService(deps: FileDeps) {
  const keyPattern = (userId: string) =>
    new RegExp(`^pods/${userId}/[0-9a-f-]{36}$`);

  async function room(user: User, adding: number) {
    const max = deps.limit(user, "vaultStorageBytes");
    const used = await deps.files.bytesUsed(user.id);
    return used + adding <= max ? null : FULL(max);
  }

  /** Reads what arrived for each key: real type from the bytes, size, hash. */
  async function inspect(user: User, keys: string[]) {
    const out = [];
    for (const [order, key] of keys.entries()) {
      if (!keyPattern(user.id).test(key)) return null;
      const head = await deps.storage.head(key);
      if (!head || head.size > FILE_MAX_BYTES) return null;
      const bytes = await deps.storage.getBytes(key);
      const kind = sniffKind(bytes);
      if (kind !== "PDF" && kind !== "IMAGE") {
        await deps.storage.delete(key);
        return null;
      }
      out.push({
        kind,
        file: {
          ownerId: user.id,
          order,
          storageKey: key,
          mimeType: kind === "PDF" ? "application/pdf" : imageMime(bytes),
          sizeBytes: bytes.byteLength,
          sha256: await sha256Hex(bytes),
        },
      });
    }
    return out;
  }

  return {
    async usage(user: User) {
      return {
        used: await deps.files.bytesUsed(user.id),
        limit: deps.limit(user, "vaultStorageBytes"),
      };
    },

    /** Presigned PUTs for files about to be added; checks type, size and the plan's room. */
    async requestUploads(
      user: User,
      files: { contentType: string; size: number }[],
    ): Promise<
      Result<{
        uploads: {
          key: string;
          url: string;
          headers: Record<string, string>;
        }[];
      }>
    > {
      if (
        files.some((f) => !ACCEPTED_FILE_TYPES.includes(f.contentType as never))
      )
        return failure("UNSUPPORTED", "Add PDFs or photos (JPG, PNG or WebP).");
      if (files.some((f) => f.size > FILE_MAX_BYTES))
        return failure("TOO_LARGE", "Each file can be up to 25 MB.");
      const full = await room(
        user,
        files.reduce((n, f) => n + f.size, 0),
      );
      if (full) return full;
      const uploads = [];
      for (const f of files) {
        const key = `pods/${user.id}/${deps.ids.next()}`;
        const signed = await deps.storage.signUpload({
          key,
          contentType: f.contentType,
          contentLength: f.size,
          expiresInSeconds: 600,
        });
        uploads.push({ key, ...signed });
      }
      return { ok: true, uploads };
    },

    /**
     * Files that finished uploading become items: a PDF each, a photo each, or all the
     * photos as one multi-page document. PDFs get their text read in the background.
     */
    async completeUploads(
      user: User,
      input: {
        podId: string;
        keys: { key: string; name: string }[];
        asDocument: boolean;
        title: string | null;
        topicIds: string[];
      },
    ): Promise<Result<{ itemIds: string[] }>> {
      const pod = await deps.pods.findOwned(input.podId, user.id);
      if (!pod)
        return failure("NOT_FOUND", "That pod doesn't exist or isn't yours.");
      const allowed = new Set(pod.subject?.topics.map((t) => t.id) ?? []);
      const topicIds = input.topicIds.filter((id) => allowed.has(id));
      const found = await inspect(
        user,
        input.keys.map((k) => k.key),
      );
      if (!found)
        return failure(
          "UNSUPPORTED",
          "A file didn't upload properly or isn't a PDF or photo. Try again.",
        );
      const full = await room(user, 0);
      if (full) {
        for (const f of found) await deps.storage.delete(f.file.storageKey);
        return full;
      }
      const name = (i: number) =>
        input.keys[i].name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120) ||
        "Untitled";
      const itemIds: string[] = [];
      const images = found.filter((f) => f.kind === "IMAGE");
      if (input.asDocument && images.length > 0) {
        const item = await deps.files.createItemWithFiles({
          podId: pod.id,
          ownerId: user.id,
          type: "IMAGE",
          title:
            input.title ??
            `Photos, ${images.length} page${images.length === 1 ? "" : "s"}`,
          status: "NONE",
          topicIds,
          files: images.map((f, order) => ({ ...f.file, order })),
        });
        itemIds.push(item.id);
      }
      for (const [i, f] of found.entries()) {
        if (input.asDocument && f.kind === "IMAGE") continue;
        const item = await deps.files.createItemWithFiles({
          podId: pod.id,
          ownerId: user.id,
          type: f.kind === "PDF" ? "FILE" : "IMAGE",
          title: input.title && found.length === 1 ? input.title : name(i),
          status: f.kind === "PDF" ? "PENDING" : "NONE",
          topicIds,
          files: [{ ...f.file, order: 0 }],
        });
        itemIds.push(item.id);
        if (f.kind === "PDF")
          await deps.queue.enqueue({ kind: "extract-file", itemId: item.id });
      }
      return { ok: true, itemIds };
    },

    /** An image placed inside a note; returns the path the editor puts in the note. */
    async attachToNote(
      user: User,
      input: { itemId: string; key: string },
    ): Promise<Result<{ src: string }>> {
      const note = await deps.items.findOwned(input.itemId, user.id);
      if (!note || note.type !== "NOTE")
        return failure("NOT_FOUND", "That note doesn't exist or isn't yours.");
      const found = await inspect(user, [input.key]);
      if (!found || found[0].kind !== "IMAGE")
        return failure("UNSUPPORTED", "Add a JPG, PNG or WebP image.");
      const full = await room(user, 0);
      if (full) return full;
      const file = await deps.files.addToItem(note.id, {
        ...found[0].file,
        order: note.files.length,
      });
      return { ok: true, src: `/api/pods/files/${file.id}` };
    },

    /** A 5-minute link to view one of the user's own files (rule 15). */
    async viewUrl(user: User, fileId: string) {
      const file = await deps.files.findOwned(fileId, user.id);
      if (!file) return null;
      return deps.storage.signDownload(file.storageKey, {
        contentType: file.mimeType,
        expiresInSeconds: VIEW_SECONDS,
      });
    },

    /** Worker: the text layer of a PDF, for search now and mock tests later. */
    async extractFileText(itemId: string) {
      const item = await deps.items.findById(itemId);
      if (!item || item.type !== "FILE" || item.deletedAt) return;
      const file = item.files[0];
      if (!file) return;
      try {
        const bytes = await deps.storage.getBytes(file.storageKey);
        const { text, pages } = await deps.readPdf(bytes);
        await deps.items.update(itemId, {
          extractedText: text?.slice(0, 1_000_000) ?? null,
          pageCount: pages,
          status: "DONE",
        });
      } catch {
        await deps.items.update(itemId, { status: "FAILED" });
      }
    },
  };
}

export type FileService = ReturnType<typeof createFileService>;
