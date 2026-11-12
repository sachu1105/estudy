import type { Clock } from "@/lib/clock";
import { fullyKeyed } from "@/lib/omr/store";
import { MAX_RUPEES, MIN_RUPEES } from "@/lib/squads/pay";
import type { AuditEntry } from "@/server/repositories/audit-log-repository";
import type { BundleRepository } from "@/server/repositories/bundle-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import type { PaperRepository } from "@/server/repositories/paper-repository";

import { failure, type Actor, type Result } from "../syllabus/deps";
import { MAX_BUNDLE_PAPERS } from "./bundle-service";

type User = Actor;
type Admin = { id: string; ip?: string | null };

export type StoreListingDeps = {
  bundles: Pick<
    BundleRepository,
    "create" | "find" | "setListing" | "listings"
  >;
  papers: Pick<PaperRepository, "findOwned">;
  /** Whether this person may put a price on things (plan and the admin's switch). */
  canPrice: (user: User) => Promise<boolean>;
  notify: (rows: NewNotification[]) => Promise<unknown>;
  audit: (entry: AuditEntry) => Promise<unknown>;
  clock: Clock;
};

/** What a seller fills in to sell their own papers in the Store. */
export type SellInput = {
  title: string;
  description: string;
  paperIds: string[];
  /** Whole rupees; null for free. */
  rupees: number | null;
};

const GONE = failure("NOT_FOUND", "That bundle is gone.");

/**
 * Selling in the Store. Anyone may list their own papers free; a price needs a plan
 * that sells with paid squads on (as in squads). Every paper needs a complete key. A
 * listing waits for an admin (rule 5), who approves it or sends it back with a note;
 * the seller hears either way. Withdrawing or a take-down never takes it from anyone
 * who already has it.
 */
