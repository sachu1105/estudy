import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { groupItemRepository } from "@/server/repositories/group-item-repository";
import { channelRepository } from "@/server/repositories/channel-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { podItemRepository } from "@/server/repositories/pod-item-repository";
import { createChannelService } from "@/server/services/groups/channel-service";
import { createGroupService } from "@/server/services/groups/group-service";
import { createMaterialService } from "@/server/services/groups/material-service";
import { createMemoryStorage } from "@/server/storage/memory";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-11T04:30:00Z");
const { storage } = createMemoryStorage();
let space = 10_000_000;
const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  ownerLimit: async () => 100,
  clock,
  limit: () => 10,
  newCode: () => crypto.randomUUID().slice(0, 8),
});
const material = createMaterialService({
  groups,
  channels: createChannelService({
    groups,
    channels: channelRepository,
    clock,
    ownerLimit: async () => 50,
    examSubjects: async () => [],
  }),
  items: groupItemRepository,
  podItems: podItemRepository,
  storage,
  clock,
  newId: () => crypto.randomUUID(),
  ownerStorageLimit: async () => space,
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

/** A note in the user's own pod with one image in it. */
async function noteWithImage(ownerId: string) {
  const pod = await prisma.pod.create({
    data: { ownerId, kind: "CUSTOM", name: "History" },
  });
  const fileId = crypto.randomUUID();
  const storageKey = `pods/${ownerId}/${fileId}`;
  await storage.put(storageKey, new Uint8Array([1, 2, 3, 4]), "image/png");
  const item = await prisma.podItem.create({
    data: {
      podId: pod.id,
      ownerId,
      type: "NOTE",
      title: "Renaissance notes",
      noteText: "Sree Narayana Guru",
      noteJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Sree Narayana Guru" }],
          },
          {
            type: "image",
            attrs: { src: `/api/pods/files/${fileId}`, alt: "map" },
          },
        ],
      },
    },
  });
  await prisma.podFile.create({
    data: {
      id: fileId,
      itemId: item.id,
      ownerId,
      storageKey,
      mimeType: "image/png",
      sizeBytes: 4,
      sha256: "x",
    },
  });
  return item.id;
}

async function groupWith(
  owner: Awaited<ReturnType<typeof user>>,
  ...members: Awaited<ReturnType<typeof user>>[]
) {
  const g = (await groups.create(owner, {
    name: "Study circle",
    description: null,
    examId: null,
    visibility: "PUBLIC",
  })) as { groupId: string };
  for (const m of members) await groups.join(m, g.groupId);
  return g.groupId;
}

beforeEach(async () => {
  await resetDatabase();
  space = 10_000_000;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("group material", () => {
  it("shares a note as a copy, its image copied and re-pointed, for members only", async () => {
    const owner = await user("Owner");
    const anu = await user("Anu");
    const stranger = await user("Stranger");
    const groupId = await groupWith(owner, anu);
    const podItemId = await noteWithImage(anu.id);

    const shared = await material.shareFromPod(anu, groupId, podItemId);
    expect(shared).toMatchObject({ ok: true });
    const itemId = (shared as { itemId: string }).itemId;

    const seen = (await material.get(owner, groupId, itemId))!;
    expect(seen.item).toMatchObject({
      title: "Renaissance notes",
      subjectName: "History",
      sizeBytes: 4,
    });
    const image = (
      seen.item.noteJson as { content: { attrs?: { src: string } }[] }
    ).content[1]!;
    const copyId = image.attrs!.src.split("/").pop()!;
    expect(image.attrs!.src).toBe(`/api/groups/files/${copyId}`);
    expect(seen.item.files.map((f) => f.id)).toEqual([copyId]);

    expect(await material.fileUrl(owner, copyId)).toBeTruthy();
    expect(await material.fileUrl(stranger, copyId)).toBeNull();
    expect(await material.list(stranger, groupId)).toBeNull();
    // Someone else's pod item can't be shared.
    expect(
      await material.shareFromPod(owner, groupId, podItemId),
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("counts storage against the owner's plan, and muted members can't share", async () => {
    const owner = await user("Owner");
    const anu = await user("Anu");
    const groupId = await groupWith(owner, anu);
    space = 2;
    expect(
      await material.shareFromPod(anu, groupId, await noteWithImage(anu.id)),
    ).toMatchObject({ ok: false, code: "STORAGE" });
    // Links take no space.
    expect(
      await material.addLink(anu, groupId, {
        url: "https://93.184.216.34/notes",
        title: "Notes",
        subjectName: null,
        topicName: null,
      }),
    ).toMatchObject({ ok: true });

    await groups.manage(owner, groupId, anu.id, { kind: "mute", hours: 24 });
    expect(
      await material.addLink(anu, groupId, {
        url: "https://93.184.216.34/x",
        title: null,
        subjectName: null,
        topicName: null,
      }),
    ).toMatchObject({
      ok: false,
      code: "MUTED",
    });
  });

  it("hides blocked people's material, and lets the sharer or an admin remove it", async () => {
    const owner = await user("Owner");
    const anu = await user("Anu");
    const binu = await user("Binu");
    const groupId = await groupWith(owner, anu, binu);
    const link = (await material.addLink(anu, groupId, {
      url: "https://93.184.216.34/a",
      title: "A",
      subjectName: null,
      topicName: null,
    })) as { itemId: string };

    await groups.block(binu, anu.id, true);
    expect((await material.list(binu, groupId))!).toHaveLength(0);
    expect((await material.list(owner, groupId))!).toHaveLength(1);

    expect(await material.remove(binu, groupId, link.itemId)).toMatchObject({
      ok: false,
    });
    expect(await material.remove(owner, groupId, link.itemId)).toEqual({
      ok: true,
    });
    expect((await material.list(owner, groupId))!).toHaveLength(0);
  });
});
