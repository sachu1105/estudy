import "server-only";

import type { Prisma } from "@/server/db/generated/prisma/client";
import { prisma } from "@/server/db";

const BUNDLE_SELECT = {
  id: true,
  ownerId: true,
  title: true,
  description: true,
  pricePaise: true,
  groupId: true,
  channelId: true,
  hiddenAt: true,
  createdAt: true,
  owner: { select: { id: true, displayName: true } },
  group: { select: { id: true, name: true, ownerId: true } },
  channel: { select: { id: true, name: true } },
  papers: {
    orderBy: { order: "asc" },
    select: {
      paper: {
        select: {
          id: true,
          title: true,
          questionCount: true,
          limitMin: true,
        },
      },
    },
  },
} as const;

export type BundleRow = Prisma.PaperBundleGetPayload<{
  select: typeof BUNDLE_SELECT;
}>;

/** Bundles of question papers, and who has one. */
export const bundleRepository = {
  async create(data: {
    ownerId: string;
    title: string;
    description: string;
    pricePaise: number | null;
    groupId: string;
    channelId: string;
    paperIds: string[];
  }) {
    const { paperIds, ...bundle } = data;
    return prisma.paperBundle.create({
      data: {
        ...bundle,
        papers: {
          create: paperIds.map((paperId, order) => ({ paperId, order })),
        },
      },
      select: { id: true },
    });
  },

  async find(id: string) {
    return prisma.paperBundle.findUnique({
      where: { id },
      select: BUNDLE_SELECT,
    });
  },

  async hide(id: string, at: Date) {
    await prisma.paperBundle.update({
      where: { id },
      data: { hiddenAt: at },
    });
  },

  async purchase(bundleId: string, userId: string) {
    return prisma.bundlePurchase.findFirst({
      where: { bundleId, userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, amountPaise: true, createdAt: true },
    });
  },

  async addPurchase(data: {
    bundleId: string;
    userId: string;
    amountPaise: number;
    provider: "DEMO" | "RAZORPAY" | null;
    providerRef: string | null;
  }) {
    return prisma.bundlePurchase.create({ data, select: { id: true } });
  },

  async countPurchases(bundleId: string) {
    return prisma.bundlePurchase.count({ where: { bundleId } });
  },

  /** Bundles this person has (bought or added) or made, newest first. */
  async forUser(userId: string) {
    return prisma.paperBundle.findMany({
      where: {
        OR: [
          { purchases: { some: { userId } } },
          { ownerId: userId, hiddenAt: null },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: BUNDLE_SELECT,
    });
  },

  /** Whether this person has a bundle holding this paper. */
  async hasPaper(userId: string, paperId: string) {
    const found = await prisma.bundlePurchase.findFirst({
      where: { userId, bundle: { papers: { some: { paperId } } } },
      select: { id: true },
    });
    return !!found;
  },
};

export type BundleRepository = typeof bundleRepository;
