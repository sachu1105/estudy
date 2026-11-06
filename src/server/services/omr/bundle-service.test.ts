import { describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import type { BundleRow } from "@/server/repositories/bundle-repository";

import { createBundleService, type BundleDeps } from "./bundle-service";

const owner = { id: "00000000-0000-4000-8000-0000000000a1" } as never;
const admin = { id: "00000000-0000-4000-8000-0000000000a2" } as never;
const member = { id: "00000000-0000-4000-8000-0000000000a3" } as never;
const outsider = { id: "00000000-0000-4000-8000-0000000000a4" } as never;
const idOf = (u: unknown) => (u as { id: string }).id;

const ROLES: Record<string, string> = {
  [idOf(owner)]: "OWNER",
  [idOf(admin)]: "ADMIN",
  [idOf(member)]: "MEMBER",
};
const PAPERS: Record<string, string> = {
  p1: idOf(owner),
  p2: idOf(owner),
  p3: idOf(admin),
};

function setup(opts: { selling?: boolean; canPrice?: boolean } = {}) {
  const bundles = new Map<string, BundleRow>();
  const purchases: { bundleId: string; userId: string; amountPaise: number }[] =
    [];
  const state = {
    selling: opts.selling ?? true,
    canPrice: opts.canPrice ?? true,
  };
  let n = 0;
  const repo = {
    async create(data) {
      const id = `b${++n}`;
      bundles.set(id, {
        id,
        ownerId: data.ownerId,
        title: data.title,
        description: data.description,
        pricePaise: data.pricePaise,
        groupId: data.groupId,
        channelId: data.channelId,
        hiddenAt: null,
        createdAt: new Date(0),
        owner: { id: data.ownerId, displayName: "Owner" },
        group: { id: data.groupId, name: "Squad", ownerId: idOf(owner) },
        channel: { id: data.channelId, name: "general" },
        papers: data.paperIds.map((id) => ({
          paper: { id, title: id, questionCount: 100, limitMin: 75 },
        })),
      });
      return { id };
    },
    async find(id) {
      return bundles.get(id) ?? null;
    },
    async hide(id, at) {
      bundles.get(id)!.hiddenAt = at;
    },
    async purchase(bundleId, userId) {
      const p = purchases.find(
        (x) => x.bundleId === bundleId && x.userId === userId,
      );
      return p
        ? { id: "x", amountPaise: p.amountPaise, createdAt: new Date(0) }
        : null;
    },
    async addPurchase(data) {
      purchases.push(data);
      return { id: `p${purchases.length}` };
    },
    async countPurchases(bundleId) {
      return purchases.filter((p) => p.bundleId === bundleId).length;
    },
    async forUser(userId) {
      return [...bundles.values()].filter(
        (b) =>
          purchases.some((p) => p.bundleId === b.id && p.userId === userId) ||
          (b.ownerId === userId && !b.hiddenAt),
      );
    },
    async hasPaper(userId, paperId) {
      return purchases.some(
        (p) =>
          p.userId === userId &&
          bundles.get(p.bundleId)!.papers.some((x) => x.paper.id === paperId),
      );
    },
  } as BundleDeps["bundles"];

  const service = createBundleService({
    bundles: repo,
    papers: {
      async findOwned(id, ownerId) {
        return PAPERS[id] === ownerId ? ({ id } as never) : null;
      },
    },
    channel: async (user) => {
      const role = ROLES[idOf(user)];
      return role ? { canPost: true, muted: false, role } : null;
    },
    canPrice: async () => state.canPrice,
    selling: async () => state.selling,
    checkout: {
      charge: async () => ({ provider: "DEMO", ref: `demo_${n++}` }),
    },
    clock: fixedClock("2026-11-08T10:00:00Z"),
  });
  return { service, purchases, state };
}

const input = {
  groupId: "g1",
  channelId: "c1",
  title: "Police constable PYQs",
  description: "2019 to 2022",
  paperIds: ["p1", "p2"],
  rupees: 299,
};

describe("paper bundles", () => {
  it("only the squad's owner charges, within the price range, for their own papers", async () => {
    const s = setup();
    expect(
      (await s.service.create(admin, { ...input, paperIds: ["p3"] })).ok,
    ).toBe(false);
    expect(
      (
        await s.service.create(admin, {
          ...input,
          paperIds: ["p3"],
          rupees: null,
        })
      ).ok,
    ).toBe(true);
    expect((await s.service.create(owner, { ...input, rupees: 5 })).ok).toBe(
      false,
    );
    expect(
      (await s.service.create(owner, { ...input, paperIds: ["p3"] })).ok,
    ).toBe(false);
    expect((await s.service.create(owner, { ...input, paperIds: [] })).ok).toBe(
      false,
    );
    expect((await s.service.create(owner, input)).ok).toBe(true);
    expect(await s.service.canCharge(owner, "g1", "c1")).toBe(true);
    expect(await s.service.canCharge(admin, "g1", "c1")).toBe(false);
    s.state.canPrice = false;
    expect((await s.service.create(owner, input)).ok).toBe(false);
  });

  it("sells a paid bundle once; whoever has it sits its papers, key and all, for good", async () => {
    const s = setup();
    const made = await s.service.create(owner, input);
    if (!made.ok) throw new Error(made.message);
    expect(await s.service.get(outsider, made.id)).toBeNull();
    const before = await s.service.get(member, made.id);
    expect(before?.have).toBe(false);
    expect(before?.selling).toBe(true);
    expect(before?.papers.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(await s.service.paperAccess(member, "p1")).toBeNull();
    expect((await s.service.claim(member, made.id)).ok).toBe(false);

    expect((await s.service.buy(member, made.id)).ok).toBe(true);
    expect((await s.service.buy(member, made.id)).ok).toBe(false);
    expect(s.purchases).toEqual([
      expect.objectContaining({ userId: idOf(member), amountPaise: 29900 }),
    ]);
    expect(await s.service.paperAccess(member, "p2")).toEqual({
      canView: true,
      canPractise: true,
      keyOut: true,
    });
    expect((await s.service.get(owner, made.id))?.holders).toBe(1);

    // Sales stop: nobody new gets it, the buyer keeps it.
    expect((await s.service.stop(member, made.id)).ok).toBe(false);
    await s.service.stop(owner, made.id);
    expect(await s.service.get(admin, made.id)).toBeNull();
    expect((await s.service.get(member, made.id))?.have).toBe(true);
    expect((await s.service.mine(member)).map((b) => b.id)).toEqual([made.id]);
  });

  it("pauses paid sales when they're switched off, and adds a free bundle once", async () => {
    const s = setup({ selling: false });
    const paid = await s.service.create(owner, input);
    if (!paid.ok) throw new Error(paid.message);
    expect((await s.service.get(member, paid.id))?.selling).toBe(false);
    expect((await s.service.buy(member, paid.id)).ok).toBe(false);

    const free = await s.service.create(admin, {
      ...input,
      paperIds: ["p3"],
      rupees: null,
    });
    if (!free.ok) throw new Error(free.message);
    expect((await s.service.buy(member, free.id)).ok).toBe(false);
    expect((await s.service.claim(member, free.id)).ok).toBe(true);
    expect((await s.service.claim(member, free.id)).ok).toBe(true);
    expect(s.purchases).toHaveLength(1);
    expect(await s.service.paperAccess(member, "p3")).not.toBeNull();
    expect(await s.service.claim(outsider, free.id)).toMatchObject({
      ok: false,
    });
  });
});
