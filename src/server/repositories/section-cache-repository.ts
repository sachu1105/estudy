import "server-only";

import type { CachedPiece } from "@/server/ai/structure";
import { prisma } from "@/server/db";

/** Structured syllabus sections shared by every syllabus that contains them word for word. */
export const sectionCacheRepository = {
  async get(key: string): Promise<CachedPiece | null> {
    const row = await prisma.sectionCache.findUnique({ where: { key } });
    return row ? (row.subjects as CachedPiece) : null;
  },

  async set(key: string, subjects: CachedPiece) {
    // Two jobs may finish the same section at once; the first one stays.
    await prisma.sectionCache.upsert({
      where: { key },
      create: { key, subjects },
      update: {},
    });
  },
};

export type SectionCacheRepository = typeof sectionCacheRepository;
