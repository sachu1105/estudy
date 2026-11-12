import { describe, expect, it } from "vitest";

import { fixedClock } from "@/lib/clock";
import type { BundleRow } from "@/server/repositories/bundle-repository";

import { createBundleService, type BundleDeps } from "./bundle-service";
import { createStoreListingService } from "./store-listing-service";

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
  p4: idOf(owner),
};
const fakePaper = (id: string) => ({
  id,
  title: id,
  questionCount: 100,
  limitMin: 75,
  wrongNum: 1,
  wrongDen: 3,
  keySource: "OWN" as const,
});

/** Who holds a real PRO plan, for library bundles included in plans. */
const proUsers = new Set([idOf(member)]);

function setup(opts: { selling?: boolean; canPrice?: boolean } = {}) {
  const bundles = new Map<string, BundleRow>();
  const purchases: {
    bundleId: string;
    userId: string;
    amountPaise: number;
    cutPaise?: number | null;
  }[] = [];
  const audit: string[] = [];
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
        catalogue: data.catalogue ?? false,
        includedIn: data.includedIn ?? [],
        publishedAt: data.publishedAt ?? null,
        listing: data.listing ?? null,
        listingNote: null,
        listedAt: data.listedAt ?? null,
        createdAt: new Date(0),
        owner: { id: data.ownerId, displayName: "Owner" },
        group: data.groupId
          ? { id: data.groupId, name: "Squad", ownerId: idOf(owner) }
          : null,
        channel: data.channelId
          ? { id: data.channelId, name: "general" }
          : null,
        papers: data.paperIds.map((id) => ({ paper: fakePaper(id) })),
      });
      return { id };
    },
    async find(id) {
      return bundles.get(id) ?? null;
    },
    async hide(id, at) {
      bundles.get(id)!.hiddenAt = at;
    },
    async update(id, data) {
      const b = bundles.get(id)!;
      Object.assign(b, {
        title: data.title,
        description: data.description,
        pricePaise: data.pricePaise,
        includedIn: data.includedIn,
        papers: data.paperIds.map((p) => ({ paper: fakePaper(p) })),
      });
    },
    async setPublished(id, at) {
      bundles.get(id)!.publishedAt = at;
    },
    async library() {
      return [...bundles.values()].filter(
        (b) =>
          !b.hiddenAt && (b.catalogue ? !!b.publishedAt : b.listing === "LIVE"),
      );
    },
    async setListing(id, data) {
      Object.assign(bundles.get(id)!, data);
    },
    async listedWithPaper(paperId) {
      return [...bundles.values()].some(
        (b) =>
          !b.catalogue &&
          !b.hiddenAt &&
          (b.listing === "PENDING" || b.listing === "LIVE") &&
          b.papers.some((x) => x.paper.id === paperId),
      );
    },
    async catalogue() {
      return [...bundles.values()]
        .filter((b) => b.catalogue && !b.hiddenAt)
        .map((b) => ({
          ...b,
          _count: {
            purchases: purchases.filter((p) => p.bundleId === b.id).length,
          },
        }));
    },
    async includedWithPaper(paperId) {
      return [...bundles.values()]
        .filter(
          (b) =>
            b.catalogue &&
            b.publishedAt &&
            !b.hiddenAt &&
            b.papers.some((x) => x.paper.id === paperId),
        )
        .map((b) => b.includedIn);
    },
    async ownedIds(userId) {
      return purchases
        .filter((p) => p.userId === userId)
        .map((p) => p.bundleId);
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
      return [...bundles.values()]
        .filter(
          (b) =>
            purchases.some((p) => p.bundleId === b.id && p.userId === userId) ||
            (b.ownerId === userId && !b.hiddenAt),
        )
        .map((b) => ({
          ...b,
          purchases: purchases.some(
            (p) => p.bundleId === b.id && p.userId === userId,
          )
            ? [{ createdAt: new Date(0) }]
            : [],
          _count: {
            purchases: purchases.filter((p) => p.bundleId === b.id).length,
          },
        }));
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
    planIncludes: (user, plans) =>
      proUsers.has(idOf(user)) && plans.includes("PRO"),
    audit: async (entry) => void audit.push(entry.action),
    cutPercent: async () => 20,
    reviewer: async (user) => idOf(user) === idOf(admin),
  });
  return { service, purchases, state, audit, repo, bundles };
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

  it("keeps library drafts hidden, publishes them to everyone, and opens plan-included ones", async () => {
    const s = setup();
    const library = {
      title: "LDC 2024",
      description: "",
      paperIds: ["p3"],
      rupees: 149,
      includedIn: ["PRO" as const],
    };
    expect(
      (await s.service.adminSave(admin, null, { ...library, paperIds: ["p1"] }))
        .ok,
    ).toBe(false);
    expect(
      (await s.service.adminSave(admin, null, { ...library, rupees: 1 })).ok,
    ).toBe(false);
    const made = await s.service.adminSave(admin, null, library);
    if (!made.ok) throw new Error(made.message);
    // A draft: nobody but its maker sees it.
    expect(await s.service.get(outsider, made.id)).toBeNull();
    expect(await s.service.library(outsider)).toEqual([]);

    await s.service.adminSet(admin, made.id, "publish");
    const seen = await s.service.get(outsider, made.id);
    expect(seen?.have).toBe(false);
    expect(seen?.library).toBe(true);
    expect(seen?.selling).toBe(true);
    // The member's PRO plan includes it: in without paying, papers open.
    const mine = await s.service.get(member, made.id);
    expect(mine?.have && mine.included).toBe(true);
    expect(await s.service.paperAccess(member, "p3")).not.toBeNull();
    expect(await s.service.paperAccess(outsider, "p3")).toBeNull();
    const listed = await s.service.library(member);
    expect(listed.map((b) => [b.id, b.included])).toEqual([[made.id, true]]);

    // Not stopped from its own page: Admin > Papers takes it down, audited.
    expect((await s.service.stop(admin, made.id)).ok).toBe(false);

    // Bought by someone else; then edited, unpublished and taken down.
    expect((await s.service.buy(outsider, made.id)).ok).toBe(true);
    await s.service.adminSave(admin, made.id, {
      ...library,
      title: "LDC 2024 set",
    });
    expect((await s.service.adminList())[0]).toMatchObject({
      title: "LDC 2024 set",
      holders: 1,
    });
    await s.service.adminSet(admin, made.id, "unpublish");
    expect(await s.service.paperAccess(member, "p3")).toBeNull();
    expect(await s.service.paperAccess(outsider, "p3")).not.toBeNull();
    await s.service.adminSet(admin, made.id, "remove");
    expect(await s.service.adminList()).toEqual([]);
    expect(s.audit).toEqual([
      "library.create",
      "library.publish",
      "library.update",
      "library.unpublish",
      "library.remove",
    ]);
  });
});

