import type { Clock } from "@/lib/clock";
import { MAX_RUPEES, MIN_RUPEES } from "@/lib/squads/pay";
import type { AuditEntry } from "@/server/repositories/audit-log-repository";
import type {
  BundleRepository,
  BundleRow,
} from "@/server/repositories/bundle-repository";
import type { PaperRepository } from "@/server/repositories/paper-repository";
import type { Checkout } from "@/server/services/groups/squad-pay";

import { failure, type Actor, type Result } from "../syllabus/deps";

type User = Actor;

export type BundleDeps = {
  bundles: BundleRepository;
  papers: Pick<PaperRepository, "findOwned">;
  /** The channel, when this person may open it: their role, whether they may post, if muted. */
  channel: (
    user: User,
    groupId: string,
    channelId: string,
  ) => Promise<{ canPost: boolean; muted: boolean; role: string } | null>;
  /** Whether this person may put a price on things (plan and the admin's switch). */
  canPrice: (user: User) => Promise<boolean>;
  /** Whether sales are on for things this squad owner sells. */
  selling: (ownerId: string) => Promise<boolean>;
  checkout: Checkout;
  clock: Clock;
  /** Whether a library bundle's plans include this person's real plan (entitlements). */
  planIncludes: (user: User, plans: readonly LibraryPlan[]) => boolean;
  audit: (entry: AuditEntry) => Promise<unknown>;
};

export type LibraryPlan = "FREE" | "PRO" | "ELITE";

/** A library bundle as Admin > Papers saves it. A single paper is a bundle of one. */
export type LibraryInput = {
  title: string;
  description: string;
  paperIds: string[];
  rupees: number | null;
  includedIn: ("PRO" | "ELITE")[];
};

export type BundleInput = {
  groupId: string;
  channelId: string;
  title: string;
  description: string;
  paperIds: string[];
  /** Whole rupees; null for free. */
  rupees: number | null;
};

export const MAX_BUNDLE_PAPERS = 50;
const NOT_FOUND = failure(
  "NOT_FOUND",
  "That bundle is gone or isn't open to you.",
);

/**
 * Bundles of question papers in squad channels. Anyone who can post there may give a
 * bundle of their own papers away; only the squad's owner, on a plan that sells and with
 * sales switched on, may charge for one (payments go to them, as with squad passes).
 * Having a bundle means sitting every paper in it, key and all, for good: stopping
 * sales or leaving the squad doesn't take it away.
 */
