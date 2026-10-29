import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { channelRepository } from "@/server/repositories/channel-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import { reportRepository } from "@/server/repositories/report-repository";
import { createGroupService } from "@/server/services/groups/group-service";
import { createSquadReports } from "@/server/services/groups/squad-reports";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-29T04:30:00Z");
const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  ownerLimit: async () => 100,
  clock,
  limit: () => 10,
  newCode: () => crypto.randomUUID().slice(0, 8),
});
let sent: NewNotification[] = [];
const reports = createSquadReports({
  reports: reportRepository,
  save: (data) => groupRepository.report(data),
  groups,
  isMember: async (g, u) => !!(await groupRepository.membership(g, u)),
  notify: async (rows) => void sent.push(...rows),
  clock,
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

/** A squad with an owner, a moderator and two members, and a message from each member. */
async function squad() {
  const owner = await user("Owner");
  const mod = await user("Mod");
  const anu = await user("Anu");
  const ben = await user("Ben");
  const g = (
    (await groups.create(owner, {
      name: "CPO",
      description: null,
      examId: null,
      visibility: "PUBLIC",
    })) as { groupId: string }
  ).groupId;
  for (const u of [mod, anu, ben]) await groupRepository.addMember(g, u.id);
  await prisma.membership.update({
    where: { groupId_userId: { groupId: g, userId: mod.id } },
    data: { role: "MODERATOR" },
  });
  const channel = await prisma.channel.findFirstOrThrow({
    where: { groupId: g },
  });
  const say = (author: { id: string }, body: string) =>
    prisma.message.create({
      data: { groupId: g, channelId: channel.id, authorId: author.id, body },
    });
  return { g, owner, mod, anu, ben, say };
}

beforeEach(async () => {
  await resetDatabase();
  sent = [];
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("squad reports", () => {
  it("reach the squad's staff, without the reporter's name, and staff take content down", async () => {
    const { g, owner, mod, anu, ben, say } = await squad();
    const rude = await say(ben, "you are all useless");

    await reports.file(
      anu,
      { type: "MESSAGE", id: rude.id, groupId: g },
      "abuse",
      "insulting everyone",
    );
    // Once per person: a second report changes nothing and sends nothing.
    await reports.file(
      anu,
      { type: "MESSAGE", id: rude.id, groupId: g },
      "abuse",
      null,
    );

    // The owner and the moderator hear of it; nobody is named.
    expect(sent.map((n) => n.userId).sort()).toEqual([owner.id, mod.id].sort());
    expect(sent.every((n) => n.actorId === null && n.kind === "REPORT")).toBe(
      true,
    );
    expect(sent[0]!.subject).toBe("a message in CPO");

    const queue = await reports.list(owner, g);
    expect(queue).toHaveLength(1);
    expect(queue![0]).toMatchObject({
      type: "MESSAGE",
      excerpt: "you are all useless",
      author: { name: "Ben" },
      reasons: [{ reason: "abuse", count: 1 }],
      notes: ["insulting everyone"],
    });
    expect(JSON.stringify(queue)).not.toContain(anu.id);
    expect(JSON.stringify(queue)).not.toContain("Anu");

    // Members can't see the queue or act on it.
    expect(await reports.list(anu, g)).toBeNull();
    expect(
      await reports.decide(anu, g, { type: "MESSAGE", id: rude.id }, "remove"),
    ).toMatchObject({ ok: false });

    expect(
      await reports.decide(mod, g, { type: "MESSAGE", id: rude.id }, "remove"),
    ).toEqual({ ok: true });
    const after = await prisma.message.findUniqueOrThrow({
      where: { id: rude.id },
    });
    expect(after.hiddenAt).not.toBeNull();
    // Closed for everyone, the site admins included.
    expect(await prisma.report.count({ where: { status: "OPEN" } })).toBe(0);
    expect(await reports.list(owner, g)).toEqual([]);
  });

  it("files reports on what's in a squad under that squad, whatever the browser says", async () => {
    const a = await squad();
    const b = await squad();
    const rude = await a.say(a.ben, "spam spam");

    // Claimed to be in squad B: it is filed under A, where the message lives.
    await reports.file(
      a.anu,
      { type: "MESSAGE", id: rude.id, groupId: b.g },
      "spam",
      null,
    );
    expect(await reports.list(b.owner, b.g)).toEqual([]);
    expect(await reports.list(a.owner, a.g)).toHaveLength(1);

    // Someone outside the squad reports to the site admins alone.
    const stranger = await user("Stranger");
    sent = [];
    await reports.file(
      stranger,
      { type: "MESSAGE", id: rude.id, groupId: a.g },
      "spam",
      null,
    );
    expect(sent).toEqual([]);
    expect(
      await prisma.report.count({
        where: { reporterId: stranger.id, groupId: null },
      }),
    ).toBe(1);
  });

  it("keeps the squad itself, and staff's own reports, away from them", async () => {
    const { g, owner, mod, anu, say } = await squad();

    // A report on the squad goes to the site admins only.
    await reports.file(anu, { type: "GROUP", id: g, groupId: g }, "spam", null);
    expect(sent).toEqual([]);
    expect(await reports.list(owner, g)).toEqual([]);

    // A report on the moderator's message: the owner handles it, the moderator never
    // hears of it or sees it.
    const theirs = await say(mod, "rules are rules");
    await reports.file(
      anu,
      { type: "MESSAGE", id: theirs.id, groupId: g },
      "abuse",
      null,
    );
    expect(sent.map((n) => n.userId)).toEqual([owner.id]);
    expect(await reports.list(mod, g)).toEqual([]);
    expect(
      await reports.decide(
        mod,
        g,
        { type: "MESSAGE", id: theirs.id },
        "dismiss",
      ),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(await reports.list(owner, g)).toHaveLength(1);
    expect(
      await reports.decide(
        owner,
        g,
        { type: "MESSAGE", id: theirs.id },
        "dismiss",
      ),
    ).toEqual({ ok: true });
    expect(await prisma.report.count({ where: { status: "DISMISSED" } })).toBe(
      1,
    );
  });

  it("puts a reported person in front of the staff, to mute or remove by hand", async () => {
    const { g, owner, anu, ben } = await squad();
    await reports.file(
      anu,
      { type: "USER", id: ben.id, groupId: g },
      "spam",
      null,
    );
    const queue = await reports.list(owner, g);
    expect(queue).toMatchObject([
      { type: "USER", author: { name: "Ben", role: "MEMBER", muted: false } },
    ]);
    // A person isn't content: there is nothing to take down, only to mark handled.
    expect(
      await reports.decide(owner, g, { type: "USER", id: ben.id }, "remove"),
    ).toMatchObject({ ok: false });
    expect(
      await reports.decide(owner, g, { type: "USER", id: ben.id }, "resolve"),
    ).toEqual({ ok: true });
    expect(await reports.list(owner, g)).toEqual([]);
  });
});
