import "server-only";

import { Prisma } from "@/server/db/generated/prisma/client";
import { prisma } from "@/server/db";

import { PAPER_SELECT } from "./paper-repository";

/** The channel fields a visibility check needs (channelService.canSee). */
const CHANNEL_SELECT = {
  id: true,
  groupId: true,
  name: true,
  viewRule: true,
  pricePaise: true,
} as const;

const SHARE_SELECT = {
  id: true,
  paperId: true,
  groupId: true,
  channelId: true,
  sharedById: true,
  opensAt: true,
  closesAt: true,
  resultsAt: true,
  showNames: true,
  hiddenAt: true,
  createdAt: true,
  paper: { select: PAPER_SELECT },
  group: { select: { id: true, name: true } },
  channel: { select: CHANNEL_SELECT },
  sharedBy: { select: { id: true, displayName: true } },
} as const;

const ENTRY_SELECT = {
  id: true,
  shareId: true,
  userId: true,
  registerNo: true,
  marks: true,
  startedAt: true,
  endsAt: true,
  submissionId: true,
} as const;

export type ShareRow = Prisma.PaperShareGetPayload<{
  select: typeof SHARE_SELECT;
}>;
export type EntryRow = Prisma.PaperEntryGetPayload<{
  select: typeof ENTRY_SELECT;
}>;

/** Papers shared into squad channels as exams, and each person's sitting in one. */
export const examRepository = {
  async create(data: {
    paperId: string;
    groupId: string;
    channelId: string;
    sharedById: string;
    opensAt: Date;
    closesAt: Date | null;
    resultsAt: Date | null;
    showNames: boolean;
  }) {
    return prisma.paperShare.create({ data, select: { id: true } });
  },

  async find(id: string) {
    return prisma.paperShare.findUnique({
      where: { id },
      select: SHARE_SELECT,
    });
  },

  /** The live shares of one paper, to see whether someone may open it. */
  async ofPaper(paperId: string) {
    return prisma.paperShare.findMany({
      where: { paperId, hiddenAt: null },
      select: SHARE_SELECT,
    });
  },

  /** Live shares in the squads this person belongs to, newest first, with their entry. */
  async forMember(userId: string) {
    return prisma.paperShare.findMany({
      where: {
        hiddenAt: null,
        group: { deletedAt: null, members: { some: { userId } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        ...SHARE_SELECT,
        entries: { where: { userId }, select: ENTRY_SELECT },
      },
    });
  },

  async update(
    id: string,
    data: { resultsAt?: Date | null; showNames?: boolean; hiddenAt?: Date },
  ) {
    await prisma.paperShare.update({ where: { id }, data });
  },

  async entry(shareId: string, userId: string) {
    return prisma.paperEntry.findUnique({
      where: { shareId_userId: { shareId, userId } },
      select: ENTRY_SELECT,
    });
  },

  /**
   * The person's entry, made now with the next register number. Two people starting at
   * once can both reach for the same number: the loser of that race tries again.
   */
  async createEntry(data: {
    shareId: string;
    userId: string;
    marks: number[];
    startedAt: Date;
    endsAt: Date | null;
    firstRegisterNo: number;
  }): Promise<EntryRow> {
    const { firstRegisterNo, ...entry } = data;
    for (let attempt = 0; ; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const mine = await tx.paperEntry.findUnique({
            where: {
              shareId_userId: { shareId: entry.shareId, userId: entry.userId },
            },
            select: ENTRY_SELECT,
          });
          if (mine) return mine;
          const last = await tx.paperEntry.aggregate({
            where: { shareId: entry.shareId },
            _max: { registerNo: true },
          });
          return tx.paperEntry.create({
            data: {
              ...entry,
              registerNo: (last._max.registerNo ?? firstRegisterNo - 1) + 1,
            },
            select: ENTRY_SELECT,
          });
        });
      } catch (error) {
        const clash =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (!clash || attempt >= 4) throw error;
      }
    }
  },

  /** Marks on a sitting still in progress; false once it's handed in. */
  async setEntryMarks(id: string, marks: number[]) {
    const { count } = await prisma.paperEntry.updateMany({
      where: { id, submissionId: null },
      data: { marks },
    });
    return count === 1;
  },

  /**
   * Hand a sitting in: its marks kept for good, linked to the entry. Null when it was
   * already handed in (by the person, or by the clock running out).
   */
  async submitEntry(
    entry: { id: string; paperId: string; userId: string; marks: number[] },
    data: { timeUsedSec: number; limitSec: number | null },
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const made = await tx.omrSubmission.create({
          data: {
            paperId: entry.paperId,
            userId: entry.userId,
            marks: entry.marks,
            ...data,
          },
          select: { id: true },
        });
        const { count } = await tx.paperEntry.updateMany({
          where: { id: entry.id, submissionId: null },
          data: { submissionId: made.id },
        });
        if (count !== 1) throw new AlreadyIn();
        return made;
      });
    } catch (error) {
      if (error instanceof AlreadyIn) return null;
      throw error;
    }
  },

  /** Sittings whose clock ran out without being handed in. */
  async overdue(shareId: string, now: Date) {
    return prisma.paperEntry.findMany({
      where: { shareId, submissionId: null, endsAt: { lte: now } },
      select: ENTRY_SELECT,
    });
  },

  /** Every handed-in sitting, with who sat it and their marks. */
  async results(shareId: string) {
    return prisma.paperEntry.findMany({
      where: { shareId, submissionId: { not: null } },
      select: {
        registerNo: true,
        userId: true,
        user: { select: { displayName: true } },
        submission: { select: { id: true, marks: true, timeUsedSec: true } },
      },
    });
  },

  async countEntries(shareId: string) {
    return prisma.paperEntry.count({ where: { shareId } });
  },
};

class AlreadyIn extends Error {}

export type ExamRepository = typeof examRepository;