export function createBundleService(deps: BundleDeps) {
  const live = (b: BundleRow) => b.catalogue && !!b.publishedAt && !b.hiddenAt;

  /**
   * Whether this person may open the bundle, and what they are to it: its maker, someone
   * who bought or added it, or someone whose plan includes it (a library bundle).
   */
  async function reach(user: User, bundle: BundleRow) {
    const owner = bundle.ownerId === user.id;
    const included = live(bundle) && deps.planIncludes(user, bundle.includedIn);
    const have =
      owner || included || !!(await deps.bundles.purchase(bundle.id, user.id));
    const at = { owner, have, included };
    if (have) return at;
    if (bundle.hiddenAt) return null;
    if (bundle.catalogue) return live(bundle) ? at : null;
    if (!bundle.groupId || !bundle.channelId) return null;
    const channel = await deps.channel(user, bundle.groupId, bundle.channelId);
    return channel ? at : null;
  }

  /** On sale now: the library always sells (demo payments); a squad's, per its owner. */
  const selling = async (bundle: BundleRow) =>
    bundle.pricePaise !== null &&
    !bundle.hiddenAt &&
    (bundle.catalogue ||
      (await deps.selling(bundle.group?.ownerId ?? bundle.ownerId)));

  function view(
    bundle: BundleRow,
    at: { owner: boolean; have: boolean; included?: boolean },
  ) {
    return {
      id: bundle.id,
      title: bundle.title,
      description: bundle.description,
      pricePaise: bundle.pricePaise,
      by: bundle.owner.displayName,
      squad: bundle.group
        ? { id: bundle.group.id, name: bundle.group.name }
        : null,
      channel: bundle.channel,
      hidden: !!bundle.hiddenAt,
      library: bundle.catalogue,
      includedIn: bundle.includedIn,
      included: at.included ?? false,
      owner: at.owner,
      have: at.have,
      papers: bundle.papers.map(({ paper }) => ({
        id: paper.id,
        title: paper.title,
        questions: paper.questionCount,
        limitMin: paper.limitMin,
      })),
    };
  }

  return {
    /** Whether the price field shows: the squad's owner, allowed to sell. */
    async canCharge(user: User, groupId: string, channelId: string) {
      const channel = await deps.channel(user, groupId, channelId);
      return channel?.role === "OWNER" && (await deps.canPrice(user));
    },

    async create(
      user: User,
      input: BundleInput,
    ): Promise<Result<{ id: string }>> {
      const ids = [...new Set(input.paperIds)];
      if (ids.length === 0) return failure("EMPTY", "Pick at least one paper.");
      if (ids.length > MAX_BUNDLE_PAPERS)
        return failure(
          "TOO_MANY",
          `A bundle holds up to ${MAX_BUNDLE_PAPERS} papers.`,
        );
      const channel = await deps.channel(user, input.groupId, input.channelId);
      if (!channel) return failure("NOT_FOUND", "That channel is gone.");
      if (channel.muted)
        return failure("MUTED", "A squad admin has muted you for now.");
      if (!channel.canPost)
        return failure(
          "FORBIDDEN",
          "Only the squad's admins post in this channel.",
        );
      if (input.rupees !== null) {
        if (channel.role !== "OWNER")
          return failure(
            "FORBIDDEN",
            "Only the squad's owner charges for a bundle: payments go to them.",
          );
        if (!(await deps.canPrice(user)))
          return failure(
            "NOT_SELLER",
            "Charging for a bundle needs paid squads switched on and a plan that sells.",
          );
        if (
          !Number.isInteger(input.rupees) ||
          input.rupees < MIN_RUPEES ||
          input.rupees > MAX_RUPEES
        )
          return failure(
            "PRICE",
            `Set a price from ₹${MIN_RUPEES} to ₹${MAX_RUPEES}.`,
          );
      }
      for (const id of ids)
        if (!(await deps.papers.findOwned(id, user.id)))
          return failure("NOT_FOUND", "A bundle holds only your own papers.");
      const made = await deps.bundles.create({
        ownerId: user.id,
        title: input.title.trim(),
        description: input.description.trim(),
        pricePaise: input.rupees === null ? null : input.rupees * 100,
        groupId: input.groupId,
        channelId: input.channelId,
        paperIds: ids,
      });
      return { ok: true, id: made.id };
    },

    /** The bundle's page: what's in it, its price, and whether the reader has it. */
    async get(user: User, id: string) {
      const bundle = await deps.bundles.find(id);
      if (!bundle) return null;
      const at = await reach(user, bundle);
      if (!at) return null;
      return {
        ...view(bundle, at),
        selling: await selling(bundle),
        holders: at.owner ? await deps.bundles.countPurchases(bundle.id) : null,
      };
    },

    /** Add a free bundle to your tests. Adding it twice keeps the first. */
    async claim(user: User, id: string): Promise<Result<object>> {
      const bundle = await deps.bundles.find(id);
      if (!bundle) return NOT_FOUND;
      const at = await reach(user, bundle);
      if (!at) return NOT_FOUND;
      if (bundle.pricePaise !== null)
        return failure("PRICED", "This bundle is paid for, not added free.");
      if (at.have) return { ok: true };
      await deps.bundles.addPurchase({
        bundleId: id,
        userId: user.id,
        amountPaise: 0,
        provider: null,
        providerRef: null,
      });
      return { ok: true };
    },

    /** Pay for a bundle (demo payments for now: nothing is charged). */
    async buy(user: User, id: string): Promise<Result<object>> {
      const bundle = await deps.bundles.find(id);
      if (!bundle) return NOT_FOUND;
      const at = await reach(user, bundle);
      if (!at || bundle.hiddenAt) return NOT_FOUND;
      if (bundle.pricePaise === null)
        return failure("FREE", "This bundle is free: add it to your tests.");
      if (at.have) return failure("HAVE_IT", "You already have this bundle.");
      if (!(await selling(bundle)))
        return failure(
          "PAUSED",
          "This bundle isn't on sale right now. Try again later.",
        );
      const paid = await deps.checkout.charge({
        userId: user.id,
        amountPaise: bundle.pricePaise,
        description: `Bundle: ${bundle.title}`,
      });
      await deps.bundles.addPurchase({
        bundleId: id,
        userId: user.id,
        amountPaise: bundle.pricePaise,
        provider: paid.provider,
        providerRef: paid.ref,
      });
      return { ok: true };
    },

    /** The owner stops offering it. Whoever has it keeps it. */
    async stop(user: User, id: string): Promise<Result<object>> {
      const bundle = await deps.bundles.find(id);
      if (!bundle || bundle.ownerId !== user.id)
        return failure(
          "FORBIDDEN",
          "Only whoever made this bundle can stop it.",
        );
      if (!bundle.hiddenAt) await deps.bundles.hide(id, deps.clock.now());
      return { ok: true };
    },

    /** The bundles on this person's Tests page: ones they have and ones they made. */
    async mine(user: User) {
      const rows = await deps.bundles.forUser(user.id);
      return rows.map((b) =>
        view(b, { owner: b.ownerId === user.id, have: true }),
      );
    },

    /** Someone who has a bundle holding this paper sits it, key and all. */
    async paperAccess(user: User, paperId: string) {
      const has =
        (await deps.bundles.hasPaper(user.id, paperId)) ||
        (await deps.bundles.includedWithPaper(paperId)).some((plans) =>
          deps.planIncludes(user, plans),
        );
      return has ? { canView: true, canPractise: true, keyOut: true } : null;
    },

    /** The library as this person sees it: every published bundle, and which they have. */
    async library(user: User) {
      const rows = await deps.bundles.library();
      const mine = new Set(await deps.bundles.ownedIds(user.id));
      return rows.map((b) => {
        const included = deps.planIncludes(user, b.includedIn);
        return view(b, {
          owner: b.ownerId === user.id,
          have: included || mine.has(b.id),
          included,
        });
      });
    },

    /** Admin > Papers: every library bundle, drafts too, with how many have each. */
    async adminList() {
      const rows = await deps.bundles.catalogue();
      return rows.map((b) => ({
        ...view(b, { owner: false, have: false }),
        publishedAt: b.publishedAt,
        holders: b._count.purchases,
      }));
    },

    /**
     * Admin > Papers: save a library bundle made from the admin's own papers; a new one
     * starts as a draft. The caller has checked the admin area (rule 9).
     */
    async adminSave(
      admin: { id: string; ip?: string | null },
      id: string | null,
      input: LibraryInput,
    ): Promise<Result<{ id: string }>> {
      const ids = [...new Set(input.paperIds)];
      if (ids.length === 0) return failure("EMPTY", "Pick at least one paper.");
      if (ids.length > MAX_BUNDLE_PAPERS)
        return failure(
          "TOO_MANY",
          `A bundle holds up to ${MAX_BUNDLE_PAPERS} papers.`,
        );
      if (
        input.rupees !== null &&
        (!Number.isInteger(input.rupees) ||
          input.rupees < MIN_RUPEES ||
          input.rupees > MAX_RUPEES)
      )
        return failure(
          "PRICE",
          `Set a price from ₹${MIN_RUPEES} to ₹${MAX_RUPEES}, or make it free.`,
        );
      for (const paperId of ids)
        if (!(await deps.papers.findOwned(paperId, admin.id)))
          return failure(
            "NOT_FOUND",
            "Pick from your own papers: upload them in Tests first.",
          );
      const fields = {
        title: input.title.trim(),
        description: input.description.trim(),
        pricePaise: input.rupees === null ? null : input.rupees * 100,
        includedIn: [...new Set(input.includedIn)],
        paperIds: ids,
      };
      let bundleId = id;
      if (bundleId) {
        const existing = await deps.bundles.find(bundleId);
        if (!existing?.catalogue || existing.hiddenAt)
          return failure("NOT_FOUND", "That library bundle is gone.");
        await deps.bundles.update(bundleId, fields);
      } else {
        const made = await deps.bundles.create({
          ...fields,
          ownerId: admin.id,
          groupId: null,
          channelId: null,
          catalogue: true,
          publishedAt: null,
        });
        bundleId = made.id;
      }
      await deps.audit({
        actorId: admin.id,
        action: id ? "library.update" : "library.create",
        targetId: bundleId,
        metadata: {
          papers: ids.length,
          pricePaise: fields.pricePaise,
          includedIn: fields.includedIn.join(","),
        },
        ip: admin.ip ?? null,
      });
      return { ok: true, id: bundleId };
    },

    /** Admin > Papers: publish to everyone, back to a draft, or take it down. */
    async adminSet(
      admin: { id: string; ip?: string | null },
      id: string,
      op: "publish" | "unpublish" | "remove",
    ): Promise<Result<object>> {
      const bundle = await deps.bundles.find(id);
      if (!bundle?.catalogue || bundle.hiddenAt)
        return failure("NOT_FOUND", "That library bundle is gone.");
      const now = deps.clock.now();
      if (op === "publish") await deps.bundles.setPublished(id, now);
      if (op === "unpublish") await deps.bundles.setPublished(id, null);
      if (op === "remove") await deps.bundles.hide(id, now);
      await deps.audit({
        actorId: admin.id,
        action: `library.${op}`,
        targetId: id,
        ip: admin.ip ?? null,
      });
      return { ok: true };
    },
  };
}

export type BundleService = ReturnType<typeof createBundleService>;
