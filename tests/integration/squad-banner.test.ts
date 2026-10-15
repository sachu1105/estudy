import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { channelRepository } from "@/server/repositories/channel-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { createGroupService } from "@/server/services/groups/group-service";
import { createSquadCoverService } from "@/server/services/groups/squad-cover-service";
import { createMemoryStorage } from "@/server/storage/memory";

import { resetDatabase } from "./helpers";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const clock = fixedClock("2026-10-19T04:30:00Z");
let code = 0;
const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  ownerLimit: async () => 100,
  clock,
  limit: () => 10,
  newCode: () => `CODE${++code}`,
});
const store = createMemoryStorage();
const banners = createSquadCoverService({
  groups: groupRepository,
  squads: groups,
  storage: store.storage,
  ids: randomIds,
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

async function squad(
  owner: Awaited<ReturnType<typeof user>>,
  name = "Evening batch",
) {
  const made = await groups.create(owner, {
    name,
    description: null,
    examId: null,
    visibility: "PUBLIC",
    joinMode: "OPEN",
    joinQuestion: null,
    template: "EXAM",
  });
  if (!made.ok) throw new Error("could not make the squad");
  return (made as { groupId: string }).groupId;
}

beforeEach(async () => {
  await resetDatabase();
  store.objects.clear();
  code = 0;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("squad banner", () => {
  it("starts automatic, takes a gradient, then an image, then automatic again", async () => {
    const owner = await user("Anjali");
    const id = await squad(owner);
    expect((await banners.get(owner, id))?.selection).toBe("auto");

    await banners.set(owner, id, { kind: "gradient", preset: "ocean" });
    expect((await banners.get(owner, id))?.selection).toBe("ocean");

    const key = `squad/${id}/${crypto.randomUUID()}`;
    await store.storage.put(key, PNG, "image/png");
    const image = await banners.set(owner, id, { kind: "image", key });
    expect(image.ok && image.cover).toEqual({
      kind: "image",
      url: `/api/squad-image/${id}?v=${key.slice(-8)}`,
    });

    // Back to automatic: the image is dropped from storage.
    await banners.set(owner, id, { kind: "auto" });
    expect((await banners.get(owner, id))?.selection).toBe("auto");
    expect(store.objects.has(key)).toBe(false);
  });

  it("only admins may change it", async () => {
    const owner = await user("Anjali");
    const member = await user("Rahul");
    const stranger = await user("Fathima");
    const id = await squad(owner);
    await groups.join(member, id);

    for (const who of [member, stranger])
      expect(
        (await banners.set(who, id, { kind: "gradient", preset: "ember" })).ok,
        who.id,
      ).toBe(false);
    expect(await banners.get(member, id)).toBeNull();

    // Promoted to admin, the same member can.
    await groups.manage(owner, id, member.id, { kind: "role", role: "ADMIN" });
    expect(
      (await banners.set(member, id, { kind: "gradient", preset: "ember" })).ok,
    ).toBe(true);
  });

  it("refuses a key from another squad and bytes that aren't an image", async () => {
    const owner = await user("Anjali");
    const id = await squad(owner);
    const other = await squad(owner, "Morning batch");

    const theirs = `squad/${other}/${crypto.randomUUID()}`;
    await store.storage.put(theirs, PNG, "image/png");
    expect(
      (await banners.set(owner, id, { kind: "image", key: theirs })).ok,
    ).toBe(false);

    const fake = `squad/${id}/${crypto.randomUUID()}`;
    await store.storage.put(
      fake,
      new TextEncoder().encode("<svg/>"),
      "image/png",
    );
    expect(
      (await banners.set(owner, id, { kind: "image", key: fake })).ok,
    ).toBe(false);
    expect(store.objects.has(fake)).toBe(false);
  });

  it("serves a public squad's banner to anyone, a private one's to members only", async () => {
    const owner = await user("Anjali");
    const stranger = await user("Fathima");
    const id = await squad(owner);
    const key = `squad/${id}/${crypto.randomUUID()}`;
    await store.storage.put(key, PNG, "image/png");
    await banners.set(owner, id, { kind: "image", key });

    expect(await banners.signedImage(null, id)).toBeTruthy();
    expect(await banners.signedImage(stranger, id)).toBeTruthy();

    await groups.update(owner, id, {
      name: "Evening batch",
      description: null,
      examId: null,
      visibility: "PRIVATE",
      joinMode: "INVITE_ONLY",
      joinQuestion: null,
    });
    expect(await banners.signedImage(null, id)).toBeNull();
    expect(await banners.signedImage(stranger, id)).toBeNull();
    expect(await banners.signedImage(owner, id)).toBeTruthy();
  });
});
