import "server-only";

import { prisma } from "@/server/db";
import type { PodItemType, Prisma } from "@/server/db/generated/prisma/client";

/** Material shared into groups (milestone 13). Copies, never links to private pods. */
export const groupItemRepository = {
  create(item: {
    groupId: string;
    channelId: string;
    sharedById: string;
    type: PodItemType;
    title: string;
    noteJson?: unknown;
    noteText?: string | null;
    url?: string | null;
    linkDescription?: string | null;
    subjectName?: string | null;
    topicName?: string | null;
    sizeBytes: number;
    files: {
      id: string;
      order: number;
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
    }[];
  }) {
    const { files, noteJson, ...rest } = item;
    return prisma.groupItem.create({
      data: {
        ...rest,
        ...(noteJson ? { noteJson: noteJson as Prisma.InputJsonValue } : {}),
        files: { create: files },
      },
    });
  },

  /** A squad's material, or one channel's when channelId is given. */
  list(groupId: string, hideFrom: Set<string>, channelId?: string | null) {
    return prisma.groupItem.findMany({
      where: {
        groupId,
        ...(channelId ? { channelId } : {}),
        deletedAt: null,
        hiddenAt: null,
        sharedById: { notIn: [...hideFrom] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        title: true,
        url: true,
        subjectName: true,
        topicName: true,
        sizeBytes: true,
        createdAt: true,
        sharedBy: { select: { id: true, displayName: true } },
        _count: { select: { files: true } },
      },
    });
  },

  find(groupId: string, itemId: string) {
    return prisma.groupItem.findFirst({
      where: { id: itemId, groupId, deletedAt: null, hiddenAt: null },
      include: {
        files: { orderBy: { order: "asc" } },
        sharedBy: { select: { id: true, displayName: true } },
      },
    });
  },

  findAny(itemId: string) {
    return prisma.groupItem.findUnique({
      where: { id: itemId },
      include: { files: true },
    });
  },

  softDelete(itemId: string, at: Date) {
    return prisma.groupItem.update({
      where: { id: itemId },
      data: { deletedAt: at },
    });
  },

  hide(itemId: string, at: Date) {
    return prisma.groupItem.update({
      where: { id: itemId },
      data: { hiddenAt: at },
    });
  },

  /** Bytes shared in the groups someone owns: their plan's group storage. */
  async bytesForOwner(ownerId: string) {
    const sum = await prisma.groupItem.aggregate({
      where: { deletedAt: null, group: { ownerId, deletedAt: null } },
      _sum: { sizeBytes: true },
    });
    return sum._sum.sizeBytes ?? 0;
  },

  file(fileId: string) {
    return prisma.groupItemFile.findUnique({
      where: { id: fileId },
      include: {
        item: { select: { groupId: true, deletedAt: true, hiddenAt: true } },
      },
    });
  },
};

export type GroupItemRepository = typeof groupItemRepository;
