import type { Clock } from "@/lib/clock";
import { joinModeOf } from "@/lib/squads/access";
import { canModerate } from "@/lib/squads/roles";
import {
  passEnds,
  stillValid,
  type ChannelPrice,
  type SquadOffer,
} from "@/lib/squads/pay";
import type { ChannelRepository } from "@/server/repositories/channel-repository";
import type { GroupRepository } from "@/server/repositories/group-repository";
import type { PassRepository } from "@/server/repositories/pass-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";
import type { GroupService } from "./group-service";

type User = Actor;

/**
 * Takes a payment. Only a demo for now: nothing is charged and the reference is made up.
 * Razorpay slots in here later, behind the same call.
 */
export type Checkout = {
  charge(input: {
    userId: string;
    amountPaise: number;
    description: string;
  }): Promise<{ provider: "DEMO" | "RAZORPAY"; ref: string }>;
};

export type SquadPayDeps = {
  groups: GroupService;
  repo: Pick<GroupRepository, "setOffer" | "addMember">;
  channels: Pick<ChannelRepository, "find" | "setPrice">;
  passes: PassRepository;
  checkout: Checkout;
  clock: Clock;
  /** The admin's switch (Admin > Plans): off, nobody sets a price or sells a pass. */
  salesOn: () => Promise<boolean>;
  /** Whether this person's plan lets them charge (ELITE, paid or granted). */
  canSell: (user: User) => boolean;
  /** The same, for a squad's owner, by id. */
  ownerCanSell: (ownerId: string) => Promise<boolean>;
};

const SALES_OFF = failure(
  "SALES_OFF",
  "Paid squads are switched off on studypods right now.",
);
const NOT_SELLER = failure(
  "NOT_SELLER",
  "Charging for a squad or channel comes with the Elite plan.",
);
const PAUSED = failure(
  "PAUSED",
  "This squad isn't taking payments right now. Try again later.",
);
const ONLY_OWNER = failure(
  "FORBIDDEN",
  "Only the squad's owner sets prices: payments go to them.",
);

const toPaise = (rupees: number) => rupees * 100;

/**
 * Paid squads and paid channels: the owner sets a price, others buy a pass. A pass to a
 * squad is a membership that runs until `paidUntil`; a pass to a channel opens it.
 * Every payment is a SquadPass row, never edited (rule 6).
 */
