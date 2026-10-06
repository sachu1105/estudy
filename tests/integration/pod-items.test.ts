import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import type { EditableTree } from "@/lib/syllabus/tree";
import { prisma } from "@/server/db";
import { createEntitlements } from "@/server/entitlements/resolve";
import type { PodJob } from "@/server/queue/types";
import { redis } from "@/server/redis";
import { podFileRepository } from "@/server/repositories/pod-file-repository";
import { podItemRepository } from "@/server/repositories/pod-item-repository";
import { podRepository } from "@/server/repositories/pod-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { createFileService } from "@/server/services/pods/file-service";
import { createItemService } from "@/server/services/pods/item-service";
import { readPdf } from "@/server/services/pods/read-pdf";
import { createMemoryStorage } from "@/server/storage/memory";

import { makePdf, sampleSyllabus } from "../support/pdf";

import { resetDatabase } from "./helpers";

const id = () => crypto.randomUUID();
const topic = (name: string) => ({
  id: id(),
  name,
  weight: 3,
  difficulty: 3,
  foundational: false,
});

function build({ billingEnabled = false } = {}) {
  const clock = fixedClock("2026-10-06T04:30:00Z");
  const { storage, objects } = createMemoryStorage();
  const jobs: PodJob[] = [];
  const queue = { enqueue: async (job: PodJob) => void jobs.push(job) };
  const { limit } = createEntitlements({ billingEnabled, clock });
  const items = createItemService({
    items: podItemRepository,
    pods: podRepository,
    queue,
    storage,
    clock,
    fetchLinkMeta: async (url) => ({
      title: "Kerala PSC notes",
      description: "Free notes",
      faviconUrl: null,
      finalUrl: url,
    }),
  });
  const files = createFileService({
    files: podFileRepository,
    items: podItemRepository,
    pods: podRepository,
    storage,
    queue,
    clock,
    ids: randomIds,
    limit,
    readPdf,
  });
  return { clock, objects, jobs, items, files };
}

async function userWithPod(email = "anu@example.com") {
  const u = await prisma.user.create({
    data: {
      email,
      passwordHash: "x",
      name: "Anu",
      displayName: "Anu",
      subscriptions: { create: { plan: "FREE" } },
    },
  });
  const user = {
    id: u.id,
    subscription: {
      plan: "FREE" as const,
      status: "ACTIVE" as const,
      periodEnd: null,
    },
  };
  const version = await prisma.syllabusVersion.create({
    data: { title: "LDC", ownerId: u.id, sourceKind: "TEXT" },
  });
  const tree: EditableTree = {
    subjects: [
      {
        id: id(),
        name: "History",
        topics: [topic("Kerala renaissance"), topic("Freedom struggle")],
      },
    ],
  };
  await syllabusRepository.approvePrivate(version.id, tree, new Date());
  await podRepository.syncSubjectPods(u.id, version.id);
  const pod = (await podRepository.listOwned(u.id))[0];
  return { user, pod, topics: tree.subjects[0].topics };
}

/** What the browser does: get a presigned PUT, then send the bytes. */
async function upload(
  t: ReturnType<typeof build>,
  user: { id: string },
  bytes: Uint8Array,
  type: string,
) {
  const signed = await t.files.requestUploads(user as never, [
    { contentType: type, size: bytes.byteLength },
  ]);
  if (!signed.ok) throw new Error(signed.message);
  t.objects.set(signed.uploads[0].key, { body: bytes, contentType: type });
  return signed.uploads[0].key;
}

