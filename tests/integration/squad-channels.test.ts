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

import { addClassicChannels, resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-16T04:30:00Z");
let members = 100;
let channelCap = 50;
let examSubjects: { name: string; topics: string[] }[] = [];
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
  examSubjects: async () => examSubjects,
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
  examSubjects = [];
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
    // Every channel a template makes is a chat; announcements is one admins write in.
    expect(names(await channels.layout(owner, exam))).toEqual([
      ["Info", ["announcements"]],
      ["General", ["general", "doubts"]],
    ]);
    expect(
      (await channels.layout(owner, exam))!.categories
        .flatMap((c) => c.channels)
        .map((c) => c.type),
    ).toEqual(["ANNOUNCEMENTS", "CHAT", "CHAT"]);
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
    channelCap = 1;
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
    const general = (await channels.layout(owner, g))!.categories[1]!;
    await channels.removeCategory(owner, g, general.id);
    const layout = (await channels.layout(owner, g))!;
    expect(layout.loose.map((c) => c.name)).toEqual(["general", "doubts"]);
    expect(layout.categories.map((c) => c.name)).toEqual(["Info"]);
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
    await addClassicChannels(g);
    await groups.join(binu, g);
    const layout = (await channels.layout(owner, g))!;
    const all = layout.categories.flatMap((c) => c.channels);
    const doubts = all.find((c) => c.name === "questions")!;
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
    ).toEqual({
      name: "After",
      joinMode: "REQUEST",
      joinQuestion: "Which post?",
    });

    await groups.update(owner, g, { ...change, joinMode: "INVITE_ONLY" });
    expect(
      (await prisma.group.findUnique({ where: { id: g } }))?.joinQuestion,
    ).toBeNull();
    expect(await groups.directory(null, "")).toHaveLength(0);
  });
});

