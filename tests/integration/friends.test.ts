import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import type { UserEvent } from "@/server/realtime/types";
import { dmRepository } from "@/server/repositories/dm-repository";
import { friendRepository } from "@/server/repositories/friend-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import { userRepository } from "@/server/repositories/user-repository";
import { createDmService } from "@/server/services/friends/dm-service";
import { createFriendService } from "@/server/services/friends/friend-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-11-04T04:30:00Z");
const events: { to: string[]; event: UserEvent }[] = [];
const notes: NewNotification[] = [];
const emitter = {
  emit: async (to: string[], event: UserEvent) =>
    void events.push({ to, event }),
};
const friends = createFriendService({
  friends: friendRepository,
  dms: dmRepository,
  users: userRepository,
  notify: async (rows) => void notes.push(...rows),
  events: emitter,
  clock,
  suffix: () => crypto.randomUUID().slice(0, 6),
});
const dms = createDmService({
  dms: dmRepository,
  friends: friendRepository,
  events: emitter,
  clock,
});

async function user(name: string, handle: string | null = name.toLowerCase()) {
  const u = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.com`,
      passwordHash: "x",
      name,
      displayName: name,
      handle,
    },
  });
  return { id: u.id, displayName: name, subscription: null };
}

beforeEach(async () => {
  await resetDatabase();
  events.length = 0;
  notes.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("friend requests", () => {
  it("asks by username, shows both ways, and becomes a friendship on yes", async () => {
    const anu = await user("Anu");
    const ravi = await user("Ravi");
    const sent = await friends.request(anu, { handle: "@Ravi", note: null });
    expect(sent).toEqual({ ok: true, name: "Ravi", accepted: false });
    expect(notes).toMatchObject([{ userId: ravi.id, kind: "FRIEND_REQUEST" }]);

    const [mine, theirs] = await Promise.all([
      friends.overview(anu),
      friends.overview(ravi),
    ]);
    expect(mine.outgoing.map((r) => r.id)).toEqual([ravi.id]);
    expect(theirs.incoming.map((r) => r.id)).toEqual([anu.id]);
    expect(await friends.incomingCount(ravi)).toBe(1);

    // The asker can't answer their own request.
    const id = theirs.incoming[0]!.friendshipId;
    expect((await friends.accept(anu, id)).ok).toBe(false);
    expect((await friends.accept(ravi, id)).ok).toBe(true);
    expect(await friends.areFriends(anu.id, ravi.id)).toBe(true);
    expect(notes.at(-1)).toMatchObject({
      userId: anu.id,
      kind: "FRIEND_ACCEPTED",
    });
    expect(events.some((e) => e.to.includes(anu.id))).toBe(true);
  });

  it("says yes instead when the other person had already asked", async () => {
    const anu = await user("Anu");
    const ravi = await user("Ravi");
    await friends.request(anu, { handle: "ravi", note: null });
    const back = await friends.request(ravi, { handle: "anu", note: null });
    expect(back).toMatchObject({ ok: true, accepted: true });
    expect(await friends.areFriends(anu.id, ravi.id)).toBe(true);
  });

  it("refuses yourself, repeats, and gives one answer for unknown and blocked", async () => {
    const anu = await user("Anu");
    await user("Ravi");
    const meera = await user("Meera");
    expect(
      await friends.request(anu, { handle: "anu", note: null }),
    ).toMatchObject({
      ok: false,
      code: "SELF",
    });
    await friends.request(anu, { handle: "ravi", note: null });
    expect(
      await friends.request(anu, { handle: "ravi", note: null }),
    ).toMatchObject({
      ok: false,
      code: "ALREADY",
    });

    await friends.block(meera, anu.id);
    const blocked = await friends.request(anu, { handle: "meera", note: null });
    const unknown = await friends.request(anu, {
      handle: "nobody",
      note: null,
    });
    expect(blocked).toEqual(unknown);
  });

  it("declines, cancels and unfriends by removing the row", async () => {
    const anu = await user("Anu");
    const ravi = await user("Ravi");
    await friends.request(anu, { handle: "ravi", note: null });
    const id = (await friends.overview(anu)).outgoing[0]!.friendshipId;
    // Someone outside the pair can't touch it.
    const meera = await user("Meera");
    expect((await friends.drop(meera, id)).ok).toBe(false);
    expect((await friends.drop(ravi, id)).ok).toBe(true);
    expect((await friends.overview(anu)).outgoing).toEqual([]);
  });

  it("opens the chat with the note once the request is accepted", async () => {
    const anu = await user("Anu");
    const ravi = await user("Ravi");
    await friends.request(anu, { handle: "ravi", note: "Study for LDC?" });
    const id = (await friends.overview(ravi)).incoming[0]!.friendshipId;
    await friends.accept(ravi, id);
    const page = await dms.page(ravi, anu.id, null);
    expect(page.messages.map((m) => [m.body, m.author.id])).toEqual([
      ["Study for LDC?", anu.id],
    ]);
  });

  it("gives an account without a username one that sticks", async () => {
    const old = await user("Old Timer", null);
    const handle = await friends.ensureHandle(old);
    expect(handle).toMatch(/^old_timer_[0-9a-f-]{6}$/);
    expect(await friends.ensureHandle(old)).toBe(handle);
  });
});

describe("search and private people", () => {
  it("finds public people by name or username, with where things stand", async () => {
    const anu = await user("Anu");
    await user("Anjali Nair", "anjali_n");
    const ravi = await user("Ravi", "anurag_r");
    await user("Hidden Anu", "hidden_anu");
    await prisma.user.updateMany({
      where: { handle: "hidden_anu" },
      data: { findable: false },
    });
    await friends.request(anu, { handle: "anurag_r", note: null });

    const found = await friends.search(anu, "an");
    // Both usernames start with "an", so by name; private people never show.
    expect(found.map((p) => p.handle)).toEqual(["anjali_n", "anurag_r"]);
    expect(found[0]).toMatchObject({ status: "none" });
    expect(found[1]).toMatchObject({ id: ravi.id, status: "sent" });
    // A name alone finds them too.
    expect((await friends.search(anu, "nair")).map((p) => p.handle)).toEqual([
      "anjali_n",
    ]);
    expect(await friends.search(anu, "a")).toEqual([]);
    expect((await friends.search(anu, "@anjali")).map((p) => p.handle)).toEqual(
      ["anjali_n"],
    );

    // Blocked either way: gone from search.
    await friends.block(ravi, anu.id);
    expect((await friends.search(anu, "anu")).map((p) => p.handle)).toEqual([]);
  });

  it("can't be asked when private, but can still ask and accept back", async () => {
    const anu = await user("Anu");
    const ravi = await user("Ravi");
    await prisma.user.update({
      where: { id: ravi.id },
      data: { findable: false },
    });
    expect(await friends.request(anu, { handle: "ravi", note: null })).toEqual(
      await friends.request(anu, { handle: "nobody", note: null }),
    );

    // Ravi asks Anu; Anu's request back is the yes.
    expect(
      (await friends.request(ravi, { handle: "anu", note: null })).ok,
    ).toBe(true);
    expect(
      await friends.request(anu, { handle: "ravi", note: null }),
    ).toMatchObject({ ok: true, accepted: true });
    expect(await friends.areFriends(anu.id, ravi.id)).toBe(true);
  });
});

describe("direct messages", () => {
  async function pals() {
    const anu = await user("Anu");
    const ravi = await user("Ravi");
    await friends.request(anu, { handle: "ravi", note: null });
    await friends.request(ravi, { handle: "anu", note: null });
    return { anu, ravi };
  }

  it("sends between friends, counts unread until read, and pages back", async () => {
    const { anu, ravi } = await pals();
    for (let i = 0; i < 3; i++) {
      clock.advance(1000);
      expect((await dms.send(anu, ravi.id, `hi ${i}`)).ok).toBe(true);
    }
    expect(await dms.unreadTotal(ravi)).toBe(3);
    expect(await dms.unreadTotal(anu)).toBe(0);
    const [thread] = await dms.threads(ravi);
    expect(thread).toMatchObject({
      person: { id: anu.id },
      last: { body: "hi 2", mine: false },
      unread: 3,
    });
    clock.advance(1000);
    await dms.markRead(ravi, anu.id);
    expect(await dms.unreadTotal(ravi)).toBe(0);

    const page = await dms.page(ravi, anu.id, null);
    expect(page.messages.map((m) => m.body)).toEqual(["hi 0", "hi 1", "hi 2"]);
    const older = await dms.page(ravi, anu.id, page.messages[1]!.id);
    expect(older.messages.map((m) => m.body)).toEqual(["hi 0"]);
    expect(events.filter((e) => e.event.type === "dm")).toHaveLength(3);
  });

  it("edits and deletes only your own messages", async () => {
    const { anu, ravi } = await pals();
    const sent = await dms.send(anu, ravi.id, "helo");
    if (!sent.ok) throw new Error(sent.message);
    expect((await dms.edit(ravi, sent.message.id, "x")).ok).toBe(false);
    const edited = await dms.edit(anu, sent.message.id, "hello");
    expect(edited).toMatchObject({
      ok: true,
      message: { body: "hello", edited: true },
    });
    expect((await dms.remove(ravi, sent.message.id)).ok).toBe(false);
    expect((await dms.remove(anu, sent.message.id)).ok).toBe(true);
    const [m] = (await dms.page(ravi, anu.id, null)).messages;
    expect(m).toMatchObject({ deleted: true, body: "" });
  });

  it("keeps strangers out, and stops sending after unfriending or a block", async () => {
    const { anu, ravi } = await pals();
    const meera = await user("Meera");
    expect(await dms.open(meera, anu.id)).toBeNull();
    expect((await dms.send(meera, anu.id, "hey")).ok).toBe(false);

    await dms.send(anu, ravi.id, "before");
    const id = (await friends.overview(anu)).friends[0]!.friendshipId;
    await friends.drop(anu, id);
    // The history stays readable, but nobody can write.
    const open = await dms.open(ravi, anu.id);
    expect(open).toMatchObject({ canSend: false });
    expect((await dms.send(ravi, anu.id, "after")).ok).toBe(false);

    await friends.request(anu, { handle: "ravi", note: null });
    await friends.request(ravi, { handle: "anu", note: null });
    await friends.block(ravi, anu.id);
    expect(await friends.areFriends(anu.id, ravi.id)).toBe(false);
    expect(await dms.send(anu, ravi.id, "hi")).toMatchObject({
      ok: false,
      message: "You can't message Ravi.",
    });
  });
});
