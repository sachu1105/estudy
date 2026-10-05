import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { randomIds } from "@/lib/ids";
import type { AIProvider, AiRequest } from "@/server/ai/types";
import { prisma } from "@/server/db";
import { createEntitlements } from "@/server/entitlements/resolve";
import type { ParseJobData } from "@/server/queue/types";
import type { JobEvent } from "@/server/realtime/types";
import { redis } from "@/server/redis";
import { aiUsageRepository } from "@/server/repositories/ai-usage-repository";
import { catalogueRepository } from "@/server/repositories/catalogue-repository";
import { parseJobRepository } from "@/server/repositories/parse-job-repository";
import { sectionCacheRepository } from "@/server/repositories/section-cache-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import type { SyllabusDeps } from "@/server/services/syllabus/deps";
import { unavailableOcr } from "@/server/services/syllabus/extract";
import { createParseService } from "@/server/services/syllabus/parse-service";
import { createReviewService } from "@/server/services/syllabus/review-service";
import { createUploadService } from "@/server/services/syllabus/upload-service";
import { createMemoryStorage } from "@/server/storage/memory";

import { makePdf, sampleSyllabus } from "../support/pdf";

import { resetDatabase } from "./helpers";

/**
 * Behaves like a well-mannered model: one subject named after the section heading, with
 * every comma-separated item of the section as a topic. Scripted replies come first.
 */
function echoReply(prompt: string) {
  const heading = /Section heading: (.+)/.exec(prompt)?.[1] ?? "Syllabus";
  const text = /<<<\n([\s\S]*?)\n>>>/.exec(prompt)?.[1] ?? "";
  const items = text
    .split(/[,\n]/)
    .map((s) => s.replace(/^[^:]*:\s*/, "").trim())
    .filter(Boolean);
  return JSON.stringify({
    subjects: [
      {
        name: heading,
        part: null,
        partMarks: null,
        topics: items.map((name) => ({
          name,
          weight: 3,
          difficulty: 3,
          foundational: false,
        })),
      },
    ],
  });
}

function fakeAi(...replies: string[]) {
  const ai: AIProvider & { calls: number; prompts: AiRequest[] } = {
    name: "fake",
    model: "scripted",
    readsDocuments: false,
    calls: 0,
    prompts: [],
    async generate(request) {
      ai.calls++;
      ai.prompts.push(request);
      return {
        text: replies.shift() ?? echoReply(request.prompt),
        inputTokens: 100,
        outputTokens: 50,
        costMicros: 0,
        durationMs: 5,
      };
    },
  };
  return ai;
}

const SUBJECTS = [
  "General Knowledge",
  "Simple Arithmetic and Mental Ability",
  "General English",
];

/** A model that reads pages: answers the whole syllabus in one reply. */
function pagesAi() {
  const ai = fakeAi();
  const reply = JSON.stringify({
    subjects: SUBJECTS.map((name, i) => ({
      name,
      part: name,
      partMarks: [50, 20, 10][i],
      topics: [
        {
          name: `${name} topic`,
          weight: 3,
          difficulty: 3,
          foundational: false,
        },
      ],
    })),
  });
  return Object.assign(ai, {
    readsDocuments: true,
    async generate(request: AiRequest) {
      ai.calls++;
      ai.prompts.push(request);
      return {
        text: reply,
        inputTokens: 900,
        outputTokens: 300,
        costMicros: 12,
        durationMs: 5,
      };
    },
  });
}

function build({ billingEnabled = false, ai = fakeAi() } = {}) {
  const { storage, objects } = createMemoryStorage();
  const queued: ParseJobData[] = [];
  const events: JobEvent[] = [];
  const clock = fixedClock("2026-10-05T04:30:00Z");
  const deps: SyllabusDeps = {
    syllabuses: syllabusRepository,
    parseJobs: parseJobRepository,
    catalogue: catalogueRepository,
    aiUsage: aiUsageRepository,
    sectionCache: sectionCacheRepository,
    storage,
    queue: { enqueue: async (data) => void queued.push(data) },
    publisher: { publish: async (_c, e) => void events.push(e as JobEvent) },
    entitlements: createEntitlements({ billingEnabled, clock }),
    clock,
    ids: randomIds,
    readsDocuments: ai.readsDocuments,
  };
  const parser = createParseService({ ...deps, ai, ocr: unavailableOcr });
  return {
    objects,
    queued,
    events,
    ai,
    upload: createUploadService(deps),
    review: createReviewService(deps),
    /** Runs every queued job, like the worker would. */
    async drain() {
      while (queued.length)
        await parser.run(queued.shift()!.parseJobId, {
          attempt: 1,
          maxAttempts: 3,
        });
    },
  };
}

