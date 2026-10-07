import "server-only";

import { prisma } from "@/server/db";
import { Prisma } from "@/server/db/generated/prisma/client";

/** Saved pod covers: on the pod row, or per user for an exam pod. */
export const coverRepository = {
  podCover(podId: string, ownerId: string) {
    return prisma.pod.findFirst({
      where: { id: podId, ownerId, deletedAt: null },
      select: { id: true, cover: true },
    });
  },

  async setPodCover(podId: string, ownerId: string, cover: object | null) {
    await prisma.pod.updateMany({
      where: { id: podId, ownerId, deletedAt: null },
      data: { cover: cover ?? Prisma.DbNull },
    });
  },

  async examCover(userId: string, syllabusVersionId: string) {
    const row = await prisma.examCover.findUnique({
      where: { userId_syllabusVersionId: { userId, syllabusVersionId } },
      select: { cover: true },
    });
    return row?.cover ?? null;
  },

  async setExamCover(
    userId: string,
    syllabusVersionId: string,
    cover: object | null,
  ) {
    if (!cover) {
      await prisma.examCover.deleteMany({
        where: { userId, syllabusVersionId },
      });
      return;
    }
    await prisma.examCover.upsert({
      where: { userId_syllabusVersionId: { userId, syllabusVersionId } },
      create: { userId, syllabusVersionId, cover },
      update: { cover },
    });
  },

  examCovers(userId: string) {
    return prisma.examCover.findMany({
      where: { userId },
      select: { syllabusVersionId: true, cover: true },
    });
  },
};

export type CoverRepository = typeof coverRepository;