const PNG = new Uint8Array([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
  ...new Array(64).fill(7),
]);

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("notes and links", () => {
  it("saves a cleaned note, indexes its words and finds them, Malayalam included", async () => {
    const t = build();
    const { user, pod, topics } = await userWithPod();
    const note = await t.items.addNote(user, {
      podId: pod.id,
      title: "Renaissance",
      topicIds: [topics[0].id],
    });
    if (!note.ok) throw new Error("note");
    await t.items.saveNote(user, {
      itemId: note.itemId,
      title: "Renaissance",
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Sree Narayana Guru, ശ്രീനാരായണഗുരു" },
            ],
          },
          { type: "image", attrs: { src: "https://evil.example/x.png" } },
        ],
      },
    });
    const saved = await prisma.podItem.findUniqueOrThrow({
      where: { id: note.itemId },
    });
    expect(JSON.stringify(saved.noteJson)).not.toContain("evil.example");
    expect(saved.noteText).toContain("Narayana");

    expect(
      (await t.items.search(user, "naray")).items.map((i) => i.id),
    ).toEqual([note.itemId]);
    expect((await t.items.search(user, "ശ്രീനാരായണ")).items).toHaveLength(1);
    expect((await t.items.search(user, "renaissance")).topics[0].name).toBe(
      "Kerala renaissance",
    );
    expect(
      (await t.items.listForTopic(user, topics[0].id)).map((i) => i.id),
    ).toEqual([note.itemId]);
  });

  it("only maps topics of the item's own pod", async () => {
    const t = build();
    const { user, pod, topics } = await userWithPod();
    const note = await t.items.addNote(user, {
      podId: pod.id,
      title: "x",
      topicIds: [id()],
    });
    if (!note.ok) throw new Error("note");
    await t.items.setTopics(user, note.itemId, [topics[1].id, id()]);
    const item = await t.items.get(user, note.itemId);
    expect(item!.topics.map((x) => x.topicId)).toEqual([topics[1].id]);
  });

  it("adds a public link, fetches its preview in the background, refuses private ones", async () => {
    const t = build();
    const { user, pod } = await userWithPod();
    expect(
      await t.items.addLink(user, {
        podId: pod.id,
        url: "http://192.168.1.1/admin",
        topicIds: [],
      }),
    ).toMatchObject({
      ok: false,
      code: "BAD_URL",
    });
    const added = await t.items.addLink(user, {
      podId: pod.id,
      url: "https://93.184.216.34/notes",
      topicIds: [],
    });
    if (!added.ok) throw new Error(added.message);
    expect(t.jobs).toEqual([{ kind: "link-meta", itemId: added.itemId }]);
    await t.items.fetchLinkPreview(added.itemId);
    const item = await t.items.get(user, added.itemId);
    expect(item).toMatchObject({
      title: "Kerala PSC notes",
      linkDescription: "Free notes",
      status: "DONE",
    });
  });

  it("never touches another user's pod or item", async () => {
    const t = build();
    const a = await userWithPod("a@example.com");
    const b = await userWithPod("b@example.com");
    expect(
      await t.items.addNote(b.user, {
        podId: a.pod.id,
        title: "x",
        topicIds: [],
      }),
    ).toMatchObject({ ok: false });
    const note = await t.items.addNote(a.user, {
      podId: a.pod.id,
      title: "x",
      topicIds: [],
    });
    if (!note.ok) throw new Error("note");
    expect(await t.items.trash(b.user, note.itemId)).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
    expect((await t.items.search(b.user, "x")).items).toEqual([]);
  });
});

