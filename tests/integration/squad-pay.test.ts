import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { channelRepository } from "@/server/repositories/channel-repository";
import { groupRepository } from "@/server/repositories/group-repository";
import { passRepository } from "@/server/repositories/pass-repository";
import { createChannelService } from "@/server/services/groups/channel-service";
import { createGroupService } from "@/server/services/groups/group-service";
import { createSquadPay } from "@/server/services/groups/squad-pay";

import { resetDatabase } from "./helpers";

const DAY = 86_400_000;
const clock = fixedClock("2026-10-29T04:30:00Z");
let salesOn = true;
/** Who may sell: stands in for the ELITE plan check. */
const sellers = new Set<string>();

const groups = createGroupService({
  groups: groupRepository,
  channels: channelRepository,
  clock,
  limit: () => 10,
  ownerLimit: async () => 100,
  newCode: () => crypto.randomUUID().slice(0, 8).toUpperCase(),
});
const channels = createChannelService({
  groups,
  channels: channelRepository,
  clock,
  ownerLimit: async () => 50,
  examSubjects: async () => [],
});
let charges = 0;
const pay = createSquadPay({
  groups,
  repo: groupRepository,
  channels: channelRepository,
  passes: passRepository,
  checkout: {
    charge: async () => ({
      provider: "DEMO",
      ref: `demo_${++charges}_${crypto.randomUUID()}`,
    }),
  },
  clock,
  salesOn: async () => salesOn,
  canSell: (user) => sellers.has(user.id),
  ownerCanSell: async (id) => sellers.has(id),
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

async function squad(owner: { id: string; subscription: null }) {
  const made = await groups.create(owner, {
    name: "LDC 2026 batch",
    description: null,
    examId: null,
    visibility: "PUBLIC",
    template: "BLANK",
  });
  return (made as { groupId: string }).groupId;
}

const offer = (rupees: number, accessDays: 30 | null = 30) => ({
  rupees,
  accessDays,
  offer: "Daily mocks",
  demoUrl: null,
});

beforeEach(async () => {
  await resetDatabase();
  clock.set("2026-10-29T04:30:00Z");
  salesOn = true;
  sellers.clear();
  charges = 0;
});
afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe("paid squads", () => {
  it("lets only a seller's owner put a price on, and only while sales are on", async () => {
    const sir = await user("Sir");
    const g = await squad(sir);
    expect(await pay.setSquadOffer(sir, g, offer(499))).toMatchObject({
      ok: false,
      code: "NOT_SELLER",
    });
    sellers.add(sir.id);
    salesOn = false;
    expect(await pay.setSquadOffer(sir, g, offer(499))).toMatchObject({
      ok: false,
      code: "SALES_OFF",
    });
    salesOn = true;
    expect(await pay.setSquadOffer(sir, g, offer(499))).toMatchObject({
      ok: true,
    });

    // An admin of the squad doesn't set prices: the money is the owner's.
    const admin = await user("Admin");
    sellers.add(admin.id);
    await groupRepository.addMember(g, admin.id);
    await groupRepository.setRole(g, admin.id, "ADMIN");
    expect(await pay.setSquadOffer(admin, g, null)).toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });

    // Taking the price off needs no right to sell.
    sellers.delete(sir.id);
    expect(await pay.setSquadOffer(sir, g, null)).toMatchObject({ ok: true });
    expect((await groupRepository.find(g))?.pricePaise).toBeNull();
  });

  it("makes paying the way in, and keeps the pass in the log", async () => {
    const sir = await user("Sir");
    sellers.add(sir.id);
    const g = await squad(sir);
    await pay.setSquadOffer(sir, g, offer(499));

    const anu = await user("Anu");
    expect(await groups.join(anu, g)).toMatchObject({
      ok: false,
      code: "PAID",
    });
    const bought = await pay.buySquad(anu, g);
    expect(bought).toMatchObject({ ok: true });
    expect((await groups.view(anu, g))?.role).toBe("MEMBER");
    const membership = await groupRepository.membership(g, anu.id);
    expect(membership?.paidUntil).toEqual(
      new Date(clock.now().getTime() + 30 * DAY),
    );

    const sales = await pay.sales(sir, g);
    expect(sales).toMatchObject({ totalPaise: 49900, count: 1 });
    expect(sales?.recent[0]).toMatchObject({ provider: "DEMO", channel: null });
    expect(await pay.sales(anu, g)).toBeNull();

    // Rule 6: a pass is never rewritten.
    await expect(
      prisma.squadPass.updateMany({
        where: { groupId: g },
        data: { amountPaise: 1 },
      }),
    ).rejects.toThrow(/append-only/);
  });

  it("lets a pass run out, keeps the place, and renews from today", async () => {
    const sir = await user("Sir");
    sellers.add(sir.id);
    const g = await squad(sir);
    await pay.setSquadOffer(sir, g, offer(199));
    const anu = await user("Anu");
    await pay.buySquad(anu, g);

    clock.advance(31 * DAY);
    const view = await groups.view(anu, g);
    expect(view?.role).toBeNull();
    expect(view?.lapsedAt).toBeInstanceOf(Date);
    expect("error" in (await groups.require(anu, g, "MEMBER"))).toBe(true);
    expect(
      (await groups.members(sir, g))?.members.map((m) => m.user.id),
    ).not.toContain(anu.id);

    // Sales paused: no renewing, but nothing breaks.
    salesOn = false;
    expect(await pay.buySquad(anu, g)).toMatchObject({
      ok: false,
      code: "PAUSED",
    });
    salesOn = true;

    expect(await pay.buySquad(anu, g)).toMatchObject({ ok: true });
    expect((await groups.view(anu, g))?.role).toBe("MEMBER");
    expect((await groupRepository.membership(g, anu.id))?.paidUntil).toEqual(
      new Date(clock.now().getTime() + 30 * DAY),
    );
    expect(charges).toBe(2);
  });

  it("adds early renewals to the time left, and lets invites in free", async () => {
    const sir = await user("Sir");
    sellers.add(sir.id);
    const g = await squad(sir);
    await pay.setSquadOffer(sir, g, offer(199));
    const anu = await user("Anu");
    await pay.buySquad(anu, g);
    clock.advance(10 * DAY);
    await pay.buySquad(anu, g);
    expect((await groupRepository.membership(g, anu.id))?.paidUntil).toEqual(
      new Date(clock.now().getTime() + 50 * DAY),
    );

    const invite = await groups.createInvite(sir, g, {
      days: null,
      maxUses: null,
    });
    const binu = await user("Binu");
    expect(
      await groups.joinByCode(binu, (invite as { code: string }).code),
    ).toMatchObject({ ok: true });
    expect(
      (await groupRepository.membership(g, binu.id))?.paidUntil,
    ).toBeNull();
    expect(await pay.buySquad(binu, g)).toMatchObject({
      ok: false,
      code: "HAVE_IT",
    });
    expect(await pay.buySquad(sir, g)).toMatchObject({
      ok: false,
      code: "STAFF",
    });
  });
});

