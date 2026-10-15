import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import type { EditableTree } from "@/lib/syllabus/tree";
import { prisma } from "@/server/db";
import { createEntitlements } from "@/server/entitlements/resolve";
import { redis } from "@/server/redis";
import { adminRepository } from "@/server/repositories/admin-repository";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { refreshTokenRepository } from "@/server/repositories/refresh-token-repository";
import { syllabusRepository } from "@/server/repositories/syllabus-repository";
import {
  createAdminService,
  type Admin,
} from "@/server/services/admin/admin-service";
import { cachedSettings, loadSettings, saveSetting } from "@/server/settings";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-08T04:30:00Z");
const admin = createAdminService({
  admin: adminRepository,
  audit: auditLogRepository,
  tokens: refreshTokenRepository,
  syllabuses: syllabusRepository,
  clock,
  newId: () => crypto.randomUUID(),
});

const id = () => crypto.randomUUID();

async function makeUser(
  email: string,
  role: "USER" | "ADMIN" | "SUPER_ADMIN" = "USER",
) {
  const u = await prisma.user.create({
    data: { email, passwordHash: "x", name: email, displayName: email, role },
  });
  await prisma.subscription.create({
    data: { userId: u.id, plan: "FREE", status: "ACTIVE" },
  });
  return u;
}
const as = (u: { id: string; role: Admin["role"] }): Admin => ({
  id: u.id,
  role: u.role,
});

beforeEach(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("admin: users", () => {
  it("suspends a user, signs them out everywhere, and logs it", async () => {
    const boss = await makeUser("boss@example.com", "ADMIN");
    const anu = await makeUser("anu@example.com");
    await prisma.refreshToken.create({
      data: {
        userId: anu.id,
        tokenHash: "h1",
        familyId: id(),
        expiresAt: new Date("2026-11-01T00:00:00Z"),
      },
    });

    expect(
      await admin.setStatus(as(boss), anu.id, "SUSPENDED", "spam"),
    ).toEqual({ ok: true });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: anu.id } })).status,
    ).toBe("SUSPENDED");
    expect(
      (await prisma.refreshToken.findFirstOrThrow()).revokedAt,
    ).not.toBeNull();
    expect(await prisma.auditLog.findFirst()).toMatchObject({
      actorId: boss.id,
      action: "admin.user.suspended",
      targetId: anu.id,
    });
  });

  it("never lets an admin act on themselves or on a super admin", async () => {
    const boss = await makeUser("boss@example.com", "ADMIN");
    const top = await makeUser("top@example.com", "SUPER_ADMIN");
    expect(
      await admin.setStatus(as(boss), boss.id, "BANNED", "x"),
    ).toMatchObject({
      ok: false,
      code: "SELF",
    });
    expect(
      await admin.setStatus(as(boss), top.id, "BANNED", "x"),
    ).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    // Roles are the super admin's alone.
    const anu = await makeUser("anu@example.com");
    expect(await admin.setRole(as(boss), anu.id, "ADMIN")).toMatchObject({
      ok: false,
    });
    expect(await admin.setRole(as(top), anu.id, "MODERATOR")).toEqual({
      ok: true,
    });
  });

  it("grants a plan that entitlements then see, replacing the old one", async () => {
    const boss = await makeUser("boss@example.com", "ADMIN");
    const anu = await makeUser("anu@example.com");
    expect(await admin.grantPlan(as(boss), anu.id, "PRO", 3)).toEqual({
      ok: true,
    });
    const subs = await prisma.subscription.findMany({
      where: { userId: anu.id },
      orderBy: { createdAt: "asc" },
    });
    expect(subs.map((s) => [s.plan, s.status, s.source])).toEqual([
      ["FREE", "EXPIRED", "DEFAULT"],
      ["PRO", "ACTIVE", "ADMIN_GRANT"],
    ]);
    const { subscribedPlanOf } = createEntitlements({
      billingEnabled: true,
      clock,
    });
    expect(subscribedPlanOf({ subscription: subs[1]! })).toBe("PRO");
  });
});

describe("admin: catalogue", () => {
  it("promotes a confirmed upload to a pending copy, hidden until approved", async () => {
    const boss = await makeUser("boss@example.com", "ADMIN");
    const anu = await makeUser("anu@example.com");
    const upload = await prisma.syllabusVersion.create({
      data: { title: "LDC 2026", ownerId: anu.id, sourceKind: "TEXT" },
    });
    const tree: EditableTree = {
      subjects: [
        {
          id: id(),
          name: "History",
          topics: [
            {
              id: id(),
              name: "Renaissance",
              weight: 4,
              difficulty: 3,
              foundational: false,
            },
          ],
        },
      ],
    };
    await syllabusRepository.approvePrivate(upload.id, tree, new Date());

    const promoted = await admin.promote(as(boss), upload.id, {
      title: "LD Clerk (official)",
      examId: null,
    });
    expect(promoted).toMatchObject({ ok: true });
    const copyId = (promoted as { id: string }).id;
    const copy = (await admin.forReview(copyId))!;
    expect(copy).toMatchObject({
      visibility: "CATALOGUE",
      status: "PENDING",
      promotedFromId: upload.id,
    });
    expect(copy.subjects[0]!.topics[0]).toMatchObject({
      name: "Renaissance",
      weight: 4,
    });
    expect(copy.subjects[0]!.id).not.toBe(tree.subjects[0]!.id);
    // Rule 5: nobody else sees it before approval.
    expect(await syllabusRepository.findApprovedCatalogue(copyId)).toBeNull();

    expect(
      await admin.review(as(boss), copyId, { approve: false, note: " " }),
    ).toMatchObject({
      ok: false,
      code: "NO_NOTE",
    });
    expect(
      await admin.review(as(boss), copyId, { approve: true, note: null }),
    ).toEqual({
      ok: true,
    });
    expect(
      await syllabusRepository.findApprovedCatalogue(copyId),
    ).not.toBeNull();
  });
});

