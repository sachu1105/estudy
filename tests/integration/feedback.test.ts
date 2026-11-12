import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { feedbackRepository } from "@/server/repositories/feedback-repository";
import { createFeedbackService } from "@/server/services/feedback/feedback-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-11-12T04:30:00Z");
const feedback = createFeedbackService({
  feedback: feedbackRepository,
  clock,
});

async function person(name: string) {
  const u = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.com`,
      passwordHash: "x",
      name,
      displayName: name,
    },
  });
  return { id: u.id };
}

describe("feedback", () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("has no rating before the first one", async () => {
    const asha = await person("Asha");
    expect(await feedback.mine(asha)).toBeNull();
  });

  it("keeps one rating per person and changes it in place", async () => {
    const asha = await person("Asha");
    await feedback.rate(asha, { stars: 3, note: "Needs Malayalam" });
    expect(await feedback.mine(asha)).toEqual({
      stars: 3,
      note: "Needs Malayalam",
    });
    await feedback.rate(asha, { stars: 5, note: "" });
    const rows = await prisma.appRating.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ stars: 5, note: null });
    expect(await feedback.mine(asha)).toEqual({ stars: 5, note: "" });
  });

  it("sums ratings for staff: the average, the spread and the notes", async () => {
    const [asha, ravi, meera] = await Promise.all([
      person("Asha"),
      person("Ravi"),
      person("Meera"),
    ]);
    await feedback.rate(asha, { stars: 5, note: "Love the pods" });
    await feedback.rate(ravi, { stars: 4, note: "" });
    await feedback.rate(meera, { stars: 3, note: "Too many clicks" });
    const summary = await feedback.summary();
    expect(summary.total).toBe(3);
    expect(summary.average).toBe(4);
    expect(summary.counts).toEqual([0, 0, 1, 1, 1]);
    expect(summary.recent.map((r) => r.note).sort()).toEqual([
      "Love the pods",
      "Too many clicks",
    ]);
  });

  it("has no average with no ratings", async () => {
    expect(await feedback.summary()).toMatchObject({ total: 0, average: null });
  });
});