describe("paid channels", () => {
  it("lists a paid channel locked, and opens it with a pass", async () => {
    const sir = await user("Sir");
    sellers.add(sir.id);
    const g = await squad(sir);
    const anu = await user("Anu");
    await groups.join(anu, g);
    const made = await channels.create(sir, g, {
      type: "CHAT",
      name: "mock-tests",
      topic: null,
      categoryId: null,
      postRule: "EVERYONE",
      viewRule: "PICKED",
    });
    const channelId = (made as { channelId: string }).channelId;
    expect(
      await pay.setChannelPrice(sir, g, channelId, {
        rupees: 99,
        accessDays: null,
      }),
    ).toMatchObject({ ok: true });

    const row = (l: Awaited<ReturnType<typeof channels.layout>>) =>
      l!.loose.find((c) => c.id === channelId);
    // Priced: listed for every member (no longer picked), locked for those without a pass.
    expect(row(await channels.layout(anu, g))).toMatchObject({
      viewRule: "EVERYONE",
      locked: true,
    });
    expect(await channels.get(anu, g, channelId)).toBeNull();
    expect(await pay.lockedChannel(anu, g, channelId)).toMatchObject({
      channel: { pricePaise: 9900 },
      selling: true,
    });
    // The owner always gets in, and has nothing to buy.
    expect(await channels.get(sir, g, channelId)).not.toBeNull();
    expect(row(await channels.layout(sir, g))?.locked).toBe(false);

    expect(await pay.buyChannel(anu, g, channelId)).toMatchObject({
      ok: true,
      until: null,
    });
    expect(await channels.get(anu, g, channelId)).not.toBeNull();
    expect(row(await channels.layout(anu, g))?.locked).toBe(false);
    expect(await pay.buyChannel(anu, g, channelId)).toMatchObject({
      ok: false,
      code: "HAVE_IT",
    });
    expect(await pay.lockedChannel(anu, g, channelId)).toMatchObject({
      endedAt: null,
    });

    // Free again: open to all.
    await pay.setChannelPrice(sir, g, channelId, null);
    const binu = await user("Binu");
    await groups.join(binu, g);
    expect(await channels.get(binu, g, channelId)).not.toBeNull();
  });

  it("closes a channel again when a timed pass runs out", async () => {
    const sir = await user("Sir");
    sellers.add(sir.id);
    const g = await squad(sir);
    const anu = await user("Anu");
    await groups.join(anu, g);
    const made = await channels.create(sir, g, {
      type: "CHAT",
      name: "live-classes",
      topic: null,
      categoryId: null,
      postRule: "ADMINS",
    });
    const channelId = (made as { channelId: string }).channelId;
    await pay.setChannelPrice(sir, g, channelId, {
      rupees: 149,
      accessDays: 30,
    });
    await pay.buyChannel(anu, g, channelId);
    expect(await channels.get(anu, g, channelId)).not.toBeNull();
    clock.advance(30 * DAY + 1);
    expect(await channels.get(anu, g, channelId)).toBeNull();
    expect(
      (await pay.lockedChannel(anu, g, channelId))?.endedAt,
    ).toBeInstanceOf(Date);
  });
});
