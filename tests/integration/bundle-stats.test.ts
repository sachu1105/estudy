import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { bundleRepository } from "@/server/repositories/bundle-repository";

import { resetDatabase } from "./helpers";

async function user(name: string) {
  return prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.com`,
      passwordHash: "x",
      name,
      displayName: name,
    },
  });
}

describe("a seller's bundle stats", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("counts who has it and how, who sat a paper, what it earned, newest first", async () => {
    const seller = await user("Seller");
    const [anu, binu, chinnu] = await Promise.all([
      user("Anu"),
      user("Binu"),
      user("Chinnu"),
    ]);
    const paper = await prisma.paper.create({
      data: {
        ownerId: seller.id,
        title: "LDC 2024",
        storageKey: `papers/${crypto.randomUUID()}`,
        sizeBytes: 10,
        sha256: "x",
        questionCount: 2,
        answerKey: [1, 2],
      },
    });
    const { id } = await bundleRepository.create({
      ownerId: seller.id,
      title: "LDC 2024",
      description: "",
      pricePaise: 4900,
      groupId: null,
      channelId: null,
      paperIds: [paper.id],
      listing: "LIVE",
    });
    const at = (iso: string) => new Date(iso);
    await prisma.bundlePurchase.createMany({
      data: [
        {
          bundleId: id,
          userId: anu.id,
          amountPaise: 4900,
          cutPaise: 980,
          createdAt: at("2026-11-10T05:00:00Z"),
        },
        {
          bundleId: id,
          userId: binu.id,
          amountPaise: 0,
          createdAt: at("2026-11-11T05:00:00Z"),
        },
        {
          bundleId: id,
          userId: chinnu.id,
          amountPaise: 4900,
          cutPaise: 980,
          createdAt: at("2026-11-12T05:00:00Z"),
        },
      ],
    });
    // Anu sat it twice; the seller's own sittings never count.
    await prisma.omrSubmission.createMany({
      data: [
        { paperId: paper.id, userId: anu.id, marks: [1, 2], timeUsedSec: 60 },
        { paperId: paper.id, userId: anu.id, marks: [1, 1], timeUsedSec: 60 },
        {
          paperId: paper.id,
          userId: seller.id,
          marks: [1, 2],
          timeUsedSec: 60,
        },
      ],
    });

    const stats = await bundleRepository.stats(id, [paper.id], seller.id);
    expect(stats).toMatchObject({
      bought: 2,
      free: 1,
      grossPaise: 9800,
      cutPaise: 1960,
      sat: 1,
      sittings: 2,
    });
    expect(stats.recent.map((r) => r.amountPaise)).toEqual([4900, 0, 4900]);
    expect(stats.recent[0]!.createdAt).toEqual(at("2026-11-12T05:00:00Z"));

    // Each holder sees when they got it.
    const [mine] = await bundleRepository.forUser(binu.id);
    expect(mine!.purchases[0]!.createdAt).toEqual(at("2026-11-11T05:00:00Z"));
  });
});
