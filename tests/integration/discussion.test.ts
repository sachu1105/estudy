import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { discussionRepository } from "@/server/repositories/discussion-repository";
import { channelRepository } from "@/server/repositories/channel-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { notificationRepository } from "@/server/repositories/notification-repository";
import { progressRepository } from "@/server/repositories/progress-repository";
import type { GroupEvent } from "@/server/realtime/types";
import {
  ANSWER_XP,
  createDiscussionService,
} from "@/server/services/groups/discussion-service";
import { createChannelService } from "@/server/services/groups/channel-service";
import { createGroupService } from "@/server/services/groups/group-service";
import { createNotificationService } from "@/server/services/notifications/notification-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-12T04:30:00Z");
const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  ownerLimit: async () => 100,
  clock,
  limit: () => 10,
  newCode: () => crypto.randomUUID().slice(0, 8),
});
const channels = createChannelService({
  groups,
  channels: channelRepository,
  clock,
  ownerLimit: async () => 50,
});
const notifications = createNotificationService({
  notifications: notificationRepository,
  clock,
});
const events: { groupId: string; event: GroupEvent }[] = [];
const discussion = createDiscussionService({
  groups,
  channels,
  posts: discussionRepository,
  clock,
  emit: async (groupId, event) => void events.push({ groupId, event }),
  notify: (rows) => notifications.notify(rows),
  addXp: (entry) => progressRepository.addXp(entry),
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

async function setup() {
  const owner = await user("Owner");
  const anu = await user("Anu");
  const binu = await user("Binu");
  const made = await groups.create(owner, {
    name: "LDC Kollam",
    description: null,
    examId: null,
    visibility: "PUBLIC",
  });
  const groupId = (made as { groupId: string }).groupId;
  await groups.join(anu, groupId);
  await groups.join(binu, groupId);
  return { owner, anu, binu, groupId };
}

const question = (topic: string) => ({
  kind: "QUESTION" as const,
  title: `Doubt about ${topic}`,
  body: "Which article?",
  mentionIds: [],
  subjectName: "Polity",
  topicName: topic,
});

beforeEach(async () => {
  await resetDatabase();
  clock.set("2026-10-12T04:30:00Z");
  events.length = 0;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("group discussion", () => {
  it("posts, replies, mentions and notifies once per person, and emits events", async () => {
    const { owner, anu, binu, groupId } = await setup();
    const outsider = await user("Outsider");
    const post = await discussion.create(anu, groupId, {
      kind: "DISCUSSION",
      title: "Study hours",
      body: "How long do you study, @Binu?",
      mentionIds: [binu.id, outsider.id, anu.id],
      subjectName: null,
      topicName: null,
    });
    expect(post.ok).toBe(true);
    const postId = (post as { postId: string }).postId;
    const saved = await prisma.post.findUniqueOrThrow({
      where: { id: postId },
    });
    // Only members, never yourself.
    expect(saved.mentionIds).toEqual([binu.id]);

    // Binu replies mentioning Anu: Anu, the author, hears it once (as a mention).
    await discussion.reply(binu, groupId, postId, {
      body: "Six hours, @Anu",
      mentionIds: [anu.id],
    });
    const anuInbox = await notifications.list(anu);
    expect(anuInbox.map((n) => n.kind)).toEqual(["MENTION"]);
    expect((await notifications.list(binu)).map((n) => n.kind)).toEqual([
      "MENTION",
    ]);
    expect(await notifications.unread(owner)).toBe(0);

    const thread = await discussion.thread(owner, groupId, postId);
    expect(thread?.post.mentions).toEqual([{ id: binu.id, name: "Binu" }]);
    expect(thread?.replies).toHaveLength(1);
    expect(events.map((e) => e.event.type)).toEqual(["post", "reply"]);

    // Outsiders see nothing.
    expect(await discussion.thread(outsider, groupId, postId)).toBeNull();
    expect(
      await discussion.reply(outsider, groupId, postId, {
        body: "hi",
        mentionIds: [],
      }),
    ).toMatchObject({ ok: false });
  });

  it("toggles reactions, one of each kind per person", async () => {
    const { anu, binu, groupId } = await setup();
    const { postId } = (await discussion.create(
      anu,
      groupId,
      question("Preamble"),
    )) as { postId: string };
    const react = (on: boolean) =>
      discussion.react(binu, groupId, {
        postId,
        replyId: null,
        kind: "HELPFUL",
        on,
      });
    await react(true);
    await react(true);
    let thread = await discussion.thread(binu, groupId, postId);
    expect(thread?.post.reactions.find((r) => r.kind === "HELPFUL")).toEqual({
      kind: "HELPFUL",
      count: 1,
      mine: true,
    });
    await react(false);
    thread = await discussion.thread(binu, groupId, postId);
    expect(thread?.post.reactions.every((r) => r.count === 0)).toBe(true);
  });

  it("pays XP once per accepted question, within the daily cap", async () => {
    const { owner, anu, binu, groupId } = await setup();
    const paid: number[] = [];
    for (const topic of ["A", "B", "C", "D"]) {
      const { postId } = (await discussion.create(
        anu,
        groupId,
        question(topic),
      )) as { postId: string };
      const { replyId } = (await discussion.reply(binu, groupId, postId, {
        body: "Article 1",
        mentionIds: [],
      })) as { replyId: string };
      // Only the asker accepts.
      expect(
        await discussion.accept(owner, groupId, postId, replyId),
      ).toMatchObject({ ok: false, code: "FORBIDDEN" });
      const result = await discussion.accept(anu, groupId, postId, replyId);
      paid.push((result as { xp: number }).xp);
      // Un-accepting and accepting again pays nothing more.
      await discussion.accept(anu, groupId, postId, null);
      const again = await discussion.accept(anu, groupId, postId, replyId);
      expect((again as { xp: number }).xp).toBe(0);
    }
    expect(paid).toEqual([ANSWER_XP, ANSWER_XP, ANSWER_XP, 0]);
    const ledger = await prisma.xpLedger.findMany({
      where: { userId: binu.id, kind: "ANSWER" },
    });
    // Four rows, one per question; the last one paid 0 (the day's cap).
    expect(ledger.map((l) => l.amount).sort()).toEqual([0, 10, 10, 10]);
    expect(
      (await notifications.list(binu)).filter((n) => n.kind === "ACCEPTED"),
    ).toHaveLength(4);
  });

  it("lets group admins pin and hide; muted members read but can't post", async () => {
    const { owner, anu, binu, groupId } = await setup();
    const first = (await discussion.create(anu, groupId, question("A"))) as {
      postId: string;
    };
    clock.set("2026-10-12T05:00:00Z");
    const second = (await discussion.create(binu, groupId, question("B"))) as {
      postId: string;
    };
    expect(
      await discussion.pin(anu, groupId, first.postId, true),
    ).toMatchObject({ ok: false });
    await discussion.pin(owner, groupId, first.postId, true);
    expect(
      (await discussion.list(anu, groupId, "all"))?.map((p) => p.id),
    ).toEqual([first.postId, second.postId]);

    await discussion.hide(
      owner,
      groupId,
      { postId: second.postId, replyId: null },
      true,
    );
    expect(await discussion.list(anu, groupId, "all")).toHaveLength(1);
    expect(await discussion.thread(anu, groupId, second.postId)).toBeNull();
    // Admins still see it, marked.
    expect(
      (await discussion.list(owner, groupId, "all"))?.find(
        (p) => p.id === second.postId,
      )?.hiddenAt,
    ).toBeTruthy();

    const { replyId } = (await discussion.reply(binu, groupId, first.postId, {
      body: "rude words",
      mentionIds: [],
    })) as { replyId: string };
    await discussion.hide(
      owner,
      groupId,
      { postId: first.postId, replyId },
      true,
    );
    const thread = await discussion.thread(anu, groupId, first.postId);
    expect(thread?.replies[0].body).toBe("");
    expect(
      (await discussion.thread(owner, groupId, first.postId))?.replies[0].body,
    ).toBe("rude words");

    await groups.manage(owner, groupId, binu.id, { kind: "mute", hours: 24 });
    expect(await discussion.create(binu, groupId, question("C"))).toMatchObject(
      {
        ok: false,
        code: "MUTED",
      },
    );
    expect(await discussion.list(binu, groupId, "all")).toHaveLength(1);
  });

  it("hides blocked people's posts and keeps their notifications away", async () => {
    const { anu, binu, groupId } = await setup();
    await groups.block(anu, binu.id, true);
    const { postId } = (await discussion.create(binu, groupId, {
      ...question("A"),
      body: "@Anu look",
      mentionIds: [anu.id],
    })) as { postId: string };
    expect(await discussion.list(anu, groupId, "all")).toHaveLength(0);
    expect(await notifications.unread(anu)).toBe(0);
    expect((await discussion.list(binu, groupId, "all"))?.[0].id).toBe(postId);
  });

  it("lets authors delete their own posts and replies only", async () => {
    const { anu, binu, groupId } = await setup();
    const { postId } = (await discussion.create(
      anu,
      groupId,
      question("A"),
    )) as {
      postId: string;
    };
    const { replyId } = (await discussion.reply(binu, groupId, postId, {
      body: "Answer",
      mentionIds: [],
    })) as { replyId: string };
    await discussion.accept(anu, groupId, postId, replyId);
    expect(
      await discussion.remove(anu, groupId, { postId, replyId }),
    ).toMatchObject({ ok: false });
    await discussion.remove(binu, groupId, { postId, replyId });
    const post = await prisma.post.findUniqueOrThrow({ where: { id: postId } });
    expect(post.replyCount).toBe(0);
    expect(post.acceptedReplyId).toBeNull();
    await discussion.remove(anu, groupId, { postId, replyId: null });
    expect(await discussion.list(anu, groupId, "all")).toHaveLength(0);
  });
});

describe("an announcements-style threads channel", () => {
  it("lets members read but not post or reply", async () => {
    const { owner, anu, groupId } = await setup();
    const doubts = (await channels.layout(owner, groupId))!.categories
      .flatMap((c) => c.channels)
      .find((c) => c.name === "doubts")!;
    const { postId } = (await discussion.create(
      owner,
      groupId,
      question("Preamble"),
    )) as { postId: string };

    await channels.update(owner, groupId, doubts.id, { postRule: "ADMINS" });
    expect(
      await discussion.create(anu, groupId, question("Rivers")),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(
      await discussion.reply(anu, groupId, postId, {
        body: "Me too",
        mentionIds: [],
      }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    // The squad's staff still answer.
    expect(
      await discussion.reply(owner, groupId, postId, {
        body: "Article 21",
        mentionIds: [],
      }),
    ).toMatchObject({ ok: true });
  });
});
