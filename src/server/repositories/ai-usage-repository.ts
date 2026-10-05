import "server-only";

import { prisma } from "@/server/db";
import type { AiUsageEntry } from "@/server/ai/types";

export const aiUsageRepository = {
  /** Append-only (rule 6). */
  async record(
    entry: AiUsageEntry & { userId: string | null; refId: string | null },
  ) {
    await prisma.aiUsage.create({ data: entry });
  },
};

export type AiUsageRepository = typeof aiUsageRepository;
