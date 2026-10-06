import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { rankStore } from "@/server/rank/rank-store";
import { redis } from "@/server/redis";
import { progressRepository } from "@/server/repositories/progress-repository";
import { rankRepository } from "@/server/repositories/rank-repository";
import { createRankService } from "@/server/services/rank/rank-service";

import { resetDatabase } from "./helpers";

// Wednesday 7 October 2026, 10:00 in India.
const clock = fixedClock("2026-10-07T04:30:00Z");
const ranks = createRankService({
  ranks: rankRepository,
  store: rankStore,
  clock,
});
const id = () => crypto.randomUUID();

async function clearBoards() {
  const keys = await redis.keys("test:rank:*");
  if (keys.length) await redis.del(...keys);
}

async function makeUser(
  name: string,
  extra: { hide?: boolean; district?: string } = {},
) {
  return prisma.user.create({
    data: {
      email: `${id()}@example.com`,
      passwordHash: "x",
      name,
      displayName: name,
      hideFromGlobalRank: extra.hide ?? false,
      district: extra.district ?? null,
    },
  });
}

const xp = (userId: string, amount: number, localDate = "2026-10-07") =>
  progressRepository.addXp({
    userId,
    kind: "TASK",
    amount,
    refId: null,
    localDate,
  });

/** An active plan on a catalogue exam, so the user shows on that exam's board. */
async function planFor(userId: string, examId: string) {
  const version = await prisma.syllabusVersion.create({
    data: {
      title: "LDC",
      ownerId: userId,
      sourceKind: "TEXT",
      examId,
      status: "APPROVED",
    },
  });
  await prisma.studyPlan.create({
    data: {
      userId,
      syllabusVersionId: version.id,
      title: "LDC",
      startDate: new Date("2026-10-07T00:00:00Z"),
      endDate: new Date("2026-12-01T00:00:00Z"),
      inputs: {},
      availableMinutes: 0,
      requiredMinutes: 0,
      plannedMinutes: 0,
    },
  });
}

beforeEach(async () => {
  await resetDatabase();
  await clearBoards();
});
afterAll(async () => {
  await clearBoards();
  await prisma.$disconnect();
  redis.disconnect();
});

describe("global rank", () => {
  it("counts XP as it's earned, by week, month and all time, and per exam", async () => {
    const exam = await prisma.exam.create({
      data: { slug: `ldc-${id()}`, name: "LD Clerk", board: "Kerala PSC" },
    });
    const anu = await makeUser("Anu");
    const binu = await makeUser("Binu");
    await planFor(anu.id, exam.id);
    await xp(anu.id, 50);
    await xp(binu.id, 80);
    await xp(anu.id, 100, "2026-09-20"); // an earlier month: all time only

    const week = await ranks.board(anu, { period: "week" });
    expect(week.rows.map((r) => [r.name, r.xp])).toEqual([
      ["Binu", 80],
      ["Anu", 50],
    ]);
    const all = await ranks.board(anu, { period: "all" });
    expect(all.rows.map((r) => [r.name, r.xp])).toEqual([
      ["Anu", 150],
      ["Binu", 80],
    ]);
    const examBoard = await ranks.board(anu, {
      period: "all",
      examId: exam.id,
    });
    expect(examBoard.rows.map((r) => r.name)).toEqual(["Anu"]);
    expect(examBoard.rows[0]).toMatchObject({ exam: "LD Clerk", you: true });
  });

  it("hides people who asked to be hidden, except from themselves", async () => {
    const shy = await makeUser("Shy", { hide: true });
    const other = await makeUser("Other");
    await xp(shy.id, 30);
    expect((await ranks.board(other, { period: "all" })).rows[0]).toMatchObject(
      {
        name: "Anonymous aspirant",
        avatarUrl: null,
      },
    );
    expect((await ranks.board(shy, { period: "all" })).rows[0]).toMatchObject({
      name: "Shy",
      you: true,
    });
  });

  it("filters by district, ranking within it", async () => {
    const a = await makeUser("A", { district: "Kollam" });
    const b = await makeUser("B", { district: "Thrissur" });
    const c = await makeUser("C", { district: "Kollam" });
    await xp(a.id, 10);
    await xp(b.id, 99);
    await xp(c.id, 20);
    const board = await ranks.board(a, { period: "all", district: "Kollam" });
    expect(board.rows.map((r) => [r.rank, r.name])).toEqual([
      [1, "C"],
      [2, "A"],
    ]);
  });

  it("rebuilds every board from Postgres, the source of truth", async () => {
    const anu = await makeUser("Anu");
    await xp(anu.id, 40);
    await xp(anu.id, 2, "2026-10-05");
    await clearBoards();
    expect((await ranks.board(anu, { period: "all" })).rows).toEqual([]);
    await ranks.rebuild();
    expect((await ranks.board(anu, { period: "all" })).rows[0]).toMatchObject({
      xp: 42,
    });
    expect((await ranks.board(anu, { period: "week" })).rows[0]).toMatchObject({
      xp: 42,
    });
  });

  it("flags XP faster than a person could earn it", async () => {
    const fast = await makeUser("Fast");
    const fine = await makeUser("Fine");
    await xp(fast.id, 1200);
    await xp(fine.id, 300);
    const flagged = await ranks.flagged();
    expect(flagged.map((f) => [f.userId, f.reason])).toEqual([[fast.id, "xp"]]);
  });
});
