import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { channelRepository } from "@/server/repositories/channel-repository";
import { discussionRepository } from "@/server/repositories/discussion-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { messageRepository } from "@/server/repositories/message-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import type { GroupEvent } from "@/server/realtime/types";
import { createChannelService } from "@/server/services/groups/channel-service";
import {
  CHAT_PAGE,
  createChatService,
} from "@/server/services/groups/chat-service";
import { createGroupService } from "@/server/services/groups/group-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-17T04:30:00Z");
const events: GroupEvent[] = [];
const notes: NewNotification[] = [];
const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  clock,
  limit: () => 10,
  ownerLimit: async () => 100,
  newCode: () => crypto.randomUUID().slice(0, 8).toUpperCase(),
});
const channels = createChannelService({
  groups,
  channels: channelRepository,
  clock,
  ownerLimit: async () => 50,
  examSubjects: async () => [],
});
const chat = createChatService({
  groups,
  channels,
  messages: messageRepository,
  memberNames: (g) => discussionRepository.memberNames(g),
  notifyLevels: (userId, g) => channelRepository.notifyLevels(userId, g),
  mutedOn: (channelId, ids) => channelRepository.mutedOn(channelId, ids),
  shareFromPod: async () => ({ ok: false, code: "NO", message: "no" }),
  shareUploads: async () => ({ ok: false, code: "NO", message: "no" }),
  clock,
  emit: async (_g, e) => void events.push(e),
  notify: async (rows) => void notes.push(...rows),
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

/** A squad with an owner and a member, and its general and announcements channels. */
async function squad() {
  const owner = await user("Owner");
  const anu = await user("Anu");
  const groupId = (
    (await groups.create(owner, {
      name: "Squad",
      description: null,
      examId: null,
      visibility: "PUBLIC",
    })) as { groupId: string }
  ).groupId;
  await groups.join(anu, groupId);
  const all = (await channels.layout(owner, groupId))!.categories.flatMap(
    (c) => c.channels,
  );
  const id = (name: string) => all.find((c) => c.name === name)!.id;
  return {
    owner,
    anu,
    groupId,
    general: id("general"),
    news: id("announcements"),
    doubts: id("doubts"),
  };
}

const text = (body: string) => ({
  body,
  replyToId: null,
  mentionIds: [],
  podItemId: null,
});

beforeEach(async () => {
  await resetDatabase();
  clock.set("2026-10-17T04:30:00Z");
  events.length = 0;
  notes.length = 0;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("searching a channel", () => {
  it("finds messages holding every word, newest first, never removed ones", async () => {
    const s = await squad();
    const send = async (who: typeof s.owner, body: string) => {
      clock.advance(1000);
      return (await chat.send(who, s.groupId, s.general, text(body))) as {
        ok: true;
        message: { id: string };
      };
    };
    await send(s.anu, "The Preamble notes are up");
    const gone = await send(s.owner, "preamble quiz tonight");
    await send(s.anu, "Fundamental rights next");
    await send(s.owner, "Revise the PREAMBLE before the quiz");
    await chat.remove(s.owner, s.groupId, s.general, gone.message.id);
    // Another channel's message never shows up here.
    await chat.send(s.anu, s.groupId, s.news, text("Preamble quiz moved"));

    const one = await chat.search(s.anu, s.groupId, s.general, "preamble");
    expect(one!.messages.map((m) => m.body)).toEqual([
      "Revise the PREAMBLE before the quiz",
      "The Preamble notes are up",
    ]);
    const both = await chat.search(
      s.anu,
      s.groupId,
      s.general,
      "quiz  Preamble",
    );
    expect(both!.messages.map((m) => m.body)).toEqual([
      "Revise the PREAMBLE before the quiz",
    ]);
    expect(
      (await chat.search(s.anu, s.groupId, s.general, "   "))!.messages,
    ).toEqual([]);
  });

  it("is for members only", async () => {
    const s = await squad();
    const outsider = await user("Outsider");
    expect(
      await chat.search(outsider, s.groupId, s.general, "anything"),
    ).toBeNull();
  });
});

describe("squad chat", () => {
  it("sends, replies and mentions, and tells the squad live", async () => {
    const s = await squad();
    const first = (await chat.send(
      s.anu,
      s.groupId,
      s.general,
      text("Hi all"),
    )) as {
      ok: true;
      message: { id: string };
    };
    clock.advance(1000);
    const reply = await chat.send(s.owner, s.groupId, s.general, {
      body: "Welcome @Anu",
      replyToId: first.message.id,
      mentionIds: [s.anu.id, s.owner.id, crypto.randomUUID()],
      podItemId: null,
    });
    expect(reply).toMatchObject({
      ok: true,
      message: {
        replyTo: { author: "Anu", preview: "Hi all" },
        mentions: [{ id: s.anu.id, name: "Anu" }],
      },
    });
    expect(notes).toEqual([
      expect.objectContaining({ userId: s.anu.id, kind: "MENTION" }),
    ]);
    expect(events.map((e) => e.type === "message" && e.action)).toEqual([
      "new",
      "new",
    ]);
    const page = await chat.page(s.anu, s.groupId, s.general);
    expect(page?.messages.map((m) => m.body)).toEqual([
      "Hi all",
      "Welcome @Anu",
    ]);
  });

  it("is only for chat channels, and announcements are for admins", async () => {
    const s = await squad();
    expect(
      await chat.send(s.anu, s.groupId, s.doubts, text("Here?")),
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(
      await chat.send(s.anu, s.groupId, s.news, text("Big news")),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(
      await chat.send(s.owner, s.groupId, s.news, text("Exam on 12 Dec")),
    ).toMatchObject({ ok: true });
    const outsider = await user("Outsider");
    expect(await chat.page(outsider, s.groupId, s.general)).toBeNull();
    expect(
      await chat.send(s.anu, s.groupId, s.general, text("   ")),
    ).toMatchObject({ ok: false, code: "EMPTY" });
  });

  it("lets the author edit, and the author or an admin delete", async () => {
    const s = await squad();
    const sent = (await chat.send(
      s.anu,
      s.groupId,
      s.general,
      text("Teh answer"),
    )) as {
      ok: true;
      message: { id: string };
    };
    const m = sent.message.id;
    expect(
      await chat.edit(s.owner, s.groupId, s.general, m, {
        body: "hacked",
        mentionIds: [],
      }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    await chat.edit(s.anu, s.groupId, s.general, m, {
      body: "The answer",
      mentionIds: [],
    });
    let page = await chat.page(s.anu, s.groupId, s.general);
    expect(page?.messages[0]).toMatchObject({
      body: "The answer",
      edited: true,
    });

    await chat.remove(s.owner, s.groupId, s.general, m);
    page = await chat.page(s.anu, s.groupId, s.general);
    expect(page?.messages[0]).toMatchObject({ deleted: true, body: "" });
    expect(
      await chat.react(s.anu, s.groupId, s.general, m, "LIKE", true),
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("tallies reactions per kind, with the person's own marked", async () => {
    const s = await squad();
    const sent = (await chat.send(
      s.anu,
      s.groupId,
      s.general,
      text("Notes up"),
    )) as {
      ok: true;
      message: { id: string };
    };
    await chat.react(
      s.owner,
      s.groupId,
      s.general,
      sent.message.id,
      "THANKS",
      true,
    );
    await chat.react(
      s.anu,
      s.groupId,
      s.general,
      sent.message.id,
      "THANKS",
      true,
    );
    await chat.react(
      s.anu,
      s.groupId,
      s.general,
      sent.message.id,
      "THANKS",
      false,
    );
    const page = await chat.page(s.owner, s.groupId, s.general);
    expect(page?.messages[0]?.reactions).toContainEqual({
      kind: "THANKS",
      count: 1,
      mine: true,
    });
  });

  it("pages back in time and catches up after a message", async () => {
    const s = await squad();
    const ids: string[] = [];
    for (let i = 0; i < CHAT_PAGE + 5; i++) {
      clock.advance(1000);
      const r = (await chat.send(
        s.anu,
        s.groupId,
        s.general,
        text(`m${i}`),
      )) as {
        ok: true;
        message: { id: string };
      };
      ids.push(r.message.id);
    }
    const latest = (await chat.page(s.owner, s.groupId, s.general))!;
    expect(latest.messages).toHaveLength(CHAT_PAGE);
    expect(latest.hasMore).toBe(true);
    expect(latest.messages.at(-1)?.body).toBe(`m${CHAT_PAGE + 4}`);
    const older = (await chat.page(s.owner, s.groupId, s.general, {
      before: latest.messages[0]!.id,
    }))!;
    expect(older.messages.map((m) => m.body)).toEqual([
      "m0",
      "m1",
      "m2",
      "m3",
      "m4",
    ]);
    expect(older.hasMore).toBe(false);
    const after = (await chat.page(s.owner, s.groupId, s.general, {
      after: ids.at(-3),
    }))!;
    expect(after.messages.map((m) => m.body)).toEqual([
      `m${CHAT_PAGE + 3}`,
      `m${CHAT_PAGE + 4}`,
    ]);
  });

  it("counts unread messages and mentions from others until read", async () => {
    const s = await squad();
    clock.advance(1000);
    await chat.send(s.owner, s.groupId, s.general, text("one"));
    await chat.send(s.owner, s.groupId, s.general, {
      ...text("two @Anu"),
      mentionIds: [s.anu.id],
    });
    await chat.send(s.anu, s.groupId, s.general, text("mine"));
    expect(await chat.unread(s.anu, s.groupId)).toEqual({
      [s.general]: { unread: 2, mentions: 1 },
    });
    expect([...(await chat.squadsWithUnread(s.anu))]).toEqual([s.groupId]);

    clock.advance(1000);
    await chat.markRead(s.anu, s.groupId, s.general);
    expect(await chat.unread(s.anu, s.groupId)).toEqual({});
    expect((await chat.squadsWithUnread(s.anu)).size).toBe(0);
  });
});

describe("slow mode and notification levels", () => {
  it("makes members wait between messages, but never the squad's staff", async () => {
    const s = await squad();
    await channels.update(s.owner, s.groupId, s.general, { slowModeSec: 30 });
    const channel = (await channels.get(s.anu, s.groupId, s.general))!.channel;
    expect(channel.slowModeSec).toBe(30);

    expect(
      await chat.send(s.anu, s.groupId, s.general, text("one")),
    ).toMatchObject({
      ok: true,
    });
    clock.advance(10_000);
    expect(
      await chat.send(s.anu, s.groupId, s.general, text("two")),
    ).toMatchObject({
      ok: false,
      code: "SLOW_MODE",
    });
    // The owner is never slowed.
    expect(
      await chat.send(s.owner, s.groupId, s.general, text("mine")),
    ).toMatchObject({ ok: true });
    clock.advance(21_000);
    expect(
      await chat.send(s.anu, s.groupId, s.general, text("two")),
    ).toMatchObject({
      ok: true,
    });
  });

  it("counts only mentions when set to mentions, and nothing when muted", async () => {
    const s = await squad();
    clock.advance(1000);
    await chat.send(s.owner, s.groupId, s.general, text("one"));
    await chat.send(s.owner, s.groupId, s.general, {
      ...text("two @Anu"),
      mentionIds: [s.anu.id],
    });
    expect((await chat.unread(s.anu, s.groupId))[s.general]).toEqual({
      unread: 2,
      mentions: 1,
    });

    await channels.setNotify(s.anu, s.groupId, s.general, "MENTIONS");
    expect((await chat.unread(s.anu, s.groupId))[s.general]).toEqual({
      unread: 1,
      mentions: 1,
    });

    await channels.setNotify(s.anu, s.groupId, s.general, "MUTE");
    expect(await chat.unread(s.anu, s.groupId)).toEqual({});
    // A muted channel doesn't reach the notification centre either.
    notes.length = 0;
    await chat.send(s.owner, s.groupId, s.general, {
      ...text("three @Anu"),
      mentionIds: [s.anu.id],
    });
    expect(notes).toEqual([]);

    await channels.setNotify(s.anu, s.groupId, s.general, "ALL");
    expect((await chat.unread(s.anu, s.groupId))[s.general]?.unread).toBe(3);
  });
});
