import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { channelRepository } from "@/server/repositories/channel-repository";
import { discussionRepository } from "@/server/repositories/discussion-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { createChannelService } from "@/server/services/groups/channel-service";
import { createDiscussionService } from "@/server/services/groups/discussion-service";
import { createGroupService } from "@/server/services/groups/group-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-16T04:30:00Z");
let members = 100;
let channelCap = 50;
const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  clock,
  limit: () => 10,
  ownerLimit: async () => members,
  newCode: () => crypto.randomUUID().slice(0, 8).toUpperCase(),
});
const channels = createChannelService({
  groups,
  channels: channelRepository,
  clock,
  ownerLimit: async () => channelCap,
});
const discussion = createDiscussionService({
  groups,
  channels,
  posts: discussionRepository,
  clock,
  emit: async () => {},
  notify: async () => {},
  addXp: async () => null,
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
const groupId = (r: unknown) => (r as { groupId: string }).groupId;
const names = (layout: Awaited<ReturnType<typeof channels.layout>>) =>
  layout!.categories.map((c) => [c.name, c.channels.map((ch) => ch.name)]);

beforeEach(async () => {
  await resetDatabase();
  members = 100;
  channelCap = 50;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("squad channels", () => {
  it("lays out a new squad from its template", async () => {
    const owner = await user("Owner");
    const exam = groupId(
      await groups.create(owner, {
        name: "LDC warriors",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    );
    expect(names(await channels.layout(owner, exam))).toEqual([
      ["Info", ["announcements"]],
      ["General", ["general", "doubts"]],
      ["Library", ["material", "links", "mock-tests"]],
    ]);
    const blank = groupId(
      await groups.create(owner, {
        name: "Just us",
        description: null,
        examId: null,
        visibility: "PRIVATE",
        template: "BLANK",
      }),
    );
    expect(names(await channels.layout(owner, blank))).toEqual([
      ["General", ["general"]],
    ]);
  });

  it("lets admins add, rename, move and delete channels; members only read", async () => {
    const owner = await user("Owner");
    const binu = await user("Binu");
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: null,
        visibility: "PUBLIC",
        template: "BLANK",
      }),
    );
    await groups.join(binu, g);
    const [general] = (await channels.layout(owner, g))!.categories;

    expect(
      await channels.create(binu, g, {
        type: "CHAT",
        name: "maths",
        topic: null,
        categoryId: null,
        postRule: "EVERYONE",
      }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });

    const made = (await channels.create(owner, g, {
      type: "THREADS",
      name: "  Kerala History! ",
      topic: "Dates and dynasties",
      categoryId: general!.id,
      postRule: "EVERYONE",
    })) as { ok: true; channelId: string };
    expect(made.ok).toBe(true);
    expect(names(await channels.layout(binu, g))).toEqual([
      ["General", ["general", "kerala-history"]],
    ]);

    await channels.move(owner, g, made.channelId, "up");
    expect(names(await channels.layout(owner, g))).toEqual([
      ["General", ["kerala-history", "general"]],
    ]);

    await channels.update(owner, g, made.channelId, { name: "History" });
    expect((await channels.get(binu, g, made.channelId))?.channel.name).toBe(
      "history",
    );

    const generalId = general!.channels[0]!.id;
    await channels.remove(owner, g, made.channelId);
    expect(await channels.remove(owner, g, generalId)).toMatchObject({
      ok: false,
      code: "LAST",
    });
  });

  it("stops at the owner's channel limit", async () => {
    const owner = await user("Owner");
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: null,
        visibility: "PUBLIC",
        template: "CIRCLE",
      }),
    );
    channelCap = 3;
    expect(
      await channels.create(owner, g, {
        type: "CHAT",
        name: "extra",
        topic: null,
        categoryId: null,
        postRule: "EVERYONE",
      }),
    ).toMatchObject({ ok: false, code: "LIMIT" });
  });

  it("keeps a category's channels when the category goes", async () => {
    const owner = await user("Owner");
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    );
    const library = (await channels.layout(owner, g))!.categories[2]!;
    await channels.removeCategory(owner, g, library.id);
    const layout = (await channels.layout(owner, g))!;
    expect(layout.loose.map((c) => c.name)).toEqual([
      "material",
      "links",
      "mock-tests",
    ]);
    expect(layout.categories.map((c) => c.name)).toEqual(["Info", "General"]);
  });

  it("posts land in a threads channel, and announcements are for admins", async () => {
    const owner = await user("Owner");
    const binu = await user("Binu");
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    );
    await groups.join(binu, g);
    const layout = (await channels.layout(owner, g))!;
    const all = layout.categories.flatMap((c) => c.channels);
    const doubts = all.find((c) => c.name === "doubts")!;
    const material = all.find((c) => c.name === "material")!;
    const post = {
      kind: "QUESTION" as const,
      title: "Who wrote this?",
      body: "Asking for a friend",
      mentionIds: [],
      subjectName: null,
      topicName: null,
    };

    const made = (await discussion.create(binu, g, post)) as {
      ok: true;
      postId: string;
    };
    expect(
      (await prisma.post.findUnique({ where: { id: made.postId } }))?.channelId,
    ).toBe(doubts.id);
    expect(await discussion.create(binu, g, post, material.id)).toMatchObject({
      ok: false,
      code: "NO_CHANNEL",
    });

    // Turn doubts into an admins-only channel: members can no longer post there.
    await channels.update(owner, g, doubts.id, { postRule: "ADMINS" });
    expect(await discussion.create(binu, g, post, doubts.id)).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(await discussion.create(owner, g, post, doubts.id)).toMatchObject({
      ok: true,
    });
  });
});

