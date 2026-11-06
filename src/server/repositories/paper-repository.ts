import "server-only";

import type {
  CancelRule,
  PaperKeySource,
} from "@/server/db/generated/prisma/client";
import { prisma } from "@/server/db";

/** The timer columns on a sheet (lib/omr/timer). */
export type TimerColumns = {
  timerOn: boolean;
  timerLimitSec: number | null;
  timerElapsedSec: number;
  timerRunningSince: Date | null;
};

const TIMER_OFF: TimerColumns = {
  timerOn: false,
  timerLimitSec: null,
  timerElapsedSec: 0,
  timerRunningSince: null,
};

const SHEET_SELECT = {
  marks: true,
  timerOn: true,
  timerLimitSec: true,
  timerElapsedSec: true,
  timerRunningSince: true,
  updatedAt: true,
} as const;

/** Everything about a paper but its file: how it's marked and its key. */
const PAPER_SELECT = {
  id: true,
  ownerId: true,
  title: true,
  storageKey: true,
  pageCount: true,
  questionCount: true,
  optionCount: true,
  rightNum: true,
  rightDen: true,
  wrongNum: true,
  wrongDen: true,
  cutoffNum: true,
  cutoffDen: true,
  limitMin: true,
  answerKey: true,
  keySource: true,
  cancelRule: true,
  keyUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PaperSettings = {
  questionCount: number;
  optionCount: number;
  rightNum: number;
  rightDen: number;
  wrongNum: number;
  wrongDen: number;
  cutoffNum: number | null;
  cutoffDen: number | null;
  limitMin: number | null;
  cancelRule: CancelRule;
};

/** Question papers, the OMR sheet each person marks for one, and handed-in sheets. */
export const paperRepository = {
  /** A new paper and its owner's blank sheet. */
  async create(data: {
    ownerId: string;
    title: string;
    storageKey: string;
    sizeBytes: number;
    sha256: string;
    pageCount: number | null;
    answerKey: number[];
    marks: number[];
  }) {
    const { marks, ...paper } = data;
    return prisma.paper.create({
      data: {
        ...paper,
        sheets: { create: { ownerId: data.ownerId, marks } },
      },
      select: { id: true },
    });
  },

  /** The owner's papers, newest work first, each with their sheet and last hand-in. */
  async listOwned(ownerId: string) {
    const papers = await prisma.paper.findMany({
      where: { ownerId },
      select: {
        ...PAPER_SELECT,
        sheets: { where: { ownerId }, select: SHEET_SELECT, take: 1 },
        submissions: {
          where: { userId: ownerId },
          orderBy: { createdAt: "desc" },
          select: { id: true, marks: true, createdAt: true },
          take: 1,
        },
      },
    });
    const touched = (p: (typeof papers)[number]) =>
      Math.max(
        p.updatedAt.getTime(),
        p.sheets[0]?.updatedAt.getTime() ?? 0,
        p.submissions[0]?.createdAt.getTime() ?? 0,
      );
    return papers.sort((a, b) => touched(b) - touched(a));
  },

  async findOwned(id: string, ownerId: string) {
    return prisma.paper.findFirst({
      where: { id, ownerId },
      select: PAPER_SELECT,
    });
  },

  /** The person's sheet for a paper, made blank the first time they open it. */
  async sheet(paperId: string, ownerId: string, blank: number[]) {
    return prisma.omrSheet.upsert({
      where: { paperId_ownerId: { paperId, ownerId } },
      create: { paperId, ownerId, marks: blank },
      update: {},
      select: SHEET_SELECT,
    });
  },

  async setMarks(paperId: string, ownerId: string, marks: number[]) {
    const { count } = await prisma.omrSheet.updateMany({
      where: { paperId, ownerId },
      data: { marks },
    });
    return count === 1;
  },

  async setTimer(paperId: string, ownerId: string, timer: TimerColumns) {
    const { count } = await prisma.omrSheet.updateMany({
      where: { paperId, ownerId },
      data: timer,
    });
    return count === 1;
  },

  /**
   * How the paper is marked, and its key and every sheet reshaped to match (both are
   * passed in already cut or padded to the new number of questions).
   */
  async setSettings(
    id: string,
    ownerId: string,
    settings: PaperSettings,
    reshape: (marks: number[]) => number[],
    answerKey: number[],
  ) {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.paper.updateMany({
        where: { id, ownerId },
        data: { ...settings, answerKey },
      });
      if (count !== 1) return false;
      const sheets = await tx.omrSheet.findMany({
        where: { paperId: id },
        select: { id: true, marks: true },
      });
      for (const sheet of sheets)
        await tx.omrSheet.update({
          where: { id: sheet.id },
          data: { marks: reshape(sheet.marks) },
        });
      return true;
    });
  },

  async setKey(
    id: string,
    ownerId: string,
    data: {
      answerKey: number[];
      keySource: PaperKeySource;
      keyUpdatedAt: Date;
    },
  ) {
    const { count } = await prisma.paper.updateMany({
      where: { id, ownerId },
      data,
    });
    return count === 1;
  },

  async rename(id: string, ownerId: string, title: string) {
    const { count } = await prisma.paper.updateMany({
      where: { id, ownerId },
      data: { title },
    });
    return count === 1;
  },

  /** The paper with every sheet and hand-in for it. */
  async delete(id: string, ownerId: string) {
    const { count } = await prisma.paper.deleteMany({ where: { id, ownerId } });
    return count === 1;
  },

  async bytesUsed(ownerId: string) {
    const sum = await prisma.paper.aggregate({
      where: { ownerId },
      _sum: { sizeBytes: true },
    });
    return sum._sum.sizeBytes ?? 0;
  },

  /** Hand the sheet in: keep its marks for good, and clear it for the next sitting. */
  async submit(
    paperId: string,
    userId: string,
    data: { marks: number[]; timeUsedSec: number; limitSec: number | null },
    blank: number[],
  ) {
    return prisma.$transaction(async (tx) => {
      const made = await tx.omrSubmission.create({
        data: { paperId, userId, ...data },
        select: { id: true },
      });
      await tx.omrSheet.updateMany({
        where: { paperId, ownerId: userId },
        data: { marks: blank, ...TIMER_OFF },
      });
      return made;
    });
  },

  /** The person's hand-ins for a paper, newest first. */
  async submissions(paperId: string, userId: string) {
    return prisma.omrSubmission.findMany({
      where: { paperId, userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        marks: true,
        timeUsedSec: true,
        limitSec: true,
        createdAt: true,
      },
    });
  },
};

export type PaperRepository = typeof paperRepository;
export type PaperRow = NonNullable<
  Awaited<ReturnType<PaperRepository["findOwned"]>>
>;
export type SheetRow = Awaited<ReturnType<PaperRepository["sheet"]>>;