export function createSquadPay(deps: SquadPayDeps) {
  const now = () => deps.clock.now();

  /** May this person put a price on things at all? */
  async function sellerCheck(user: User) {
    if (!(await deps.salesOn())) return SALES_OFF;
    return deps.canSell(user) ? null : NOT_SELLER;
  }

  /** Whether a squad's passes are on sale now: switched on, and its owner may sell. */
  async function selling(ownerId: string) {
    return (await deps.salesOn()) && (await deps.ownerCanSell(ownerId));
  }

  async function owner(user: User, groupId: string) {
    const ok = await deps.groups.require(user, groupId, "OWNER");
    return "error" in ok ? null : ok;
  }

  return {
    selling,

    /** Whether the price fields show for this person when making a squad or channel. */
    async canPrice(user: User) {
      return !(await sellerCheck(user));
    },

    /** The owner prices the squad, changes what it says, or makes it free (null). */
    async setSquadOffer(
      user: User,
      groupId: string,
      offer: SquadOffer | null,
    ): Promise<Result<object>> {
      if (!(await owner(user, groupId))) return ONLY_OWNER;
      if (offer) {
        const no = await sellerCheck(user);
        if (no) return no;
      }
      await deps.repo.setOffer(groupId, {
        pricePaise: offer ? toPaise(offer.rupees) : null,
        accessDays: offer?.accessDays ?? null,
        offer: offer?.offer ?? null,
        demoUrl: offer?.demoUrl ?? null,
      });
      return { ok: true };
    },

    /** The owner prices one channel, or makes it free (null). */
    async setChannelPrice(
      user: User,
      groupId: string,
      channelId: string,
      price: ChannelPrice | null,
    ): Promise<Result<object>> {
      if (!(await owner(user, groupId))) return ONLY_OWNER;
      if (price) {
        const no = await sellerCheck(user);
        if (no) return no;
      }
      if (!(await deps.channels.find(groupId, channelId)))
        return failure("NOT_FOUND", "That channel is gone.");
      await deps.channels.setPrice(
        channelId,
        price
          ? { pricePaise: toPaise(price.rupees), accessDays: price.accessDays }
          : null,
      );
      return { ok: true };
    },

    /** Pay for a squad: in at once, or back in after a pass ran out. */
    async buySquad(
      user: User,
      groupId: string,
    ): Promise<Result<{ until: Date | null }>> {
      const found = await deps.groups.memberOf(user, groupId);
      if (!found || found.group.hiddenAt)
        return failure("NOT_FOUND", "That squad doesn't exist any more.");
      const { group, membership, lapsedAt } = found;
      if (group.pricePaise === null)
        return failure("FREE", "This squad is free. Join it from its page.");
      if (membership?.role && membership.role !== "MEMBER")
        return failure("STAFF", "You run this squad: you're already in.");
      if (membership && membership.paidUntil === null)
        return failure("HAVE_IT", "You're already in this squad, for good.");
      if (!membership && joinModeOf(group) === "INVITE_ONLY")
        return failure(
          "INVITE_ONLY",
          "This squad takes members by invite only. Ask a member for an invite link.",
        );
      if (!(await selling(group.ownerId))) return PAUSED;
      const blocked = await deps.groups.canAdmit(
        user,
        group,
        !!membership || !!lapsedAt,
      );
      if (blocked) return blocked;

      const until = passEnds(membership?.paidUntil, now(), group.accessDays);
      const paid = await deps.checkout.charge({
        userId: user.id,
        amountPaise: group.pricePaise,
        description: `Pass to ${group.name}`,
      });
      await deps.passes.create({
        userId: user.id,
        groupId,
        channelId: null,
        amountPaise: group.pricePaise,
        provider: paid.provider,
        providerRef: paid.ref,
        accessUntil: until,
      });
      await deps.repo.addMember(groupId, user.id, until);
      return { ok: true, until };
    },

    /** Pay for one channel of a squad you're in. */
    async buyChannel(
      user: User,
      groupId: string,
      channelId: string,
    ): Promise<Result<{ until: Date | null }>> {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return ok.error!;
      const channel = await deps.channels.find(groupId, channelId);
      if (!channel) return failure("NOT_FOUND", "That channel is gone.");
      if (channel.pricePaise === null)
        return failure("FREE", "This channel is free to every member.");
      if (canModerate(ok.me.role))
        return failure(
          "STAFF",
          "You run this squad: the channel is open to you.",
        );
      const current = await deps.passes.latest(user.id, groupId, channelId);
      if (current && current.accessUntil === null)
        return failure("HAVE_IT", "You already hold a pass to this channel.");
      if (!(await selling(ok.group.ownerId))) return PAUSED;

      const live =
        current && stillValid(current.accessUntil, now())
          ? current.accessUntil
          : null;
      const until = passEnds(live, now(), channel.accessDays);
      const paid = await deps.checkout.charge({
        userId: user.id,
        amountPaise: channel.pricePaise,
        description: `Pass to #${channel.name}`,
      });
      await deps.passes.create({
        userId: user.id,
        groupId,
        channelId,
        amountPaise: channel.pricePaise,
        provider: paid.provider,
        providerRef: paid.ref,
        accessUntil: until,
      });
      return { ok: true, until };
    },

    /** What a paid channel costs, for a member who can't open it yet. */
    async lockedChannel(user: User, groupId: string, channelId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const channel = await deps.channels.find(groupId, channelId);
      if (!channel || channel.pricePaise === null) return null;
      const [last, facts] = await Promise.all([
        deps.passes.latest(user.id, groupId, channelId),
        deps.passes.channelFacts(groupId, channelId, now()),
      ]);
      return {
        squad: {
          id: groupId,
          name: facts.group?.name ?? "",
          cover: facts.group?.cover ?? null,
          visibility: facts.group?.visibility ?? "PUBLIC",
        },
        owner: {
          id: ok.group.ownerId,
          name: facts.group?.owner.displayName ?? "",
          avatarUrl: facts.group?.owner.avatarUrl ?? null,
        },
        /** Counts only: the messages themselves stay behind the pass. */
        stats: {
          messages: facts.messages,
          holders: facts.holders,
          lastAt: facts.lastAt,
        },
        channel: {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          topic: channel.topic,
          pricePaise: channel.pricePaise,
          accessDays: channel.accessDays,
        },
        /** When their last pass ran out, if they had one. */
        endedAt: last?.accessUntil ?? null,
        selling: await selling(ok.group.ownerId),
      };
    },

    /**
     * Who holds a live pass to what, by member, for those who run the squad (the owner
     * sees who paid; admins and moderators see who may be in a paid channel).
     */
    async passHolders(user: User, groupId: string) {
      const ok = await deps.groups.require(user, groupId, "MODERATOR");
      if ("error" in ok) return null;
      const byUser = new Map<
        string,
        { channel: string | null; until: Date | null }[]
      >();
      for (const p of await deps.passes.live(groupId, now())) {
        if (p.channel?.deletedAt) continue;
        const what = { channel: p.channel?.name ?? null, until: p.accessUntil };
        const list = byUser.get(p.userId) ?? [];
        // Newest first: the first pass seen for a squad or channel is the one that counts.
        if (!list.some((x) => x.channel === what.channel)) list.push(what);
        byUser.set(p.userId, list);
      }
      return byUser;
    },

    /** What the squad has taken in, for its owner. */
    async sales(user: User, groupId: string) {
      if (!(await owner(user, groupId))) return null;
      return deps.passes.sales(groupId, 20);
    },
  };
}

export type SquadPay = ReturnType<typeof createSquadPay>;
