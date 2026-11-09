import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { feedbackRepository } from "@/server/repositories/feedback-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import {
  createFeedbackService,
  REVIEW_CAP,
} from "@/server/services/feedback/feedback-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-11-12T04:30:00Z");
const notes: NewNotification[] = [];
const feedback = createFeedbackService({
  feedback: feedbackRepository,
  audit: auditLogRepository,
  notify: async (rows) => void notes.push(...rows),
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
  return { id: u.id, ip: null };
}

const idea = (title: string, credit = true) => ({
  title,
  body: "",
  area: "TESTS" as const,
  credit,
});

describe("feedback", () => {
  beforeEach(async () => {
    await resetDatabase();
    notes.length = 0;
  });
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  it("keeps one rating per person and changes it in place", async () => {
    const asha = await person("Asha");
    await feedback.rate(asha, { stars: 3, note: "Needs Malayalam" });
    await feedback.rate(asha, { stars: 5, note: "" });
    const rows = await prisma.appRating.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ stars: 5, note: null });
    const summary = await feedback.adminOverview();
    expect(summary.ratings).toMatchObject({ total: 1, average: 5 });
  });

  it("shows a new idea only to its author until the team opens it", async () => {
    const asha = await person("Asha");
    const ravi = await person("Ravi");
    const made = await feedback.suggest(asha, idea("Malayalam mock tests"));
    if (!made.ok) throw new Error(made.message);

    expect((await feedback.overview(asha)).ideas).toHaveLength(1);
    expect((await feedback.overview(ravi)).ideas).toHaveLength(0);
    // Nobody can vote before it's open.
    expect((await feedback.vote(ravi, made.id, true)).ok).toBe(false);

    const staff = await person("Team");
    await feedback.decideIdea(staff, {
      id: made.id,
      status: "OPEN",
      teamNote: "",
    });
    const seen = (await feedback.overview(ravi)).ideas;
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ by: "Asha", votes: 0, voted: false });
    // The author heard the team opened it.
    expect(notes).toEqual([
      expect.objectContaining({ userId: asha.id, kind: "FEEDBACK" }),
    ]);
  });

  it("caps ideas waiting for review", async () => {
    const asha = await person("Asha");
    for (let i = 0; i < REVIEW_CAP; i++)
      expect((await feedback.suggest(asha, idea(`Idea number ${i}`))).ok).toBe(
        true,
      );
    expect((await feedback.suggest(asha, idea("One too many"))).ok).toBe(false);
  });

  it("counts one vote per person, and tells backers when it ships", async () => {
    const team = await person("Team");
    const asha = await person("Asha");
    const ravi = await person("Ravi");
    const { id } = await feedback.postTeamIdea(team, idea("Daily quiz"));

    expect(await feedback.vote(asha, id, true)).toEqual({ ok: true, votes: 1 });
    expect(await feedback.vote(asha, id, true)).toEqual({ ok: true, votes: 1 });
    expect(await feedback.vote(ravi, id, true)).toEqual({ ok: true, votes: 2 });
    expect(await feedback.vote(ravi, id, false)).toEqual({
      ok: true,
      votes: 1,
    });

    const mine = (await feedback.overview(asha)).ideas[0];
    expect(mine).toMatchObject({
      voted: true,
      fromTeam: true,
      by: "studypods team",
    });

    await feedback.decideIdea(team, {
      id,
      status: "SHIPPED",
      teamNote: "Out now",
    });
    // The team posted it, so only the backer hears; the staff member doesn't.
    expect(notes.map((n) => n.userId)).toEqual([asha.id]);
    // A shipped idea takes no more votes.
    expect((await feedback.vote(ravi, id, true)).ok).toBe(false);

    const audit = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
    });
    expect(audit.map((a) => a.action)).toEqual([
      "feedback.idea.post",
      "feedback.idea.decide",
    ]);
  });

  it("keeps problem reports private and credits fixes on the wall", async () => {
    const asha = await person("Asha");
    const ravi = await person("Ravi");
    const shy = await person("Shy");
    const team = await person("Team");
    const a = await feedback.report(
      asha,
      {
        category: "BUG",
        body: "The OMR sheet froze",
        page: "/tests",
        credit: true,
      },
      "Mozilla/5.0",
    );
    const s = await feedback.report(
      shy,
      {
        category: "CONTENT",
        body: "Answer 12 is wrong",
        page: "",
        credit: false,
      },
      null,
    );
    if (!a.ok || !s.ok) throw new Error("report failed");

    expect((await feedback.overview(asha)).problems).toHaveLength(1);
    expect((await feedback.overview(ravi)).problems).toHaveLength(0);

    await feedback.decideProblem(team, {
      id: a.id,
      status: "FIXED",
      teamNote: "Fixed, thanks!",
    });
    await feedback.decideProblem(team, {
      id: s.id,
      status: "FIXED",
      teamNote: "",
    });

    const view = await feedback.overview(asha);
    expect(view.problems[0]).toMatchObject({
      status: "FIXED",
      teamNote: "Fixed, thanks!",
    });
    expect(view.isContributor).toBe(true);
    // Someone who asked not to be named stays off the wall.
    expect(view.contributors.map((c) => c.displayName)).toEqual(["Asha"]);
    expect(notes.map((n) => n.userId).sort()).toEqual([asha.id, shy.id].sort());
  });
});