export function createStoreListingService(deps: StoreListingDeps) {
  /** Each paper is the seller's own and fully keyed. */
  async function checkPapers(user: User, paperIds: string[]) {
    for (const id of paperIds) {
      const paper = await deps.papers.findOwned(id, user.id);
      if (!paper) return failure("NOT_FOUND", "List only your own papers.");
      if (!fullyKeyed(paper.answerKey, paper.questionCount))
        return failure(
          "UNKEYED",
          `Finish the answer key for "${paper.title}" first: every question needs an answer.`,
        );
    }
    return null;
  }

  async function checkPrice(user: User, rupees: number | null) {
    if (rupees === null) return null;
    if (!(await deps.canPrice(user)))
      return failure(
        "NOT_SELLER",
        "A price needs a plan that sells, with paid squads switched on. List it free instead.",
      );
    if (!Number.isInteger(rupees) || rupees < MIN_RUPEES || rupees > MAX_RUPEES)
      return failure(
        "PRICE",
        `Set a price from ₹${MIN_RUPEES} to ₹${MAX_RUPEES}, or make it free.`,
      );
    return null;
  }

  return {
    /** Whether the sell form offers a price. */
    canPrice: (user: User) => deps.canPrice(user),

    /** A new listing from the seller's own papers: one paper, or a bundle of them. */
    async sell(user: User, input: SellInput): Promise<Result<{ id: string }>> {
      const ids = [...new Set(input.paperIds)];
      if (ids.length === 0) return failure("EMPTY", "Pick at least one paper.");
      if (ids.length > MAX_BUNDLE_PAPERS)
        return failure(
          "TOO_MANY",
          `A bundle holds up to ${MAX_BUNDLE_PAPERS} papers.`,
        );
      const bad =
        (await checkPrice(user, input.rupees)) ??
        (await checkPapers(user, ids));
      if (bad) return bad;
      const made = await deps.bundles.create({
        ownerId: user.id,
        title: input.title.trim(),
        description: input.description.trim(),
        pricePaise: input.rupees === null ? null : input.rupees * 100,
        groupId: null,
        channelId: null,
        paperIds: ids,
        listing: "PENDING",
        listedAt: deps.clock.now(),
      });
      return { ok: true, id: made.id };
    },

    /** A bundle the seller already made (say, in a squad), asked into the Store. */
    async list(user: User, id: string): Promise<Result<object>> {
      const bundle = await deps.bundles.find(id);
      if (!bundle || bundle.ownerId !== user.id || bundle.hiddenAt) return GONE;
      if (bundle.catalogue)
        return failure("FORBIDDEN", "It's in the studypods library already.");
      if (bundle.listing === "PENDING" || bundle.listing === "LIVE")
        return { ok: true };
      const bad =
        (await checkPrice(
          user,
          bundle.pricePaise === null ? null : bundle.pricePaise / 100,
        )) ??
        (await checkPapers(
          user,
          bundle.papers.map((p) => p.paper.id),
        ));
      if (bad) return bad;
      await deps.bundles.setListing(id, {
        listing: "PENDING",
        listingNote: null,
        listedAt: deps.clock.now(),
      });
      return { ok: true };
    },

    /** The seller takes it out of the Store (or out of review). Buyers keep it. */
    async withdraw(user: User, id: string): Promise<Result<object>> {
      const bundle = await deps.bundles.find(id);
      if (!bundle || bundle.ownerId !== user.id) return GONE;
      if (bundle.listing)
        await deps.bundles.setListing(id, { listing: null, listingNote: null });
      return { ok: true };
    },

    /** Admin > Papers: sellers' listings, waiting ones first, with each paper's key. */
    async adminListings() {
      const rows = await deps.bundles.listings();
      return rows.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        pricePaise: b.pricePaise,
        listing: b.listing as "PENDING" | "LIVE",
        listedAt: b.listedAt,
        seller: b.owner,
        squad: b.group?.name ?? null,
        holders: b._count.purchases,
        papers: b.papers.map(({ paper }) => ({
          id: paper.id,
          title: paper.title,
          questions: paper.questionCount,
          keyed: fullyKeyed(paper.answerKey, paper.questionCount),
          official: paper.keySource === "OFFICIAL",
        })),
      }));
    },

    /**
     * Admin > Papers: approve a waiting listing, or send one back (from review, or a
     * live one taken down) with a note. Audited; the seller is told either way.
     */
    async adminReview(
      admin: Admin,
      id: string,
      op: "approve" | "reject",
      note: string | null,
    ): Promise<Result<object>> {
      const bundle = await deps.bundles.find(id);
      if (!bundle || bundle.catalogue || bundle.hiddenAt) return GONE;
      if (op === "approve" && bundle.listing !== "PENDING")
        return failure(
          "STATE",
          "Only a listing waiting for review is approved.",
        );
      if (
        op === "reject" &&
        bundle.listing !== "PENDING" &&
        bundle.listing !== "LIVE"
      )
        return failure("STATE", "That listing isn't in review or live.");
      const why = note?.trim() ?? "";
      if (op === "reject" && why.length < 5)
        return failure("NOTE", "Tell the seller what to change.");

      await deps.bundles.setListing(id, {
        listing: op === "approve" ? "LIVE" : "REJECTED",
        listingNote: op === "approve" ? null : why,
      });
      await deps.audit({
        actorId: admin.id,
        action: `store.${op}`,
        targetId: id,
        metadata: { seller: bundle.ownerId, was: bundle.listing ?? "" },
        ip: admin.ip ?? null,
      });
      // Never names the admin: the note speaks for studypods.
      await deps.notify([
        {
          userId: bundle.ownerId,
          actorId: null,
          kind: "STORE_LISTING",
          groupId: null,
          href: `/bundles/${id}`,
          subject:
            op === "approve"
              ? `${bundle.title} is live in the Store`
              : `${bundle.title} needs changes`,
        },
      ]);
      return { ok: true };
    },
  };
}

export type StoreListingService = ReturnType<typeof createStoreListingService>;
