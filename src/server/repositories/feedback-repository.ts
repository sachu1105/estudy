import "server-only";

import type { RatingInput } from "@/lib/feedback/schemas";
import { prisma } from "@/server/db";

/** App ratings. The only code that touches their table. */
export const feedbackRepository = {
  ratingOf(userId: string) {
    return prisma.appRating.findUnique({
      where: { userId },
      select: { stars: true, note: true, updatedAt: true },
    });
  },

  rate(userId: string, input: RatingInput, at: Date) {
    const note = input.note || null;
    return prisma.appRating.upsert({
      where: { userId },
      create: {
        userId,
        stars: input.stars,
        note,
        createdAt: at,
        updatedAt: at,
      },
      update: { stars: input.stars, note, updatedAt: at },
    });
  },

  /** How the stars spread, and the latest notes left with a rating (Admin > Feedback). */
  async ratingSummary() {
    const [groups, recent] = await Promise.all([
      prisma.appRating.groupBy({ by: ["stars"], _count: { _all: true } }),
      prisma.appRating.findMany({
        where: { note: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          stars: true,
          note: true,
          updatedAt: true,
          user: { select: { displayName: true } },
        },
      }),
    ]);
    return { groups, recent };
  },
};

export type FeedbackRepository = typeof feedbackRepository;
