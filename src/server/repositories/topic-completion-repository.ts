import "server-only";

import { prisma } from "@/server/db";

/** Append-only (rule 6): a topic's state is its latest row. */
export const topicCompletionRepository = {
  async record(userId: string, topicId: string, done: boolean) {
    await prisma.topicCompletion.create({ data: { userId, topicId, done } });
  },

  /** Topic ids the user currently has marked done, out of `topicIds`. */
  async doneAmong(userId: string, topicIds: string[]): Promise<Set<string>> {
    if (topicIds.length === 0) return new Set();
    const rows = await prisma.$queryRaw<{ topicId: string; done: boolean }[]>`
      SELECT DISTINCT ON ("topicId") "topicId", done
      FROM "TopicCompletion"
      WHERE "userId" = ${userId}::uuid AND "topicId" = ANY(${topicIds}::uuid[])
      ORDER BY "topicId", "createdAt" DESC, id DESC`;
    return new Set(rows.filter((r) => r.done).map((r) => r.topicId));
  },
};

export type TopicCompletionRepository = typeof topicCompletionRepository;
