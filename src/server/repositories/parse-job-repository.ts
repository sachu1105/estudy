import "server-only";

import { prisma } from "@/server/db";
import type { Prisma } from "@/server/db/generated/prisma/client";

export const parseJobRepository = {
  create(data: {
    syllabusVersionId: string;
    userId: string;
    status?: "QUEUED" | "READY";
    stage?: "QUEUED" | "READY";
    progress?: number;
    reused?: boolean;
    finishedAt?: Date;
  }) {
    return prisma.parseJob.create({ data });
  },

  findById(id: string) {
    return prisma.parseJob.findUnique({
      where: { id },
      include: { syllabusVersion: true },
    });
  },

  /** A catalogue syllabus's job, which any admin who reviews the catalogue may watch. */
  findForCatalogue(id: string) {
    return prisma.parseJob.findFirst({
      where: { id, syllabusVersion: { visibility: "CATALOGUE" } },
    });
  },

  /** The latest job of a catalogue syllabus, for a retry after it failed. */
  latestForVersion(syllabusVersionId: string) {
    return prisma.parseJob.findFirst({
      where: { syllabusVersionId },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Only the user who started a job may watch it (rule 9). */
  findForUser(id: string, userId: string) {
    return prisma.parseJob.findFirst({ where: { id, userId } });
  },

  /** Jobs still queued or running that were started before `before`. */
  listOpen(before: Date) {
    return prisma.parseJob.findMany({
      where: {
        status: { in: ["QUEUED", "RUNNING"] },
        createdAt: { lt: before },
      },
      select: { id: true },
    });
  },

  update(id: string, data: Prisma.ParseJobUpdateInput) {
    return prisma.parseJob.update({ where: { id }, data });
  },
};

export type ParseJobRepository = typeof parseJobRepository;