describe("admin: syllabus builder", () => {
  const exam = () =>
    prisma.exam.create({
      data: { slug: "ldc", name: "LDC", board: "Kerala PSC", order: 1 },
    });

  it("reads pasted text into a pending catalogue syllabus with no AI, editable until approved", async () => {
    const boss = await makeUser("boss@example.com", "ADMIN");
    const ldc = await exam();
    const built = await admin.buildSyllabus(as(boss), {
      title: "LDC 2026",
      examId: ldc.id,
      text: [
        "Part I: General Knowledge (50 marks)",
        "History: Kerala renaissance, freedom struggle",
        "Part II: General English (10 marks)",
        "Tenses, synonyms and antonyms",
      ].join("\n"),
    });
    expect(built).toMatchObject({ ok: true });
    const versionId = (built as { id: string }).id;
    const version = (await admin.forReview(versionId))!;
    expect(version).toMatchObject({
      visibility: "CATALOGUE",
      status: "PENDING",
      examId: ldc.id,
      parse: { provider: "rules", promptVersion: "rules@1" },
    });
    expect(version.subjects.map((s) => s.name)).toEqual([
      "General Knowledge",
      "General English",
    ]);
    expect(await prisma.aiUsage.count()).toBe(0);
    expect(
      await syllabusRepository.findApprovedCatalogue(versionId),
    ).toBeNull();

    // The admin fixes a name while it waits; ids stay put.
    const tree: EditableTree = {
      subjects: version.subjects.map((s, i) => ({
        id: s.id,
        name: i === 0 ? "General knowledge" : s.name,
        topics: s.topics.map((t) => ({
          id: t.id,
          name: t.name,
          weight: t.weight,
          difficulty: t.difficulty,
          foundational: t.foundational,
        })),
      })),
    };
    expect(await admin.saveCatalogueTree(versionId, tree)).toEqual({
      ok: true,
    });
    expect(
      await admin.review(as(boss), versionId, { approve: true, note: null }),
    ).toEqual({ ok: true });
    const live = (await syllabusRepository.findApprovedCatalogue(versionId))!;
    expect(live.subjects[0]).toMatchObject({
      id: tree.subjects[0]!.id,
      name: "General knowledge",
    });
    // Approved is fixed.
    expect(await admin.saveCatalogueTree(versionId, tree)).toMatchObject({
      ok: false,
      code: "READ_ONLY",
    });
    expect(
      await prisma.auditLog.count({
        where: { action: "admin.catalogue.build" },
      }),
    ).toBe(1);
  });

  it("starts blank, and needs a real exam", async () => {
    const boss = await makeUser("boss@example.com", "ADMIN");
    const ldc = await exam();
    expect(
      await admin.buildSyllabus(as(boss), {
        title: "LDC",
        examId: crypto.randomUUID(),
        text: null,
      }),
    ).toMatchObject({ ok: false, code: "NO_EXAM" });
    const blank = await admin.buildSyllabus(as(boss), {
      title: "LDC",
      examId: ldc.id,
      text: null,
    });
    const version = (await admin.forReview((blank as { id: string }).id))!;
    expect(version.parse).toBeNull();
    expect(version.subjects).toHaveLength(1);
    expect(version.subjects[0]!.topics).toHaveLength(1);
  });
});

