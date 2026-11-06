import "server-only";

import type { Plan, Prisma } from "@/server/db/generated/prisma/client";
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
  catalogue: true,
  includedIn: true,
  publishedAt: true,
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
    groupId: string | null;
    channelId: string | null;
    paperIds: string[];
    /** A library bundle (Admin > Papers), with the plans that include it. */
    catalogue?: boolean;
    includedIn?: Plan[];
    publishedAt?: Date | null;
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

  /** A library bundle's details and papers, the papers in the order given. */
  async update(
    id: string,
    data: {
      title: string;
      description: string;
      pricePaise: number | null;
      includedIn: Plan[];
      paperIds: string[];
    },
  ) {
    const { paperIds, ...rest } = data;
    await prisma.$transaction([
      prisma.bundlePaper.deleteMany({ where: { bundleId: id } }),
      prisma.paperBundle.update({
        where: { id },
        data: {
          ...rest,
          papers: {
            create: paperIds.map((paperId, order) => ({ paperId, order })),
          },
        },
      }),
    ]);
  },

  async setPublished(id: string, at: Date | null) {
    await prisma.paperBundle.update({
      where: { id },
      data: { publishedAt: at },
    });
  },

  /** The library as everyone sees it: published, newest first. */
  async library() {
    return prisma.paperBundle.findMany({
      where: { catalogue: true, publishedAt: { not: null }, hiddenAt: null },
      orderBy: { publishedAt: "desc" },
      take: 100,
      select: BUNDLE_SELECT,
    });
  },

  /** Every library bundle, drafts too, for Admin > Papers. */
  async catalogue() {
    return prisma.paperBundle.findMany({
      where: { catalogue: true, hiddenAt: null },
      orderBy: { createdAt: "desc" },
      select: { ...BUNDLE_SELECT, _count: { select: { purchases: true } } },
    });
  },

  /** The plans that include a published library bundle holding this paper. */
  async includedWithPaper(paperId: string) {
    const rows = await prisma.paperBundle.findMany({
      where: {
        catalogue: true,
        publishedAt: { not: null },
        hiddenAt: null,
        papers: { some: { paperId } },
      },
      select: { includedIn: true },
    });
    return rows.map((r) => r.includedIn);
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

  /** The bundles this person bought or added. */
  async ownedIds(userId: string) {
    const rows = await prisma.bundlePurchase.findMany({
      where: { userId },
      select: { bundleId: true },
    });
    return rows.map((r) => r.bundleId);
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
