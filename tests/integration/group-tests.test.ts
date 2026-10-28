import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { adminRepository } from "@/server/repositories/admin-repository";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { channelRepository } from "@/server/repositories/channel-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { groupTestRepository } from "@/server/repositories/group-test-repository";
import { questionRepository } from "@/server/repositories/question-repository";
import { refreshTokenRepository } from "@/server/repositories/refresh-token-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { createAdminService } from "@/server/services/admin/admin-service";
import { createChannelService } from "@/server/services/groups/channel-service";
import { createGroupService } from "@/server/services/groups/group-service";
import { createGroupTests } from "@/server/services/groups/group-tests";

import { addClassicChannels, resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-11T04:30:00Z");
const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  ownerLimit: async () => 100,
  clock,
  limit: () => 10,
  newCode: () => crypto.randomUUID().slice(0, 8),
});
const tests = createGroupTests({
  groups,
  channels: createChannelService({
    groups,
    channels: channelRepository,
    clock,
    ownerLimit: async () => 50,
    examSubjects: async () => [],
  }),
  tests: groupTestRepository,
  questions: questionRepository,
  clock,
  random: () => 0.5,
  weeklyXp: async (ids) => new Map(ids.map((id, i) => [id, (i + 1) * 10])),
});
const admin = createAdminService({
  admin: adminRepository,
  audit: auditLogRepository,
  tokens: refreshTokenRepository,
  syllabuses: syllabusRepository,
  clock,
  newId: () => crypto.randomUUID(),
});

async function user(name: string) {
  const u = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.com`,
      passwordHash: "x",
      name,
      displayName: name,
    },
  });
  return { id: u.id, subscription: null };
}

async function pool(topic: string, n: number) {
  await prisma.question.createMany({
    data: Array.from({ length: n }, (_, i) => ({
      topicKey: topic,
      difficulty: 2,
      body: `${topic} question ${i}?`,
      options: ["a", "b", "c", "d"],
      correctIndex: 0,
      status: "VERIFIED" as const,
      source: "ADMIN" as const,
    })),
  });
}

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("group tests", () => {
  it("builds a test from the pool; each member takes their own copy; results rank them", async () => {
    await pool("preamble", 8);
    const owner = await user("Owner");
    const anu = await user("Anu");
    const stranger = await user("Stranger");
    const g = (
      (await groups.create(owner, {
        name: "G",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      })) as { groupId: string }
    ).groupId;
    await addClassicChannels(g);
    await groups.join(anu, g);

    expect(
      await tests.build(owner, g, {
        title: "Thin",
        topics: ["Rivers"],
        count: 10,
        minutes: null,
      }),
    ).toMatchObject({ ok: false, code: "THIN_POOL" });
    const built = (await tests.build(owner, g, {
      title: "Preamble quiz",
      topics: ["Preamble"],
      count: 5,
      minutes: 10,
    })) as { id: string };

    const listed = (await tests.list(anu, g))!;
    expect(listed.map((t) => [t.title, t.count, t.durationSec])).toEqual([
      ["Preamble quiz", 5, 600],
    ]);
    const mine = (await tests.take(anu, g, built.id)) as { testId: string };
    expect(await tests.take(anu, g, built.id)).toEqual({
      ok: true,
      testId: mine.testId,
    });
    const theirs = (await tests.take(owner, g, built.id)) as { testId: string };
    expect(theirs.testId).not.toBe(mine.testId);
    expect(await tests.take(stranger, g, built.id)).toMatchObject({
      ok: false,
    });

    // Results: two attempts, best first.
    for (const [who, testId, correct] of [
      [anu, mine.testId, 4],
      [owner, theirs.testId, 2],
    ] as const)
      await prisma.testAttempt.create({
        data: {
          userId: who.id,
          mockTestId: testId,
          type: "CUSTOM",
          total: 5,
          correct,
          wrong: 5 - correct,
          skipped: 0,
          score: correct,
          accuracy: correct / 5,
          durationSec: 100,
          localDate: new Date("2026-10-11T00:00:00Z"),
        },
      });
    const results = (await tests.results(owner, g, built.id))!;
    expect(results.rows.map((r) => [r.user.displayName, r.correct])).toEqual([
      ["Anu", 4],
      ["Owner", 2],
    ]);

    const rank = (await tests.rank(anu, g))!;
    expect(rank.map((r) => [r.user.displayName, r.correct])).toContainEqual([
      "Anu",
      4,
    ]);
    expect(rank[0]!.xp).toBeGreaterThanOrEqual(rank[1]!.xp);
  });

  it("lets site admins hide reported content, closing its reports", async () => {
    const owner = await user("Owner");
    const boss = await prisma.user.create({
      data: {
        email: "boss@example.com",
        passwordHash: "x",
        name: "Boss",
        displayName: "Boss",
        role: "ADMIN",
      },
    });
    const g = (
      (await groups.create(owner, {
        name: "Bad group",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      })) as { groupId: string }
    ).groupId;
    await addClassicChannels(g);
    const r1 = await user("R1");
    const r2 = await user("R2");
    await groups.report(r1, { type: "GROUP", id: g, groupId: g }, "spam", null);
    await groups.report(
      r2,
      { type: "GROUP", id: g, groupId: g },
      "abuse",
      "rude",
    );

    const queue = await admin.reports();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      type: "GROUP",
      target: { label: "Group: Bad group", hidden: false },
    });
    expect(queue[0]!.reports).toHaveLength(2);

    await admin.decideReport({ id: boss.id, role: "ADMIN" }, "GROUP", g, true);
    expect(await admin.reports()).toHaveLength(0);
    expect(
      (await prisma.group.findUniqueOrThrow({ where: { id: g } })).hiddenAt,
    ).not.toBeNull();
    expect(await groups.directory(null, "")).toHaveLength(0);
  });
});
