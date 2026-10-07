import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { rankStore } from "@/server/rank/rank-store";
import { redis } from "@/server/redis";
import { progressRepository } from "@/server/repositories/progress-repository";
import { rankRepository } from "@/server/repositories/rank-repository";
import { createRankService } from "@/server/services/rank/rank-service";

import { resetDatabase } from "./helpers";

// Wednesday 7 October 2026, 10:00 in India. The week began on Monday the 5th.
const clock = fixedClock("2026-10-07T04:30:00Z");
const DAY = "2026-10-07";
const ranks = createRankService({
  ranks: rankRepository,
  store: rankStore,
  clock,
});

async function clearBoards() {
  const keys = await redis.keys("test:rank:*");
  if (keys.length) await redis.del(...keys);
}

const makeUser = (name: string) =>
  prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.com`,
      passwordHash: "x",
      name,
      displayName: name,
    },
  });

const xp = (userId: string, amount: number, localDate = DAY) =>
  progressRepository.addXp({
    userId,
    kind: "TASK",
    amount,
    refId: null,
    localDate,
  });

beforeEach(async () => {
  await resetDatabase();
  await clearBoards();
});
afterAll(async () => {
  await clearBoards();
  await prisma.$disconnect();
  redis.disconnect();
});

describe("weekly XP board (the squad rank)", () => {
  it("counts XP as it's earned, this week only", async () => {
    const anu = await makeUser("Anu");
    const binu = await makeUser("Binu");
    await xp(anu.id, 50);
    await xp(binu.id, 80);
    await xp(anu.id, 100, "2026-09-28"); // last week: not on this board
    const scores = await rankStore.scores(DAY, [anu.id, binu.id]);
    expect([...scores]).toEqual([
      [anu.id, 50],
      [binu.id, 80],
    ]);
  });

  it("rebuilds from Postgres, the source of truth", async () => {
    const anu = await makeUser("Anu");
    await xp(anu.id, 40);
    await xp(anu.id, 2, "2026-10-05");
    await xp(anu.id, 9, "2026-10-04"); // the Sunday before: last week
    await clearBoards();
    expect((await rankStore.scores(DAY, [anu.id])).get(anu.id)).toBe(0);
    expect(await ranks.rebuild()).toBe(1);
    expect((await rankStore.scores(DAY, [anu.id])).get(anu.id)).toBe(42);
  });
});