describe("admin: AI settings", () => {
  const provider = {
    kind: "anthropic" as const,
    model: "claude-sonnet-5-5",
    baseUrl: null,
    priceInputPerMTok: 3,
    priceOutputPerMTok: 15,
  };

  it("stores the API key sealed, shows only a hint, and opens it on the server", async () => {
    const { aiSettings } = await import("@/server/services/admin");
    const { providerConfig } = await import("@/server/ai/config");
    const top = await makeUser("top@example.com", "SUPER_ADMIN");
    await loadSettings(true);

    expect(
      await aiSettings.saveProvider(as(top), {
        ...provider,
        apiKey: { action: "replace", value: "sk-ant-api03-SECRETVALUE-9f2c" },
      }),
    ).toEqual({ ok: true });
    const row = await prisma.appSetting.findUnique({
      where: { key: "aiProvider" },
    });
    expect(JSON.stringify(row!.value)).not.toContain("SECRETVALUE");
    expect((await providerConfig()).apiKey).toBe(
      "sk-ant-api03-SECRETVALUE-9f2c",
    );

    const view = await aiSettings.view();
    expect(JSON.stringify(view)).not.toContain("SECRETVALUE");
    expect(view.provider).toMatchObject({ keyHint: "…9f2c", source: "admin" });
    expect(view.missing).toBeNull();

    // Saving other fields keeps the key; Remove drops it.
    await aiSettings.saveProvider(as(top), {
      ...provider,
      model: "claude-haiku-5-5",
      apiKey: { action: "keep" },
    });
    expect((await providerConfig()).apiKey).toBe(
      "sk-ant-api03-SECRETVALUE-9f2c",
    );
    await aiSettings.saveProvider(as(top), {
      ...provider,
      apiKey: { action: "remove" },
    });
    expect((await aiSettings.view()).missing).toBe("Add the API key.");

    const audit = await prisma.auditLog.findMany({
      where: { action: "admin.ai.provider" },
    });
    expect(audit).toHaveLength(3);
    expect(JSON.stringify(audit)).not.toContain("SECRETVALUE");
  });

  it("reads syllabuses by rules while AI is on but the key is missing", async () => {
    const { aiSettings } = await import("@/server/services/admin");
    const { syllabusDeps } = await import("@/server/services/syllabus");
    const top = await makeUser("top@example.com", "SUPER_ADMIN");
    await saveSetting("ai", { enabled: true, jobs: {} }, top.id);
    await aiSettings.saveProvider(as(top), {
      ...provider,
      apiKey: { action: "remove" },
    });
    expect(await syllabusDeps.reader()).toMatchObject({
      ai: false,
      readsDocuments: true,
    });
    await aiSettings.saveProvider(as(top), {
      ...provider,
      apiKey: { action: "replace", value: "sk-ant-api03-another-key" },
    });
    expect((await syllabusDeps.reader()).ai).toBe(true);
    // The job's own switch counts too.
    await saveSetting(
      "ai",
      { enabled: true, jobs: { syllabus: false } },
      top.id,
    );
    expect((await syllabusDeps.reader()).ai).toBe(false);
  });

  it("saves an edited prompt under its own version; the built-in text resets it", async () => {
    const { aiSettings } = await import("@/server/services/admin");
    const { PROMPT_DEFAULTS } = await import("@/server/ai/prompts");
    const top = await makeUser("top@example.com", "SUPER_ADMIN");
    await aiSettings.savePrompts(as(top), {
      structureSyllabus: "List every topic of this exam syllabus exactly.",
    });
    let prompt = (await aiSettings.view()).prompts.find(
      (p) => p.key === "structureSyllabus",
    )!;
    expect(prompt).toMatchObject({ custom: true });
    expect(prompt.version).toMatch(/^structure-syllabus@4~/);

    await aiSettings.savePrompts(as(top), {
      structureSyllabus: PROMPT_DEFAULTS.structureSyllabus.system,
    });
    prompt = (await aiSettings.view()).prompts.find(
      (p) => p.key === "structureSyllabus",
    )!;
    expect(prompt).toMatchObject({
      custom: false,
      version: "structure-syllabus@4",
    });
  });
});

describe("admin: settings", () => {
  it("changes a plan limit for everyone without a restart", async () => {
    const top = await makeUser("top@example.com", "SUPER_ADMIN");
    const { limit } = createEntitlements({
      billingEnabled: true,
      clock,
      settings: () => ({
        billingEnabled: cachedSettings().billing?.enabled,
        overrides: cachedSettings().entitlements,
      }),
    });
    await loadSettings(true);
    const free = { subscription: null };
    expect(limit(free, "syllabusUploads")).toBe(1);
    await saveSetting(
      "entitlements",
      { FREE: { limits: { syllabusUploads: 4 }, flags: {} } },
      top.id,
    );
    expect(limit(free, "syllabusUploads")).toBe(4);
  });
});

describe("admin: site switches", () => {
  it("blocks users, never staff, while maintenance is on; switches default to on", async () => {
    const { maintenanceFor } = await import("@/server/settings/maintenance");
    const { flagOn } = await import("@/server/settings");
    const top = await makeUser("top@example.com", "SUPER_ADMIN");
    await loadSettings(true);
    expect(await maintenanceFor("USER")).toBeNull();
    expect(await flagOn("syllabusUploads")).toBe(true);

    await saveSetting(
      "maintenance",
      { on: true, message: "Back at 6 pm" },
      top.id,
    );
    await saveSetting("flags", { syllabusUploads: false }, top.id);
    expect(await maintenanceFor("USER")).toBe("Back at 6 pm");
    expect(await maintenanceFor("ADMIN")).toBeNull();
    expect(await flagOn("syllabusUploads")).toBe(false);
    expect(await flagOn("linkPreviews")).toBe(true);
  });
});
