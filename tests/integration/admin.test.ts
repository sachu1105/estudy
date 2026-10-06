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
