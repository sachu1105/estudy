import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { channelRepository } from "@/server/repositories/channel-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { createGroupService } from "@/server/services/groups/group-service";

import { resetDatabase } from "./helpers";

const clock = fixedClock("2026-10-11T04:30:00Z");
let created = 5;
let code = 0;
const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  ownerLimit: async () => 100,
  clock,
  limit: (_u, f) => (f === "groupsCreated" ? created : 10),
  newCode: () => `CODE${++code}`,
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
const groupId = (r: unknown) => (r as { groupId: string }).groupId;

beforeEach(async () => {
  await resetDatabase();
  clock.set("2026-10-11T04:30:00Z");
  created = 5;
  code = 0;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("groups", () => {
  it("creates a group with its owner, within the plan's limit", async () => {
    const anu = await user("Anu");
    const g = groupId(
      await groups.create(anu, {
        name: "LDC Kollam",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    );
    expect((await groups.view(anu, g))?.role).toBe("OWNER");
    created = 1;
    expect(
      await groups.create(anu, {
        name: "Another",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    ).toMatchObject({
      ok: false,
      code: "LIMIT",
    });
  });

  it("lets anyone join a public group; a private one asks first", async () => {
    const owner = await user("Owner");
    const binu = await user("Binu");
    const open = groupId(
      await groups.create(owner, {
        name: "Open",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    );
    const closed = groupId(
      await groups.create(owner, {
        name: "Closed",
        description: null,
        examId: null,
        visibility: "PRIVATE",
      }),
    );

    expect(await groups.join(binu, open)).toEqual({ ok: true, joined: true });
    expect(await groups.join(binu, closed)).toEqual({
      ok: true,
      joined: false,
    });
    expect((await groups.view(binu, closed))?.role).toBeNull();
    expect(await groups.members(binu, closed)).toBeNull(); // not a member: no list

    const pending = (await groups.members(owner, closed))!.requests;
    expect(pending).toHaveLength(1);
    await groups.decideRequest(owner, pending[0]!.id, true);
    expect((await groups.view(binu, closed))?.role).toBe("MEMBER");
  });

  it("opens private groups by invite, honouring uses, expiry and revoking", async () => {
    const owner = await user("Owner");
    const [a, b, c] = [await user("A"), await user("B"), await user("C")];
    const g = groupId(
      await groups.create(owner, {
        name: "Closed",
        description: null,
        examId: null,
        visibility: "PRIVATE",
      }),
    );
    const once = (await groups.createInvite(owner, g, {
      days: 7,
      maxUses: 1,
    })) as { code: string };
    // The "Join this squad?" prompt: what it opens, and joining nothing yet.
    expect(await groups.previewInvite(a, once.code)).toMatchObject({
      ok: true,
      member: false,
      group: { id: g, name: "Closed", members: 1, cover: null },
    });
    expect((await groups.view(a, g))?.role ?? null).toBeNull();
    expect(await groups.joinByCode(a, once.code.toLowerCase())).toEqual({
      ok: true,
      groupId: g,
    });
    expect(await groups.previewInvite(a, once.code)).toMatchObject({
      ok: true,
      member: true,
    });
    expect(await groups.previewInvite(b, once.code)).toMatchObject({
      ok: false,
      code: "FULL",
    });
    expect(await groups.joinByCode(b, once.code)).toMatchObject({
      ok: false,
      code: "FULL",
    });

    const week = (await groups.createInvite(owner, g, {
      days: 7,
      maxUses: null,
    })) as { code: string };
    clock.advance(8 * 86_400_000);
    expect(await groups.joinByCode(b, week.code)).toMatchObject({
      ok: false,
      code: "BAD_CODE",
    });

    const open = (await groups.createInvite(owner, g, {
      days: null,
      maxUses: null,
    })) as { code: string };
    const invite = (await groups.members(owner, g))!.invites.find(
      (i) => i.code === open.code,
    )!;
    await groups.revokeInvite(owner, g, invite.id);
    expect(await groups.joinByCode(c, open.code)).toMatchObject({
      ok: false,
      code: "BAD_CODE",
    });
    // A member can't make invites.
    expect(
      await groups.createInvite(a, g, { days: 1, maxUses: 1 }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });

  it("keeps roles in order: admins manage members, only the owner manages admins", async () => {
    const owner = await user("Owner");
    const admin = await user("Admin");
    const member = await user("Member");
    const g = groupId(
      await groups.create(owner, {
        name: "G",
        description: null,
        examId: null,
        visibility: "PUBLIC",
      }),
    );
    await groups.join(admin, g);
    await groups.join(member, g);

    expect(
      await groups.manage(member, g, admin.id, { kind: "remove" }),
    ).toMatchObject({ ok: false });
    expect(
      await groups.manage(owner, g, admin.id, { kind: "role", role: "ADMIN" }),
    ).toEqual({ ok: true });
    expect(
      await groups.manage(admin, g, owner.id, { kind: "remove" }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(
      await groups.manage(admin, g, member.id, { kind: "role", role: "ADMIN" }),
    ).toMatchObject({ ok: false });
    expect(
      await groups.manage(admin, g, member.id, { kind: "mute", hours: 24 }),
    ).toEqual({ ok: true });
    expect((await groups.view(member, g))?.muted).toBe(true);
    expect(
      await groups.manage(admin, g, member.id, { kind: "remove" }),
    ).toEqual({ ok: true });
    expect((await groups.view(member, g))?.role).toBeNull();

    expect(await groups.leave(owner, g)).toMatchObject({
      ok: false,
      code: "OWNER",
    });
  });

  it("blocks and reports", async () => {
    const a = await user("A");
    const b = await user("B");
    await groups.block(a, b.id, true);
    expect((await groups.blockedIds(a)).has(b.id)).toBe(true);
    await groups.report(
      a,
      { type: "USER", id: b.id, groupId: null },
      "spam",
      null,
    );
    await groups.report(
      a,
      { type: "USER", id: b.id, groupId: null },
      "spam",
      null,
    ); // once only
    expect(await prisma.report.count()).toBe(1);
  });
});