describe("private channels and the moderator role", () => {
  it("hides a private channel from members until they are let in", async () => {
    const owner = await user("Owner");
    const anu = await user("Anu");
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
    await groups.join(anu, g);
    await groups.join(binu, g);
    const made = (await channels.create(owner, g, {
      type: "CHAT",
      name: "inner-circle",
      topic: null,
      categoryId: null,
      postRule: "EVERYONE",
      viewRule: "PICKED",
    })) as { ok: true; channelId: string };

    const names = async (u: typeof anu) =>
      (await channels.layout(u, g))!.loose.map((c) => c.name);
    expect(await names(owner)).toContain("inner-circle");
    expect(await names(anu)).not.toContain("inner-circle");
    expect(await channels.get(anu, g, made.channelId)).toBeNull();

    await channels.setAccess(owner, g, made.channelId, [anu.id]);
    expect(await names(anu)).toContain("inner-circle");
    expect(await names(binu)).not.toContain("inner-circle");
    // Who is let in, as the picker shows it: staff are always in.
    const access = (await channels.access(owner, g, made.channelId))!;
    expect(access.members.map((m) => [m.name, m.picked, m.always])).toEqual(
      expect.arrayContaining([
        ["Owner", false, true],
        ["Anu", true, false],
        ["Binu", false, false],
      ]),
    );
  });

  it("keeps a staff-only channel for the people who run the squad", async () => {
    const owner = await user("Owner");
    const anu = await user("Anu");
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: null,
        visibility: "PUBLIC",
        template: "BLANK",
      }),
    );
    await groups.join(anu, g);
    const made = (await channels.create(owner, g, {
      type: "CHAT",
      name: "mod-chat",
      topic: null,
      categoryId: null,
      postRule: "EVERYONE",
      viewRule: "ADMINS",
    })) as { ok: true; channelId: string };
    expect(await channels.get(anu, g, made.channelId)).toBeNull();

    await groups.manage(owner, g, anu.id, { kind: "role", role: "MODERATOR" });
    expect(await channels.get(anu, g, made.channelId)).toMatchObject({
      role: "MODERATOR",
    });
  });

  it("lets moderators mute but not run the squad", async () => {
    const owner = await user("Owner");
    const mod = await user("Mod");
    const anu = await user("Anu");
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: null,
        visibility: "PUBLIC",
        template: "BLANK",
      }),
    );
    await groups.join(mod, g);
    await groups.join(anu, g);
    await groups.manage(owner, g, mod.id, { kind: "role", role: "MODERATOR" });

    expect(
      await groups.manage(mod, g, anu.id, { kind: "mute", hours: 24 }),
    ).toEqual({ ok: true });
    expect(
      await groups.manage(mod, g, anu.id, { kind: "role", role: "MODERATOR" }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(
      await channels.create(mod, g, {
        type: "CHAT",
        name: "nope",
        topic: null,
        categoryId: null,
        postRule: "EVERYONE",
      }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    // An admin may make a moderator, but only the owner makes an admin.
    const admin = await user("Admin");
    await groups.join(admin, g);
    await groups.manage(owner, g, admin.id, { kind: "role", role: "ADMIN" });
    expect(
      await groups.manage(admin, g, anu.id, {
        kind: "role",
        role: "MODERATOR",
      }),
    ).toEqual({ ok: true });
    const other = await user("Other");
    await groups.join(other, g);
    expect(
      await groups.manage(admin, g, other.id, { kind: "role", role: "ADMIN" }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });
});

describe("subject channels", () => {
  it("makes one channel per subject, tags what's posted, and can be run again", async () => {
    const owner = await user("Owner");
    const exam = await prisma.exam.create({
      data: {
        slug: `ldc-${crypto.randomUUID().slice(0, 8)}`,
        name: "LD Clerk",
        board: "Kerala PSC",
      },
    });
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: exam.id,
        visibility: "PUBLIC",
        template: "BLANK",
      }),
    );
    examSubjects = [
      { name: "Kerala History", topics: ["Travancore", "Malabar"] },
      { name: "Maths", topics: ["Percentage"] },
    ];

    expect(await channels.addSubjectChannels(owner, g)).toEqual({
      ok: true,
      added: 2,
    });
    const layout = (await channels.layout(owner, g))!;
    const subjects = layout.categories.find((c) => c.name === "Subjects")!;
    expect(subjects.channels.map((c) => [c.name, c.subjectName])).toEqual([
      ["kerala-history", "Kerala History"],
      ["maths", "Maths"],
    ]);

    // Each is a chat, and whatever lands there is tagged with its subject.
    const history = subjects.channels[0]!;
    expect(subjects.channels.map((c) => c.type)).toEqual(["CHAT", "CHAT"]);
    expect(
      await channels.place(
        g,
        { id: owner.id, role: "OWNER" },
        ["CHAT"],
        history.id,
      ),
    ).toEqual({
      ok: true,
      channelId: history.id,
      subjectName: "Kerala History",
    });

    // Run again after the syllabus grows: only the new subject is added.
    examSubjects = [...examSubjects, { name: "English", topics: [] }];
    expect(await channels.addSubjectChannels(owner, g)).toEqual({
      ok: true,
      added: 1,
    });
    expect(await channels.addSubjectChannels(owner, g)).toEqual({
      ok: true,
      added: 0,
    });
  });

  it("asks for an exam first, and a member can't do it", async () => {
    const owner = await user("Owner");
    const anu = await user("Anu");
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: null,
        visibility: "PUBLIC",
        template: "BLANK",
      }),
    );
    await groups.join(anu, g);
    expect(await channels.addSubjectChannels(owner, g)).toMatchObject({
      ok: false,
      code: "NO_EXAM",
    });
    expect(await channels.addSubjectChannels(anu, g)).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
  });
});

describe("the study room", () => {
  it("lists members whose timer is beating, and forgets the ones that stopped", async () => {
    const owner = await user("Owner");
    const anu = await user("Anu");
    const outsider = await user("Outsider");
    const g = groupId(
      await groups.create(owner, {
        name: "Squad",
        description: null,
        examId: null,
        visibility: "PUBLIC",
        template: "BLANK",
      }),
    );
    await groups.join(anu, g);
    const beat = async (
      who: { id: string },
      secondsAgo: number,
      paused = false,
    ) =>
      prisma.activeSession.create({
        data: {
          userId: who.id,
          planId: crypto.randomUUID(),
          taskId: crypto.randomUUID(),
          startedAt: new Date(clock.now().getTime() - 25 * 60_000),
          lastBeatAt: new Date(clock.now().getTime() - secondsAgo * 1000),
          activeSeconds: 20 * 60,
          paused,
        },
      });
    await beat(anu, 10);
    await beat(outsider, 10);
    await beat(owner, 10 * 60); // stopped beating: gone quiet

    const room = (await groups.studyRoom(owner, g))!;
    expect(room.map((p) => p.name)).toEqual(["Anu"]);
    expect(room[0]).toMatchObject({ minutes: 20, paused: false, you: false });
    expect(await groups.studyRoom(outsider, g)).toBeNull();
  });
});
