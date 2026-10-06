import "server-only";

import type { EditableTree } from "@/lib/syllabus/tree";
import { prisma } from "@/server/db";
import { Prisma } from "@/server/db/generated/prisma/client";

import type { SyllabusTree } from "@/server/ai/syllabus-tree";

type Tx = Prisma.TransactionClient;
type Kind = "PDF" | "DOCX" | "IMAGE" | "TEXT";

const treeInclude = {
  subjects: {
    orderBy: { order: "asc" as const },
    include: { topics: { orderBy: { order: "asc" as const } } },
  },
};

async function writeTree(tx: Tx, versionId: string, tree: EditableTree) {
  await tx.subject.deleteMany({ where: { syllabusVersionId: versionId } });
  await tx.subject.createMany({
    data: tree.subjects.map((s, order) => ({
      id: s.id,
      syllabusVersionId: versionId,
      name: s.name,
      order,
    })),
  });
  await tx.topic.createMany({
    data: tree.subjects.flatMap((s) =>
      s.topics.map((t, order) => ({
        id: t.id,
        subjectId: s.id,
        name: t.name,
        weight: t.weight,
        difficulty: t.difficulty,
        foundational: t.foundational,
        order,
      })),
    ),
  });
}

/** Gives every node of an AI tree a fresh uuid, so each upload owns its own copy. */
function withIds(tree: SyllabusTree): EditableTree {
  return {
    subjects: tree.subjects.map((s) => ({
      id: crypto.randomUUID(),
      name: s.name,
      topics: s.topics.map((t) => ({ id: crypto.randomUUID(), ...t })),
    })),
  };
}

export const syllabusRepository = {
  /** Uploads count against limit(user, 'syllabusUploads'); deleted ones don't. */
  countUploads(ownerId: string) {
    return prisma.syllabusVersion.count({
      where: {
        ownerId,
        visibility: "PRIVATE",
        deletedAt: null,
        sourceKind: { not: null },
      },
    });
  },

  createUpload(data: {
    ownerId: string;
    title: string;
    examId: string | null;
    fileHash: string;
    sourceFileKey: string;
    sourceKind: Kind;
    sourceName: string | null;
    sizeBytes: number;
  }) {
    return prisma.syllabusVersion.create({ data });
  },

  /** The parse of this file by the current parser, if there is one (rule 4). */
  findParse(fileHash: string, promptVersion: string) {
    return prisma.syllabusParse.findUnique({
      where: { fileHash_promptVersion: { fileHash, promptVersion } },
    });
  },

  /** Saves a parse once per file and parser. If another job won the race, returns that one. */
  async saveParse(data: {
    fileHash: string;
    sourceKind: Kind;
    extractedText: string;
    tree: SyllabusTree;
    provider: string;
    model: string;
    promptVersion: string;
    warnings: string[];
    minhash: number[];
    post: string | null;
    copiedFromId?: string | null;
  }) {
    try {
      return await prisma.syllabusParse.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return prisma.syllabusParse.findUniqueOrThrow({
          where: {
            fileHash_promptVersion: {
              fileHash: data.fileHash,
              promptVersion: data.promptVersion,
            },
          },
        });
      throw error;
    }
  },

  /**
   * Parses by the same parser that might be the same syllabus: the newest first, those for
   * the same post ahead of the rest. Signatures are compared in the service.
   */
  findSimilarCandidates(promptVersion: string, post: string | null) {
    return prisma.syllabusParse
      .findMany({
        where: { promptVersion, NOT: { minhash: { isEmpty: true } } },
        select: {
          id: true,
          minhash: true,
          post: true,
          tree: true,
          warnings: true,
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
      })
      .then((rows) =>
        post
          ? [
              ...rows.filter((r) => r.post === post),
              ...rows.filter((r) => r.post !== post),
            ]
          : rows,
      );
  },

  /** Links a version to a parse and copies the parse's tree in as the editable draft. */
  attachParse(versionId: string, parse: { id: string; tree: unknown }) {
    const tree = withIds(parse.tree as SyllabusTree);
    return prisma.$transaction(async (tx) => {
      await tx.syllabusVersion.update({
        where: { id: versionId },
        data: { parseId: parse.id },
      });
      await writeTree(tx, versionId, tree);
    });
  },

  findOwned(id: string, ownerId: string) {
    return prisma.syllabusVersion.findFirst({
      where: { id, ownerId, deletedAt: null },
      include: {
        ...treeInclude,
        exam: { select: { id: true, name: true } },
        parse: {
          select: { extractedText: true, warnings: true, promptVersion: true },
        },
        parseJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  },

  /** A catalogue syllabus anyone may read once an admin approved it (rule 5). */
  findApprovedCatalogue(id: string) {
    return prisma.syllabusVersion.findFirst({
      where: {
        id,
        visibility: "CATALOGUE",
        status: "APPROVED",
        deletedAt: null,
      },
      include: { ...treeInclude, exam: { select: { id: true, name: true } } },
    });
  },

  listOwned(ownerId: string) {
    return prisma.syllabusVersion.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        exam: { select: { name: true } },
        parseJobs: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { subjects: true } },
      },
    });
  },

  async topicCount(versionId: string) {
    return prisma.topic.count({
      where: { subject: { syllabusVersionId: versionId } },
    });
  },

  replaceTree(versionId: string, tree: EditableTree) {
    return prisma.$transaction((tx) => writeTree(tx, versionId, tree));
  },

  approvePrivate(versionId: string, tree: EditableTree, at: Date) {
    return prisma.$transaction(async (tx) => {
      await writeTree(tx, versionId, tree);
      await tx.syllabusVersion.update({
        where: { id: versionId },
        data: { status: "APPROVED", approvedAt: at },
      });
    });
  },

  /** Back to "being read": drops the tree and the parse link, so a new job reads it fresh. */
  resetForReparse(versionId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.subject.deleteMany({ where: { syllabusVersionId: versionId } });
      await tx.syllabusVersion.update({
        where: { id: versionId },
        data: { parseId: null, status: "DRAFT", approvedAt: null },
      });
    });
  },

  /** True once the user deleted it (or it never existed): a running parse stops. */
  async isDeleted(versionId: string) {
    const row = await prisma.syllabusVersion.findUnique({
      where: { id: versionId },
      select: { deletedAt: true },
    });
    return !row || row.deletedAt !== null;
  },

  softDelete(versionId: string, at: Date) {
    return prisma.syllabusVersion.update({
      where: { id: versionId },
      data: { deletedAt: at },
    });
  },
};

export type SyllabusRepository = typeof syllabusRepository;
export type OwnedSyllabus = NonNullable<
  Awaited<ReturnType<SyllabusRepository["findOwned"]>>
>;