async function makeUser(email = "anu@example.com") {
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: "x",
      name: "Anu",
      displayName: "Anu",
      subscriptions: { create: { plan: "FREE" } },
    },
  });
  return {
    id: user.id,
    subscription: {
      plan: "FREE" as const,
      status: "ACTIVE" as const,
      periodEnd: null,
    },
  };
}

/** Simulates the browser's presigned PUT, then completes the upload. */
async function uploadPdf(
  t: ReturnType<typeof build>,
  user: { id: string },
  pdf = makePdf(sampleSyllabus),
) {
  const signed = await t.upload.requestUpload(user as never, {
    contentType: "application/pdf",
    size: pdf.byteLength,
  });
  if (!signed.ok) throw new Error(signed.message);
  t.objects.set(signed.key, { body: pdf, contentType: "application/pdf" });
  return t.upload.completeUpload(user as never, {
    key: signed.key,
    title: "LDC 2026",
    examId: null,
    sourceName: "ldc.pdf",
  });
}

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("syllabus upload and parse", () => {
  it("parses a PDF into a private DRAFT, logging AI usage and job stages", async () => {
    const t = build();
    const user = await makeUser();
    const result = await uploadPdf(t, user);
    expect(result).toMatchObject({ ok: true, reused: false });
    await t.drain();

    const version = await syllabusRepository.findOwned(
      (result as { versionId: string }).versionId,
      user.id,
    );
    expect(version).toMatchObject({
      status: "DRAFT",
      visibility: "PRIVATE",
      sourceKind: "PDF",
    });
    expect(
      version!.subjects.map((s) => [s.name, s.topics.map((x) => x.name)]),
    ).toEqual([
      [
        "General Knowledge",
        [
          "Kerala renaissance",
          "freedom struggle",
          "social reformers",
          "Rivers of Kerala",
          "climate",
          "soils",
        ],
      ],
      [
        "Simple Arithmetic and Mental Ability",
        ["Number system", "fractions", "percentage", "ratio and proportion"],
      ],
      [
        "General English",
        ["Parts of speech", "tenses", "synonyms and antonyms"],
      ],
    ]);
    // Weights from the marks around the typical topic (Arithmetic, 20 over 4): 4, 3, 2.
    expect(version!.subjects.map((s) => s.topics[0].weight)).toEqual([4, 3, 2]);
    expect(version!.parse?.extractedText).toContain(
      "General Knowledge (50 marks)",
    );
    expect(version!.parseJobs[0]).toMatchObject({
      status: "READY",
      stage: "READY",
      progress: 100,
      attempts: 1,
    });
    // One progress update per section after the stage change.
    expect(t.events.map((e) => [e.stage, e.progress])).toEqual([
      ["QUEUED", 0],
      ["READING", 0],
      ["STRUCTURING", 5],
      ["STRUCTURING", 35],
      ["STRUCTURING", 65],
      ["STRUCTURING", 95],
      ["READY", 100],
    ]);
    expect(
      await prisma.aiUsage.count({ where: { userId: user.id, ok: true } }),
    ).toBe(3);
  });

  it("parses an identical file once, ever: the second upload links instantly (rule 4)", async () => {
    const t = build();
    const first = await makeUser("a@example.com");
    const second = await makeUser("b@example.com");
    await uploadPdf(t, first);
    await t.drain();

    const again = await uploadPdf(t, second);
    expect(again).toMatchObject({ ok: true, reused: true });
    expect(t.queued).toHaveLength(0);
    expect(t.ai.calls).toBe(3); // the first upload's three sections, nothing more
    expect(await prisma.syllabusParse.count()).toBe(1);

    // Each user owns a separate copy: editing one never touches the other.
    const mine = await syllabusRepository.findOwned(
      (again as { versionId: string }).versionId,
      second.id,
    );
    expect(mine!.subjects.map((s) => s.name)).toEqual(SUBJECTS);
    expect(await syllabusRepository.findOwned(mine!.id, first.id)).toBeNull();
  });

  it("retries invalid AI output once, then fails the job with a clear message", async () => {
    const t = build({ ai: fakeAi("garbage", '{"subjects": 5}') });
    const user = await makeUser();
    const result = await uploadPdf(t, user);
    await t.drain();
    const job = await prisma.parseJob.findFirstOrThrow({
      where: { syllabusVersionId: (result as { versionId: string }).versionId },
    });
    expect(job).toMatchObject({ status: "FAILED", stage: "FAILED" });
    expect(job.error).toMatch(/couldn't turn this syllabus/);
    expect(await prisma.subject.count()).toBe(0);
    expect(await prisma.aiUsage.count({ where: { ok: false } })).toBe(2);
  });

  it("rejects a file whose bytes aren't what was declared, and deletes it", async () => {
    const t = build();
    const user = await makeUser();
    const html = new TextEncoder().encode(
      "<!doctype html><script>alert(1)</script>",
    );
    const signed = await t.upload.requestUpload(user as never, {
      contentType: "application/pdf",
      size: html.byteLength,
    });
    if (!signed.ok) throw new Error("sign failed");
    t.objects.set(signed.key, { body: html, contentType: "application/pdf" });
    const result = await t.upload.completeUpload(user as never, {
      key: signed.key,
      title: "x",
      examId: null,
      sourceName: null,
    });
    expect(result).toMatchObject({ ok: false, code: "UNSUPPORTED" });
    expect(t.objects.has(signed.key)).toBe(false);
  });

  it("won't complete another user's upload key", async () => {
    const t = build();
    const owner = await makeUser("a@example.com");
    const other = await makeUser("b@example.com");
    const pdf = makePdf(sampleSyllabus);
    const signed = await t.upload.requestUpload(owner as never, {
      contentType: "application/pdf",
      size: pdf.byteLength,
    });
    if (!signed.ok) throw new Error("sign failed");
    t.objects.set(signed.key, { body: pdf, contentType: "application/pdf" });
    const result = await t.upload.completeUpload(other as never, {
      key: signed.key,
      title: "x",
      examId: null,
      sourceName: null,
    });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("enforces limit(user, 'syllabusUploads') when billing is on", async () => {
    const t = build({ billingEnabled: true });
    const user = await makeUser();
    expect(await uploadPdf(t, user)).toMatchObject({ ok: true });
    const signed = await t.upload.requestUpload(user as never, {
      contentType: "application/pdf",
      size: 1000,
    });
    expect(signed).toMatchObject({ ok: false, code: "LIMIT" });
    const text = await t.upload.submitText(user as never, {
      title: "x",
      examId: null,
      text: sampleSyllabus.join("\n"),
    });
    expect(text).toMatchObject({ ok: false, code: "LIMIT" });
  });
});

describe("parse caches", () => {
  const ldcText = readFileSync(
    join(process.cwd(), "fixtures/syllabus/degree-level-ldc.txt"),
    "utf8",
  );
  const submit = (
    t: ReturnType<typeof build>,
    user: { id: string },
    text: string,
  ) => t.upload.submitText(user as never, { title: "LDC", examId: null, text });

  it("reuses a near-identical syllabus for another post with no AI call", async () => {
    const t = build();
    const first = await makeUser("a@example.com");
    const second = await makeUser("b@example.com");
    await submit(t, first, ldcText);
    await t.drain();
    const calls = t.ai.calls;
    expect(calls).toBeGreaterThan(0);

    // Same detailed syllabus, another post in the heading, one line reworded.
    const otherPost = ldcText
      .replace("LD CLERK [KWA]", "ASSISTANT GRADE II")
      .replace("Foreign policy.", "Foreign policy and treaties.");
    const created = await submit(t, second, otherPost);
    await t.drain();
    expect(t.ai.calls).toBe(calls);
    const job = await prisma.parseJob.findFirstOrThrow({
      where: {
        syllabusVersionId: (created as { versionId: string }).versionId,
      },
    });
    expect(job).toMatchObject({ status: "READY", reused: true });
    const copy = await prisma.syllabusParse.findFirstOrThrow({
      where: { provider: "cache" },
    });
    expect(copy.copiedFromId).not.toBeNull();
    expect(copy.post).toMatch(/^ASSISTANT GRADE II/);
  });

  it("sends only the sections no earlier syllabus had", async () => {
    const t = build();
    const user = await makeUser();
    const shared =
      "Part II Simple Arithmetic (20 marks)\nNumbers, fractions, percentage, ratio, average";
    await submit(
      t,
      user,
      `Part I History (50 marks)\nKerala renaissance, freedom struggle\n${shared}`,
    );
    await t.drain();
    expect(t.ai.calls).toBe(2);

    await submit(
      t,
      user,
      `Part I Geography (40 marks)\nRivers of Kerala, climate, soils\n${shared}`,
    );
    await t.drain();
    expect(t.ai.calls).toBe(3); // Geography only; Simple Arithmetic came from the cache
    expect(t.ai.prompts.at(-1)?.prompt).toContain("Section heading: Geography");
  });

  it("sends the PDF itself to a model that reads pages, even a scan with no text", async () => {
    const ai = pagesAi();
    const t = build({ ai });
    const user = await makeUser();
    const created = await uploadPdf(t, user, makePdf([])); // a scan: no text layer
    await t.drain();
    expect(ai.calls).toBe(1);
    expect(ai.prompts[0].attachment).toMatchObject({
      kind: "pdf",
      mediaType: "application/pdf",
    });
    const version = await syllabusRepository.findOwned(
      (created as { versionId: string }).versionId,
      user.id,
    );
    expect(version!.subjects.map((s) => s.name)).toEqual(SUBJECTS);
    expect(version!.subjects.map((s) => s.topics[0].weight)).toEqual([4, 3, 2]); // 50, 20, 10 marks around the median 20;
    expect(version!.parse?.promptVersion).toBe("structure-document@1");
  });
});

describe("review", () => {
  it("saves edits to the draft and confirms it as the user's private APPROVED version", async () => {
    const t = build();
    const user = await makeUser();
    const created = await t.upload.submitText(user as never, {
      title: "LDC",
      examId: null,
      text: sampleSyllabus.join("\n"),
    });
    if (!created.ok) throw new Error(created.message);
    await t.drain();
    const draft = (await t.review.get(user as never, created.versionId))!;
    const tree = {
      subjects: draft.subjects.map((s) => ({
        id: s.id,
        name: s.name === "General Knowledge" ? "GK" : s.name,
        topics: s.topics.map((x) => ({
          id: x.id,
          name: x.name,
          weight: x.weight,
          difficulty: x.difficulty,
          foundational: x.foundational,
        })),
      })),
    };
    tree.subjects.reverse();

    expect(
      await t.review.saveDraft(user as never, created.versionId, tree),
    ).toEqual({ ok: true });
    expect(
      await t.review.confirm(user as never, created.versionId, tree),
    ).toEqual({ ok: true });
    const confirmed = (await t.review.get(user as never, created.versionId))!;
    expect(confirmed.status).toBe("APPROVED");
    expect(confirmed.visibility).toBe("PRIVATE");
    expect(confirmed.subjects.map((s) => s.name)).toEqual([
      "General English",
      "Simple Arithmetic and Mental Ability",
      "GK",
    ]);
    // Ids survive, so later milestones can point at topics.
    expect(confirmed.subjects[2].id).toBe(tree.subjects[2].id);

    // Topics stay editable inside the folders after confirming; confirming twice doesn't.
    expect(
      await t.review.saveDraft(user as never, created.versionId, tree),
    ).toEqual({ ok: true });
    expect(
      await t.review.confirm(user as never, created.versionId, tree),
    ).toMatchObject({ ok: false, code: "NOT_DRAFT" });
    // Nobody else can touch it.
    const stranger = await makeUser("c@example.com");
    expect(
      await t.review.saveDraft(stranger as never, created.versionId, tree),
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("reads a syllabus again once the parser has improved, and only then", async () => {
    const t = build();
    const user = await makeUser();
    const created = await uploadPdf(t, user);
    await t.drain();
    const versionId = (created as { versionId: string }).versionId;
    expect(await t.review.reread(user as never, versionId)).toMatchObject({
      ok: false,
      code: "UP_TO_DATE",
    });

    // Pretend an older parser read it.
    await prisma.syllabusParse.updateMany({
      data: { promptVersion: "structure-syllabus@1" },
    });
    expect(await t.review.reread(user as never, versionId)).toMatchObject({
      ok: true,
    });
    const reading = (await t.review.get(user as never, versionId))!;
    expect(reading).toMatchObject({ parseId: null, status: "DRAFT" });
    expect(reading.subjects).toHaveLength(0);

    await t.drain();
    const fresh = (await t.review.get(user as never, versionId))!;
    expect(fresh.subjects.map((s) => s.name)).toEqual(SUBJECTS);
    expect(await prisma.syllabusParse.count()).toBe(2); // old parse kept, new one added
  });

  it("retries a failed parse with a fresh job", async () => {
    const t = build({ ai: fakeAi("x", "y") });
    const user = await makeUser();
    const created = await uploadPdf(t, user);
    await t.drain();
    const versionId = (created as { versionId: string }).versionId;
    const retry = await t.review.retry(user as never, versionId);
    expect(retry).toMatchObject({ ok: true });
    await t.drain(); // the scripted replies are used up; the fake now answers properly
    const version = (await t.review.get(user as never, versionId))!;
    expect(version.parseJobs[0].status).toBe("READY");
    expect(version.subjects.map((s) => s.name)).toEqual(SUBJECTS);
  });
});
