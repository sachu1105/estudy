import "server-only";

import { prisma } from "@/server/db";

const LIST_SELECT = {
  id: true,
  title: true,
  marks: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const omrSheetRepository = {
  async create(data: {
    ownerId: string;
    title: string;
    storageKey: string;
    sizeBytes: number;
    sha256: string;
    pageCount: number | null;
    marks: number[];
  }) {
    return prisma.omrSheet.create({ data, select: { id: true } });
  },

  async listOwned(ownerId: string) {
    return prisma.omrSheet.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      select: LIST_SELECT,
    });
  },

  async findOwned(id: string, ownerId: string) {
    return prisma.omrSheet.findFirst({ where: { id, ownerId } });
  },

  async setMarks(id: string, ownerId: string, marks: number[]) {
    const { count } = await prisma.omrSheet.updateMany({
      where: { id, ownerId },
      data: { marks },
    });
    return count === 1;
  },

  async rename(id: string, ownerId: string, title: string) {
    const { count } = await prisma.omrSheet.updateMany({
      where: { id, ownerId },
      data: { title },
    });
    return count === 1;
  },

  async delete(id: string, ownerId: string) {
    const { count } = await prisma.omrSheet.deleteMany({
      where: { id, ownerId },
    });
    return count === 1;
  },

  async bytesUsed(ownerId: string) {
    const sum = await prisma.omrSheet.aggregate({
      where: { ownerId },
      _sum: { sizeBytes: true },
    });
    return sum._sum.sizeBytes ?? 0;
  },
};

export type OmrSheetRepository = typeof omrSheetRepository;
