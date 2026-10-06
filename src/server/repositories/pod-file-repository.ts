import "server-only";

import { prisma } from "@/server/db";

export type NewPodFile = {
  ownerId: string;
  order: number;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

export const podFileRepository = {
  /** An item with its files, created together; files of an item add to its size. */
  async createItemWithFiles(data: {
    podId: string;
    ownerId: string;
    type: "FILE" | "IMAGE";
    title: string;
    status: "NONE" | "PENDING";
    topicIds: string[];
    files: NewPodFile[];
  }) {
    return prisma.podItem.create({
      data: {
        podId: data.podId,
        ownerId: data.ownerId,
        type: data.type,
        title: data.title,
        status: data.status,
        sizeBytes: data.files.reduce((n, f) => n + f.sizeBytes, 0),
        pageCount: data.type === "IMAGE" ? data.files.length : null,
        topics: { create: data.topicIds.map((topicId) => ({ topicId })) },
        files: { create: data.files },
      },
    });
  },

  /** An image placed inside a note: stored as a file of that note. */
  async addToItem(itemId: string, file: NewPodFile) {
    const created = await prisma.podFile.create({ data: { itemId, ...file } });
    await prisma.podItem.update({
      where: { id: itemId },
      data: { sizeBytes: { increment: file.sizeBytes } },
    });
    return created;
  },

  /** The user's file, if its item isn't purged (trashed items still show their files). */
  findOwned(id: string, ownerId: string) {
    return prisma.podFile.findFirst({ where: { id, ownerId } });
  },

  /** Everything the user stores, the trash included until it's purged. */
  async bytesUsed(ownerId: string) {
    const sum = await prisma.podFile.aggregate({
      where: { ownerId },
      _sum: { sizeBytes: true },
    });
    return sum._sum.sizeBytes ?? 0;
  },
};

export type PodFileRepository = typeof podFileRepository;
