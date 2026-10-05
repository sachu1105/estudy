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

  /** Only the user who started a job may watch it (rule 9). */
  findForUser(id: string, userId: string) {
    return prisma.parseJob.findFirst({ where: { id, userId } });
  },

  update(id: string, data: Prisma.ParseJobUpdateInput) {
    return prisma.parseJob.update({ where: { id }, data });
  },
};

export type ParseJobRepository = typeof parseJobRepository;
