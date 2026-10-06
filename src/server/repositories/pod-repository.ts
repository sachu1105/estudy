import "server-only";

import { prisma } from "@/server/db";
import type { PodStage } from "@/server/db/generated/prisma/client";

export const podRepository = {
  /**
   * One SUBJECT pod per subject of an approved syllabus, kept in step with it: new
   * subjects get a pod, renamed or reordered ones update theirs, and a pod whose subject
   * was removed keeps its material and becomes custom.
   */
  async syncSubjectPods(ownerId: string, syllabusVersionId: string) {
    const subjects = await prisma.subject.findMany({
      where: { syllabusVersionId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, order: true },
    });
    await prisma.$transaction(async (tx) => {
      for (const s of subjects) {
        await tx.pod.upsert({
          where: { ownerId_subjectId: { ownerId, subjectId: s.id } },
          create: {
            ownerId,
            kind: "SUBJECT",
            name: s.name,
            subjectId: s.id,
            syllabusVersionId,
            order: s.order,
            stageOrder: s.order,
          },
          update: { name: s.name, order: s.order, deletedAt: null },
        });
      }
      // A removed subject's pod: gone if empty, else kept as the user's own (material is
      // never lost to a syllabus edit).
      const orphan = {
        ownerId,
        syllabusVersionId,
        kind: "SUBJECT" as const,
        subjectId: null,
      };
      await tx.pod.deleteMany({ where: { ...orphan, items: { none: {} } } });
      await tx.pod.updateMany({
        where: orphan,
        data: { kind: "CUSTOM", syllabusVersionId: null },
      });
    });
  },

  /** Ids of the user's subject pods for one syllabus: the cards on its board. */
  async boardPodIds(ownerId: string, syllabusVersionId: string) {
    const pods = await prisma.pod.findMany({
      where: { ownerId, syllabusVersionId, kind: "SUBJECT", deletedAt: null },
      select: { id: true },
    });
    return pods.map((p) => p.id);
  },

  /** Saves the whole board at once: each pod's column and its place in it. */
  async arrangeBoard(
    ownerId: string,
    placements: { id: string; stage: PodStage; stageOrder: number }[],
  ) {
    await prisma.$transaction(
      placements.map((p) =>
        prisma.pod.updateMany({
          where: { id: p.id, ownerId },
          data: { stage: p.stage, stageOrder: p.stageOrder },
        }),
      ),
    );
  },

  listOwned(ownerId: string) {
    return prisma.pod.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: [
        { syllabusVersionId: "asc" },
        { order: "asc" },
        { createdAt: "asc" },
      ],
      include: {
        syllabusVersion: {
          select: { id: true, title: true, exam: { select: { name: true } } },
        },
        subject: {
          select: {
            topics: {
              orderBy: { order: "asc" },
              select: { id: true, name: true },
            },
          },
        },
        _count: { select: { items: { where: { deletedAt: null } } } },
      },
    });
  },

  findOwned(id: string, ownerId: string) {
    return prisma.pod.findFirst({
      where: { id, ownerId, deletedAt: null },
      include: {
        syllabusVersion: {
          select: { id: true, title: true, exam: { select: { name: true } } },
        },
        subject: {
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: {
                _count: {
                  select: { items: { where: { item: { deletedAt: null } } } },
                },
              },
            },
          },
        },
        _count: { select: { items: { where: { deletedAt: null } } } },
      },
    });
  },

  findBySubject(ownerId: string, subjectId: string) {
    return prisma.pod.findFirst({
      where: { ownerId, subjectId, deletedAt: null },
      select: { id: true },
    });
  },

  subjectVersion(subjectId: string) {
    return prisma.subject.findUnique({
      where: { id: subjectId },
      select: { syllabusVersionId: true },
    });
  },

  /** Topics of the user's pods whose name contains `text`. */
  searchTopics(ownerId: string, text: string) {
    return prisma.topic.findMany({
      where: {
        name: { contains: text, mode: "insensitive" },
        subject: { pods: { some: { ownerId, deletedAt: null } } },
      },
      select: {
        id: true,
        name: true,
        subject: {
          select: {
            pods: {
              where: { ownerId, deletedAt: null },
              select: { id: true, name: true },
            },
          },
        },
      },
      take: 20,
    });
  },

  createCustom(ownerId: string, name: string) {
    return prisma.pod.create({ data: { ownerId, kind: "CUSTOM", name } });
  },

  rename(id: string, name: string) {
    return prisma.pod.update({ where: { id }, data: { name } });
  },

  softDelete(id: string, at: Date) {
    return prisma.pod.update({ where: { id }, data: { deletedAt: at } });
  },
};

export type PodRepository = typeof podRepository;
export type OwnedPod = NonNullable<
  Awaited<ReturnType<PodRepository["findOwned"]>>
>;
