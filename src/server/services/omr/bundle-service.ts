import type { Clock } from "@/lib/clock";
import { MAX_RUPEES, MIN_RUPEES } from "@/lib/squads/pay";
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
  /** Whether this person may open the bundle, and what they are to it. */
  async function reach(user: User, bundle: BundleRow) {
    const owner = bundle.ownerId === user.id;
    const have = owner || !!(await deps.bundles.purchase(bundle.id, user.id));
    if (owner || have) return { owner, have };
    if (bundle.hiddenAt || !bundle.groupId || !bundle.channelId) return null;
    const channel = await deps.channel(user, bundle.groupId, bundle.channelId);
    return channel ? { owner, have } : null;
  }

  function view(bundle: BundleRow, at: { owner: boolean; have: boolean }) {
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
      const selling =
        bundle.pricePaise !== null && !bundle.hiddenAt
          ? await deps.selling(bundle.group?.ownerId ?? bundle.ownerId)
          : false;
      return {
        ...view(bundle, at),
        selling,
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
      if (!(await deps.selling(bundle.group?.ownerId ?? bundle.ownerId)))
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
      return (await deps.bundles.hasPaper(user.id, paperId))
        ? { canView: true, canPractise: true, keyOut: true }
        : null;
    },
  };
}

export type BundleService = ReturnType<typeof createBundleService>;