describe("joining a squad", () => {
  it("joins open squads, asks with an answer, and refuses invite-only ones", async () => {
    const owner = await user("Owner");
    const binu = await user("Binu");
    const make = (joinMode: "OPEN" | "REQUEST" | "INVITE_ONLY") =>
      groups
        .create(owner, {
          name: joinMode,
          description: null,
          examId: null,
          visibility: "PUBLIC",
          joinMode,
          joinQuestion: "Which exam are you writing?",
        })
        .then(groupId);
    const [open, ask, invite] = [
      await make("OPEN"),
      await make("REQUEST"),
      await make("INVITE_ONLY"),
    ];

    expect(await groups.join(binu, open)).toEqual({ ok: true, joined: true });
    expect(await groups.join(binu, ask, "LDC 2026")).toEqual({
      ok: true,
      joined: false,
    });
    const requests = (await groups.members(owner, ask))!.requests;
    expect(requests[0]?.answer).toBe("LDC 2026");
    expect(await groups.join(binu, invite)).toMatchObject({
      ok: false,
      code: "INVITE_ONLY",
    });

    // Only a squad that asks keeps the question.
    const stored = await prisma.group.findMany({
      select: { name: true, joinQuestion: true },
      orderBy: { name: "asc" },
    });
    expect(stored).toEqual([
      { name: "INVITE_ONLY", joinQuestion: null },
      { name: "OPEN", joinQuestion: null },
      { name: "REQUEST", joinQuestion: "Which exam are you writing?" },
    ]);
  });

  it("never makes a private squad open", async () => {
    const owner = await user("Owner");
    const binu = await user("Binu");
    const g = groupId(
      await groups.create(owner, {
        name: "Private",
        description: null,
        examId: null,
        visibility: "PRIVATE",
        joinMode: "OPEN",
      }),
    );
    expect(await groups.join(binu, g)).toEqual({ ok: true, joined: false });
  });

  it("stops at the owner's member limit, by joining, invite or approval", async () => {
    const owner = await user("Owner");
    const [a, b, c] = [await user("A"), await user("B"), await user("C")];
    members = 2;
    const open = groupId(
      await groups.create(owner, {
        name: "Open",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    );
    expect(await groups.join(a, open)).toMatchObject({ ok: true });
    expect(await groups.join(b, open)).toMatchObject({
      ok: false,
      code: "SQUAD_FULL",
    });
    const code = (
      (await groups.createInvite(owner, open, {
        days: null,
        maxUses: null,
      })) as { code: string }
    ).code;
    expect(await groups.joinByCode(c, code)).toMatchObject({
      ok: false,
      code: "SQUAD_FULL",
    });

    const ask = groupId(
      await groups.create(owner, {
        name: "Ask",
        description: null,
        examId: null,
        visibility: "PRIVATE",
      }),
    );
    await groups.join(a, ask);
    await groups.join(b, ask);
    const [first, second] = (await groups.members(owner, ask))!.requests;
    expect(await groups.decideRequest(owner, first!.id, true)).toEqual({
      ok: true,
    });
    expect(await groups.decideRequest(owner, second!.id, true)).toMatchObject({
      ok: false,
      code: "SQUAD_FULL",
    });
  });
});

describe("squad settings", () => {
  it("lets admins change the squad and who can join; members can't", async () => {
    const owner = await user("Owner");
    const binu = await user("Binu");
    const g = groupId(
      await groups.create(owner, {
        name: "Before",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    );
    await groups.join(binu, g);
    const change = {
      name: "After",
      description: "Weekend mocks",
      examId: null,
      visibility: "PRIVATE" as const,
      joinMode: "OPEN" as const,
      joinQuestion: "Which post?",
    };
    expect(await groups.update(binu, g, change)).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(await groups.update(owner, g, change)).toEqual({ ok: true });
    // Private can't be open: it asks, and keeps the question.
    expect(
      await prisma.group.findUnique({
        where: { id: g },
        select: { name: true, joinMode: true, joinQuestion: true },
      }),
    ).toEqual({ name: "After", joinMode: "REQUEST", joinQuestion: "Which post?" });

    await groups.update(owner, g, { ...change, joinMode: "INVITE_ONLY" });
    expect(
      (await prisma.group.findUnique({ where: { id: g } }))?.joinQuestion,
    ).toBeNull();
    expect(await groups.directory(null, "")).toHaveLength(0);
  });
});