describe("files and photos", () => {
  it("turns a PDF into an item and reads its text in the background", async () => {
    const t = build();
    const { user, pod } = await userWithPod();
    const key = await upload(
      t,
      user,
      makePdf(sampleSyllabus),
      "application/pdf",
    );
    const done = await t.files.completeUploads(user, {
      podId: pod.id,
      keys: [{ key, name: "ldc-notes.pdf" }],
      asDocument: false,
      title: null,
      topicIds: [],
    });
    if (!done.ok) throw new Error(done.message);
    expect(t.jobs).toEqual([{ kind: "extract-file", itemId: done.itemIds[0] }]);
    await t.files.extractFileText(done.itemIds[0]);
    const item = await t.items.get(user, done.itemIds[0]);
    expect(item).toMatchObject({
      type: "FILE",
      title: "ldc-notes",
      pageCount: 1,
      status: "DONE",
    });
    expect((await t.items.search(user, "tenses")).items).toHaveLength(1);
  });

  it("saves several photos as one document, in order", async () => {
    const t = build();
    const { user, pod, topics } = await userWithPod();
    const keys = [
      await upload(t, user, PNG, "image/png"),
      await upload(t, user, PNG, "image/png"),
    ];
    const done = await t.files.completeUploads(user, {
      podId: pod.id,
      keys: keys.map((key, i) => ({ key, name: `IMG_${i}.png` })),
      asDocument: true,
      title: "Notebook pages",
      topicIds: [topics[0].id],
    });
    if (!done.ok) throw new Error(done.message);
    expect(done.itemIds).toHaveLength(1);
    const item = await t.items.get(user, done.itemIds[0]);
    expect(item).toMatchObject({
      type: "IMAGE",
      title: "Notebook pages",
      pageCount: 2,
    });
    expect(item!.files.map((f) => f.storageKey)).toEqual(keys);
  });

  it("rejects bytes that aren't a PDF or photo, and deletes them", async () => {
    const t = build();
    const { user, pod } = await userWithPod();
    const html = new TextEncoder().encode("<svg onload=alert(1)>");
    const key = await upload(t, user, html, "image/png");
    const done = await t.files.completeUploads(user, {
      podId: pod.id,
      keys: [{ key, name: "x.png" }],
      asDocument: false,
      title: null,
      topicIds: [],
    });
    expect(done).toMatchObject({ ok: false, code: "UNSUPPORTED" });
    expect(t.objects.has(key)).toBe(false);
  });

  it("enforces the plan's storage when billing is on (FREE: 200 MB)", async () => {
    const t = build({ billingEnabled: true });
    const { user } = await userWithPod();
    const big = await t.files.requestUploads(user as never, [
      { contentType: "application/pdf", size: 20 * 1024 * 1024 },
      ...Array.from({ length: 9 }, () => ({
        contentType: "application/pdf",
        size: 20 * 1024 * 1024,
      })),
      { contentType: "application/pdf", size: 1024 },
    ]);
    expect(big).toMatchObject({ ok: false, code: "STORAGE_FULL" });
  });

  it("lets only the owner view a file, through a short-lived link", async () => {
    const t = build();
    const a = await userWithPod("a@example.com");
    const b = await userWithPod("b@example.com");
    const key = await upload(t, a.user, PNG, "image/png");
    const done = await t.files.completeUploads(a.user, {
      podId: a.pod.id,
      keys: [{ key, name: "p.png" }],
      asDocument: false,
      title: null,
      topicIds: [],
    });
    if (!done.ok) throw new Error(done.message);
    const file = (await t.items.get(a.user, done.itemIds[0]))!.files[0];
    expect(await t.files.viewUrl(a.user, file.id)).toBe(
      `memory://download/${key}`,
    );
    expect(await t.files.viewUrl(b.user, file.id)).toBeNull();
  });

  it("places an image in a note and serves it from the pod file route", async () => {
    const t = build();
    const { user, pod } = await userWithPod();
    const note = await t.items.addNote(user, {
      podId: pod.id,
      title: "x",
      topicIds: [],
    });
    if (!note.ok) throw new Error("note");
    const key = await upload(t, user, PNG, "image/png");
    const placed = await t.files.attachToNote(user, {
      itemId: note.itemId,
      key,
    });
    expect(placed).toMatchObject({
      ok: true,
      src: expect.stringMatching(/^\/api\/pods\/files\/[0-9a-f-]{36}$/),
    });
  });
});

describe("trash", () => {
  it("restores within 30 days and purges after, files included", async () => {
    const t = build();
    const { user, pod } = await userWithPod();
    const key = await upload(t, user, PNG, "image/png");
    const done = await t.files.completeUploads(user, {
      podId: pod.id,
      keys: [{ key, name: "p.png" }],
      asDocument: false,
      title: null,
      topicIds: [],
    });
    if (!done.ok) throw new Error(done.message);
    const itemId = done.itemIds[0];
    await t.items.trash(user, itemId);
    expect(await t.items.list(user, pod.id)).toEqual([]);
    expect(await t.items.restore(user, itemId)).toEqual({ ok: true });
    expect(await t.items.list(user, pod.id)).toHaveLength(1);

    await t.items.trash(user, itemId);
    expect(await t.items.purgeTrash()).toBe(0); // not 30 days yet
    t.clock.advance(31 * 86_400_000);
    expect(await t.items.purgeTrash()).toBe(1);
    expect(t.objects.has(key)).toBe(false);
    expect(await prisma.podItem.count()).toBe(0);
  });
});
