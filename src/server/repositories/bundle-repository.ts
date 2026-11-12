import "server-only";

import type {
  Plan,
  Prisma,
  StoreListing,
} from "@/server/db/generated/prisma/client";
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
  listing: true,
  listingNote: true,
  listedAt: true,
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
          wrongNum: true,
          wrongDen: true,
          keySource: true,
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
    /** A seller's Store listing, waiting for an admin. */
    listing?: StoreListing | null;
    listedAt?: Date | null;
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

  /**
   * The Store as everyone sees it: the studypods library once published, and sellers'
   * listings once an admin approved them. The library's first, newest first in each.
   */
  async library() {
    return prisma.paperBundle.findMany({
      where: {
        hiddenAt: null,
        OR: [
          { catalogue: true, publishedAt: { not: null } },
          { catalogue: false, listing: "LIVE" },
        ],
      },
      orderBy: [
        { catalogue: "desc" },
        { publishedAt: "desc" },
        { listedAt: "desc" },
      ],
      take: 200,
      select: BUNDLE_SELECT,
    });
  },

  /** Sets where a seller's listing stands; `listedAt` when they ask (again). */
  async setListing(
    id: string,
    data: {
      listing: StoreListing | null;
      listingNote: string | null;
      listedAt?: Date;
      pricePaise?: number | null;
    },
  ) {
    await prisma.paperBundle.update({ where: { id }, data });
  },

  /**
   * Admin > Papers: sellers' listings waiting for review (oldest first) and live ones,
   * with each paper's key, so an admin can see it's complete and whose it is.
   */
  async listings() {
    return prisma.paperBundle.findMany({
      where: {
        catalogue: false,
        hiddenAt: null,
        listing: { in: ["PENDING", "LIVE"] },
      },
      orderBy: [{ listing: "asc" }, { listedAt: "asc" }],
      take: 100,
      select: {
        ...BUNDLE_SELECT,
        owner: { select: { id: true, displayName: true, email: true } },
        papers: {
          orderBy: { order: "asc" },
          select: {
            paper: {
              select: {
                id: true,
                title: true,
                questionCount: true,
                limitMin: true,
                wrongNum: true,
                wrongDen: true,
                keySource: true,
                answerKey: true,
              },
            },
          },
        },
        _count: { select: { purchases: true } },
      },
    });
  },

  /** Whether a paper is in a seller's listing that's waiting for review or live. */
  async listedWithPaper(paperId: string) {
    const found = await prisma.paperBundle.findFirst({
      where: {
        catalogue: false,
        hiddenAt: null,
        listing: { in: ["PENDING", "LIVE"] },
        papers: { some: { paperId } },
      },
      select: { id: true },
    });
    return !!found;
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
    /** studypods' share of a seller's Store sale. */
    cutPaise?: number | null;
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
      select: {
        ...BUNDLE_SELECT,
        // When this person got it (their first add or purchase), and how many have it.
        purchases: {
          where: { userId },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
        _count: { select: { purchases: true } },
      },
    });
  },

  /**
   * For a bundle's maker: how many have it and how (bought or added free), what it
   * earned, how many of them sat a paper and how often, and the latest adds and sales.
   * Nobody is named: Store buyers are strangers to the seller.
   */
  async stats(bundleId: string, paperIds: string[], ownerId: string) {
    const [bought, free, money, sitters, sittings, recent] = await Promise.all([
      prisma.bundlePurchase.count({
        where: { bundleId, amountPaise: { gt: 0 } },
      }),
      prisma.bundlePurchase.count({ where: { bundleId, amountPaise: 0 } }),
      prisma.bundlePurchase.aggregate({
        where: { bundleId },
        _sum: { amountPaise: true, cutPaise: true },
      }),
      prisma.omrSubmission.findMany({
        where: {
          paperId: { in: paperIds },
          userId: { not: ownerId },
          user: { bundlePurchases: { some: { bundleId } } },
        },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.omrSubmission.count({
        where: {
          paperId: { in: paperIds },
          userId: { not: ownerId },
          user: { bundlePurchases: { some: { bundleId } } },
        },
      }),
      prisma.bundlePurchase.findMany({
        where: { bundleId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, amountPaise: true, createdAt: true },
      }),
    ]);
    return {
      bought,
      free,
      grossPaise: money._sum.amountPaise ?? 0,
      cutPaise: money._sum.cutPaise ?? 0,
      sat: sitters.length,
      sittings,
      recent,
    };
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
