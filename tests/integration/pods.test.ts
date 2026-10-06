import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import type { EditableTree } from "@/lib/syllabus/tree";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { podRepository } from "@/server/repositories/pod-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import { topicCompletionRepository } from "@/server/repositories/topic-completion-repository";
import { createPodService } from "@/server/services/pods/pod-service";

import { resetDatabase } from "./helpers";

const pods = createPodService({
  pods: podRepository,
  syllabuses: syllabusRepository,
  completions: topicCompletionRepository,
  clock: fixedClock("2026-10-06T04:30:00Z"),
});

const id = () => crypto.randomUUID();
const topic = (name: string) => ({
  id: id(),
  name,
  weight: 3,
  difficulty: 3,
  foundational: false,
});

async function makeUser(email = "anu@example.com") {
  const u = await prisma.user.create({
    data: { email, passwordHash: "x", name: "Anu", displayName: "Anu" },
  });
  return { id: u.id };
}

/** A syllabus the user uploaded and confirmed, with two subjects. */
async function confirmedSyllabus(ownerId: string) {
  const version = await prisma.syllabusVersion.create({
    data: { title: "LDC", ownerId, sourceKind: "TEXT", fileHash: id() },
  });
  const tree: EditableTree = {
    subjects: [
      {
        id: id(),
        name: "History",
        topics: [topic("Kerala renaissance"), topic("Freedom struggle")],
      },
      { id: id(), name: "English", topics: [topic("Tenses")] },
    ],
  };
  await syllabusRepository.approvePrivate(version.id, tree, new Date());
  return { versionId: version.id, tree };
}

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("subject pods", () => {
  it("gives every subject of a confirmed syllabus a pod, and only once", async () => {
    const user = await makeUser();
    const { versionId } = await confirmedSyllabus(user.id);
    expect(await pods.syncFromSyllabus(user, versionId)).toEqual({ ok: true });
    expect(await pods.syncFromSyllabus(user, versionId)).toEqual({ ok: true });
    const list = await pods.list(user);
    expect(list.map((p) => [p.name, p.kind, p.topics.length])).toEqual([
      ["History", "SUBJECT", 2],
      ["English", "SUBJECT", 1],
    ]);
  });

  it("groups subject pods into an exam pod per syllabus, with totals", async () => {
    const user = await makeUser();
    const other = await makeUser("b@example.com");
    const { versionId, tree } = await confirmedSyllabus(user.id);
    await pods.syncFromSyllabus(user, versionId);
    await pods.createCustom(user, "Old papers");
    const history = (await pods.list(user)).find((p) => p.name === "History")!;
    await pods.setTopicDone(
      user,
      history.id,
      tree.subjects[0]!.topics[0]!.id,
      true,
    );

    const { exams, own } = await pods.exams(user);
    expect(own.map((p) => p.name)).toEqual(["Old papers"]);
    expect(exams).toHaveLength(1);
    expect(exams[0]).toMatchObject({
      id: versionId,
      title: "LDC",
      topics: 3,
      topicsDone: 1,
    });
    expect(exams[0]!.pods.map((p) => p.name)).toEqual(["History", "English"]);

    expect(await pods.exam(user, versionId)).toMatchObject({ editable: true });
    expect(await pods.exam(other, versionId)).toBeNull();
  });

  it("refuses a syllabus that isn't confirmed or isn't the user's", async () => {
    const owner = await makeUser("a@example.com");
    const other = await makeUser("b@example.com");
    const draft = await prisma.syllabusVersion.create({
      data: { title: "Draft", ownerId: owner.id, sourceKind: "TEXT" },
    });
    expect(await pods.syncFromSyllabus(owner, draft.id)).toMatchObject({
      ok: false,
    });
    const { versionId } = await confirmedSyllabus(owner.id);
    expect(await pods.syncFromSyllabus(other, versionId)).toMatchObject({
      ok: false,
    });
  });

  it("follows syllabus edits without losing ids, ticks or material", async () => {
    const user = await makeUser();
    const { versionId, tree } = await confirmedSyllabus(user.id);
    await pods.syncFromSyllabus(user, versionId);
    const [history] = await pods.list(user);
    const renaissance = tree.subjects[0].topics[0];
    await pods.setTopicDone(user, history.id, renaissance.id, true);
    const item = await prisma.podItem.create({
      data: {
        podId: history.id,
        ownerId: user.id,
        type: "NOTE",
        title: "My notes",
      },
    });
    await prisma.podItemTopic.create({
      data: { itemId: item.id, topicId: renaissance.id },
    });

    // Rename History, add a subject, remove English: saved in place, ids kept.
    const edited: EditableTree = {
      subjects: [
        { ...tree.subjects[0], name: "Kerala history" },
        { id: id(), name: "Geography", topics: [topic("Rivers")] },
      ],
    };
    await syllabusRepository.replaceTree(versionId, edited);
    await pods.syncFromSyllabus(user, versionId);

    const list = await pods.list(user);
    expect(list.map((p) => [p.name, p.kind])).toEqual([
      ["Kerala history", "SUBJECT"],
      ["Geography", "SUBJECT"],
    ]);
    const kept = await pods.get(user, history.id);
    expect(kept?.topics.find((t) => t.id === renaissance.id)).toMatchObject({
      done: true,
      items: 1,
    });
  });

  it("keeps a removed subject's pod, as the user's own, when it has material", async () => {
    const user = await makeUser();
    const { versionId, tree } = await confirmedSyllabus(user.id);
    await pods.syncFromSyllabus(user, versionId);
    const english = (await pods.list(user)).find((p) => p.name === "English")!;
    await prisma.podItem.create({
      data: {
        podId: english.id,
        ownerId: user.id,
        type: "LINK",
        title: "Grammar site",
      },
    });
    await syllabusRepository.replaceTree(versionId, {
      subjects: [tree.subjects[0]],
    });
    await pods.syncFromSyllabus(user, versionId);
    const kept = (await pods.list(user)).find((p) => p.id === english.id);
    expect(kept).toMatchObject({ kind: "CUSTOM", items: 1 });
  });

  it("logs every tick and untick, the latest one winning (rule 6)", async () => {
    const user = await makeUser();
    const { versionId, tree } = await confirmedSyllabus(user.id);
    await pods.syncFromSyllabus(user, versionId);
    const [history] = await pods.list(user);
    const t = tree.subjects[0].topics[1];
    await pods.setTopicDone(user, history.id, t.id, true);
    await pods.setTopicDone(user, history.id, t.id, false);
    await pods.setTopicDone(user, history.id, t.id, true);
    expect((await pods.list(user))[0].topicsDone).toBe(1);
    expect(await prisma.topicCompletion.count()).toBe(3);
    await expect(prisma.topicCompletion.deleteMany()).rejects.toThrow(
      /append-only/,
    );
  });

  it("only ticks topics of the user's own pod", async () => {
    const owner = await makeUser("a@example.com");
    const other = await makeUser("b@example.com");
    const { versionId, tree } = await confirmedSyllabus(owner.id);
    await pods.syncFromSyllabus(owner, versionId);
    const [history] = await pods.list(owner);
    const t = tree.subjects[0].topics[0];
    expect(
      await pods.setTopicDone(other, history.id, t.id, true),
    ).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
    const english = tree.subjects[1].topics[0];
    expect(
      await pods.setTopicDone(owner, history.id, english.id, true),
    ).toMatchObject({
      ok: false,
    });
  });

  it("lets anyone adopt an approved catalogue syllabus as their pods", async () => {
    const user = await makeUser();
    const version = await prisma.syllabusVersion.create({
      data: {
        title: "LDC catalogue",
        visibility: "CATALOGUE",
        status: "APPROVED",
      },
    });
    await syllabusRepository.replaceTree(version.id, {
      subjects: [{ id: id(), name: "History", topics: [topic("Kerala")] }],
    });
    expect(await pods.syncFromSyllabus(user, version.id)).toEqual({ ok: true });
    expect((await pods.list(user)).map((p) => p.name)).toEqual(["History"]);
  });

  it("makes, renames and deletes the user's own pods, never subject pods", async () => {
    const user = await makeUser();
    const created = await pods.createCustom(user, "Previous papers");
    expect(await pods.rename(user, created.podId, "PYQs")).toEqual({
      ok: true,
    });
    expect((await pods.list(user)).map((p) => p.name)).toEqual(["PYQs"]);
    expect(await pods.remove(user, created.podId)).toEqual({ ok: true });
    expect(await pods.list(user)).toEqual([]);

    const { versionId } = await confirmedSyllabus(user.id);
    await pods.syncFromSyllabus(user, versionId);
    const [history] = await pods.list(user);
    expect(await pods.remove(user, history.id)).toMatchObject({
      code: "SUBJECT_POD",
    });
  });
});
