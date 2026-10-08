import "server-only";

import { prisma } from "@/server/db";

export const catalogueRepository = {
  /** Every exam with its approved catalogue syllabuses (rule 5: nothing pending). */
  listExams() {
    return prisma.exam.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        syllabuses: {
          where: {
            visibility: "CATALOGUE",
            status: "APPROVED",
            deletedAt: null,
          },
          orderBy: { approvedAt: "desc" },
          select: {
            id: true,
            title: true,
            approvedAt: true,
            _count: { select: { subjects: true } },
          },
        },
      },
    });
  },

  /**
   * The subjects of an exam's newest approved catalogue syllabus, with their topics.
   * Used to make a channel per subject, and to narrow a subject channel's topic list.
   */
  async subjectsForExam(examId: string) {
    const version = await prisma.syllabusVersion.findFirst({
      where: {
        examId,
        visibility: "CATALOGUE",
        status: "APPROVED",
        deletedAt: null,
      },
      orderBy: { approvedAt: "desc" },
      select: {
        subjects: {
          orderBy: { order: "asc" },
          select: {
            name: true,
            topics: { orderBy: { order: "asc" }, select: { name: true } },
          },
        },
      },
    });
    return (version?.subjects ?? []).map((s) => ({
      name: s.name,
      topics: s.topics.map((t) => t.name),
    }));
  },

  examExists(id: string) {
    return prisma.exam.count({ where: { id } }).then((n) => n > 0);
  },

  upsertExam(data: {
    slug: string;
    name: string;
    board: string;
    description: string;
    order: number;
  }) {
    return prisma.exam.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
    });
  },
};

export type CatalogueRepository = typeof catalogueRepository;
