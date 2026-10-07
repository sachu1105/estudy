import "server-only";

import { prisma } from "@/server/db";

import { toDbDate } from "./plan-repository";

/** Postgres side of the weekly board: the source of truth it is rebuilt from. */
export const rankRepository = {
  /** XP per user, from a day on. */
  async xpSums(from: string) {
    const rows = await prisma.xpLedger.groupBy({
      by: ["userId"],
      where: { localDate: { gte: toDbDate(from) } },
      _sum: { amount: true },
    });
    return rows.map((r) => ({ userId: r.userId, xp: r._sum.amount ?? 0 }));
  },
};

export type RankRepository = typeof rankRepository;
