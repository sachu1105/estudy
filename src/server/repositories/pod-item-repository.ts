import "server-only";

import { prisma } from "@/server/db";
import type { Prisma } from "@/server/db/generated/prisma/client";

const listSelect = {
  id: true,
  podId: true,
  type: true,
  title: true,
  url: true,
  linkDescription: true,
  faviconUrl: true,
  sizeBytes: true,
  pageCount: true,
  status: true,
  updatedAt: true,
  topics: { select: { topicId: true } },
  files: {
    orderBy: { order: "asc" as const },
    select: { id: true, mimeType: true },
    take: 1,
  },
} satisfies Prisma.PodItemSelect;

export const podItemRepository = {
  create(data: {
    podId: string;
    ownerId: string;
    type: "NOTE" | "LINK" | "FILE" | "IMAGE";
    title: string;
    url?: string;
    status?: "NONE" | "PENDING";
    topicIds: string[];
  }) {
    const { topicIds, ...item } = data;
    return prisma.podItem.create({
      data: {
        ...item,
        topics: { create: topicIds.map((topicId) => ({ topicId })) },
      },
    });
  },

  /** The user's item, with what it maps to and its files (trash included when asked). */
  findOwned(id: string, ownerId: string, { trashed = false } = {}) {
    return prisma.podItem.findFirst({
      where: { id, ownerId, ...(trashed ? {} : { deletedAt: null }) },
      include: {
        topics: { select: { topicId: true } },
        files: { orderBy: { order: "asc" } },
        pod: { select: { id: true, name: true, ownerId: true } },
      },
    });
  },

  /**
   * Full-text search over the user's material: titles, notes, links and PDF text. `query`
   * is a ready tsquery built from letters and digits only (see toPrefixQuery).
   */
  search(
    ownerId: string,
    query: string,
    filters: { podId?: string; type?: "NOTE" | "LINK" | "FILE" | "IMAGE" },
  ) {
    return prisma.$queryRaw<
      {
        id: string;
        podId: string;
        podName: string;
        type: "NOTE" | "LINK" | "FILE" | "IMAGE";
        title: string;
        snippet: string | null;
      }[]
    >`
      SELECT i.id, i."podId", p.name AS "podName", i.type, i.title,
        ts_headline('simple',
          coalesce(i."noteText", '') || ' ' || coalesce(i."linkDescription", '') || ' ' ||
          coalesce(i."extractedText", ''),
          to_tsquery('simple', ${query}),
          'MaxWords=18, MinWords=8, StartSel=«, StopSel=», MaxFragments=1') AS snippet
      FROM "PodItem" i JOIN "Pod" p ON p.id = i."podId"
      WHERE i."ownerId" = ${ownerId}::uuid AND i."deletedAt" IS NULL AND p."deletedAt" IS NULL
        AND (${filters.podId ?? null}::uuid IS NULL OR i."podId" = ${filters.podId ?? null}::uuid)
        AND (${filters.type ?? null}::text IS NULL OR i.type::text = ${filters.type ?? null}::text)
        AND to_tsvector('simple',
          coalesce(i."title", '') || ' ' || coalesce(i."noteText", '') || ' ' ||
          coalesce(i."url", '') || ' ' || coalesce(i."linkDescription", '') || ' ' ||
          coalesce(i."extractedText", '')) @@ to_tsquery('simple', ${query})
      ORDER BY i."updatedAt" DESC
      LIMIT 40`;
  },

  /** For the worker, which acts on behalf of the item's owner. */
  findById(id: string) {
    return prisma.podItem.findUnique({
      where: { id },
      include: { files: { orderBy: { order: "asc" } } },
    });
  },

  listForPod(podId: string, ownerId: string) {
    return prisma.podItem.findMany({
      where: { podId, ownerId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: listSelect,
    });
  },

  listForTopic(topicId: string, ownerId: string) {
    return prisma.podItem.findMany({
      where: { ownerId, deletedAt: null, topics: { some: { topicId } } },
      orderBy: { updatedAt: "desc" },
      select: listSelect,
    });
  },

  update(id: string, data: Prisma.PodItemUpdateInput) {
    return prisma.podItem.update({ where: { id }, data });
  },

  /** A note's document (already validated and cleaned) and its plain text. */
  saveNote(id: string, data: { title?: string; doc: object; text: string }) {
    return prisma.podItem.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        noteJson: data.doc as Prisma.InputJsonValue,
        noteText: data.text,
      },
    });
  },

  /** Replaces what the item maps to. */
  setTopics(itemId: string, topicIds: string[]) {
    return prisma.$transaction([
      prisma.podItemTopic.deleteMany({ where: { itemId } }),
      prisma.podItemTopic.createMany({
        data: topicIds.map((topicId) => ({ itemId, topicId })),
      }),
    ]);
  },

  trash(id: string, at: Date) {
    return prisma.podItem.update({ where: { id }, data: { deletedAt: at } });
  },

  restore(id: string) {
    return prisma.podItem.update({ where: { id }, data: { deletedAt: null } });
  },

  listTrash(ownerId: string) {
    return prisma.podItem.findMany({
      where: { ownerId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      select: {
        ...listSelect,
        deletedAt: true,
        pod: { select: { name: true } },
      },
    });
  },

  /** Items in the trash longer than the cutoff, with their files, for purging. */
  expiredTrash(before: Date) {
    return prisma.podItem.findMany({
      where: { deletedAt: { lt: before } },
      select: { id: true, files: { select: { storageKey: true } } },
      take: 500,
    });
  },

  deleteForever(ids: string[]) {
    return prisma.podItem.deleteMany({ where: { id: { in: ids } } });
  },
};

export type PodItemRepository = typeof podItemRepository;
export type PodItemSummary = Awaited<
  ReturnType<PodItemRepository["listForPod"]>
>[number];