/** Each paper's key, for listings: p4 is still missing an answer. */
const KEYS: Record<string, number[]> = {
  p1: [1, 2],
  p2: [4, -1],
  p3: [8, 1],
  p4: [1, 0],
};

function storeSetup(opts: { canPrice?: boolean } = {}) {
  const s = setup(opts);
  const told: { userId: string; subject: string }[] = [];
  const store = createStoreListingService({
    bundles: s.repo,
    papers: {
      async findOwned(id, ownerId) {
        return PAPERS[id] === ownerId
          ? ({ id, title: id, questionCount: 2, answerKey: KEYS[id] } as never)
          : null;
      },
    },
    canPrice: async () => s.state.canPrice,
    notify: async (rows) => void told.push(...rows),
    audit: async (entry) => void s.audit.push(entry.action),
    clock: fixedClock("2026-11-12T10:00:00Z"),
  });
  return { ...s, store, told };
}

const sale = {
  title: "LDC 2024 by Anjali",
  description: "Two sets with my keys",
  paperIds: ["p1", "p2"],
  rupees: null,
};

describe("selling in the Store", () => {
  it("lists only the seller's own, fully keyed papers, and a price only for sellers", async () => {
    const s = storeSetup({ canPrice: false });
    expect(
      await s.store.sell(owner, { ...sale, paperIds: ["p1", "p4"] }),
    ).toMatchObject({ ok: false, code: "UNKEYED" });
    expect(
      await s.store.sell(owner, { ...sale, paperIds: ["p3"] }),
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(await s.store.sell(owner, { ...sale, rupees: 149 })).toMatchObject({
      ok: false,
      code: "NOT_SELLER",
    });
    expect((await s.store.sell(owner, sale)).ok).toBe(true);
  });

  it("waits for an admin, then anyone finds it; sending it back needs a note", async () => {
    const s = storeSetup();
    const made = await s.store.sell(owner, sale);
    if (!made.ok) throw new Error(made.message);

    // Waiting: nobody else sees it, but a reviewer reads its papers (not to sit).
    expect(await s.service.library(outsider)).toEqual([]);
    expect(await s.service.get(outsider, made.id)).toBeNull();
    expect(await s.service.paperAccess(admin, "p2")).toEqual({
      canView: true,
      canPractise: false,
      keyOut: true,
    });
    expect(await s.service.paperAccess(outsider, "p2")).toBeNull();
    expect(
      await s.store.adminReview(admin, made.id, "reject", "no"),
    ).toMatchObject({ ok: false, code: "NOTE" });

    expect(
      (await s.store.adminReview(admin, made.id, "approve", null)).ok,
    ).toBe(true);
    expect(s.told).toEqual([
      expect.objectContaining({
        userId: idOf(owner),
        subject: "LDC 2024 by Anjali is live in the Store",
      }),
    ]);
    const item = (await s.service.library(outsider))[0];
    expect(item).toMatchObject({
      id: made.id,
      listing: "LIVE",
      library: false,
    });
    expect((await s.service.claim(outsider, made.id)).ok).toBe(true);
    expect(await s.service.paperAccess(outsider, "p1")).not.toBeNull();

    // Taken down with a note: gone from the Store, kept by whoever has it.
    await s.store.adminReview(
      admin,
      made.id,
      "reject",
      "The key for Q2 is wrong.",
    );
    expect(await s.service.library(member)).toEqual([]);
    expect(await s.service.paperAccess(outsider, "p1")).not.toBeNull();
    expect((await s.service.get(owner, made.id))?.listingNote).toBe(
      "The key for Q2 is wrong.",
    );
    expect(s.audit).toEqual(["store.approve", "store.reject"]);
  });

  it("takes studypods' share of a seller's sale, never of a squad's", async () => {
    const s = storeSetup();
    const made = await s.store.sell(owner, { ...sale, rupees: 149 });
    if (!made.ok) throw new Error(made.message);
    await s.store.adminReview(admin, made.id, "approve", null);
    expect((await s.service.buy(member, made.id)).ok).toBe(true);
    expect(s.purchases.at(-1)).toMatchObject({
      amountPaise: 14900,
      cutPaise: 2980,
    });

    const squad = await s.service.create(owner, input);
    if (!squad.ok) throw new Error(squad.message);
    expect((await s.service.buy(member, squad.id)).ok).toBe(true);
    expect(s.purchases.at(-1)).toMatchObject({ cutPaise: null });
  });

  it("asks a squad bundle into the Store, and the seller can withdraw it", async () => {
    const s = storeSetup();
    const squad = await s.service.create(owner, input);
    if (!squad.ok) throw new Error(squad.message);
    expect((await s.store.list(member, squad.id)).ok).toBe(false);
    expect((await s.store.list(owner, squad.id)).ok).toBe(true);
    expect((await s.service.get(owner, squad.id))?.listing).toBe("PENDING");
    await s.store.adminReview(admin, squad.id, "approve", null);
    // Live: someone outside the squad finds it now.
    expect(await s.service.get(outsider, squad.id)).not.toBeNull();
    expect((await s.store.withdraw(owner, squad.id)).ok).toBe(true);
    expect(await s.service.get(outsider, squad.id)).toBeNull();
    expect(await s.service.get(member, squad.id)).not.toBeNull();
  });
});
