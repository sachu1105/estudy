import type { Clock } from "@/lib/clock";
import { NOTE_MAX, pairOf } from "@/lib/friends/pair";
import { handleSchema, starterHandle } from "@/lib/profile/profile";
import type { UserEvents } from "@/server/realtime/types";
import type { DmRepository } from "@/server/repositories/dm-repository";
import type {
  FriendRepository,
  FriendshipRow,
} from "@/server/repositories/friend-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import { MAX_BEAT_SECONDS } from "@/server/services/progress/session-service";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";

export type FriendDeps = {
  friends: FriendRepository;
  dms: Pick<DmRepository, "ensureThread" | "send">;
  users: { claimHandle(id: string, handle: string): Promise<boolean> };
  notify: (rows: NewNotification[]) => Promise<void>;
  events: UserEvents;
  clock: Clock;
  /** A few random characters to keep a starter username unique. */
  suffix: () => string;
};

/** Search starts at this many characters, and shows at most this many people. */
export const SEARCH_MIN = 2;
const SEARCH_TAKE = 8;

export type SearchStatus = "none" | "friends" | "sent" | "received";

/** A timer silent this long has stopped: presence says nothing beyond it. */
const PRESENCE_MS = 3 * 60_000;

// One answer for "no such user" and "blocked", so a block can't be probed.
const NO_ONE = failure(
  "NOT_FOUND",
  "No one goes by that username. Check the spelling and try again.",
);
const GONE = failure("NOT_FOUND", "That request is no longer there.");

export type Person = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  handle: string | null;
};

/** Friends and friend requests, as in Discord: ask by username, they say yes or no. */
export function createFriendService(deps: FriendDeps) {
  const now = () => deps.clock.now();
  const otherIn = (row: FriendshipRow, me: string): Person =>
    row.userAId === me ? row.userB : row.userA;
  const changed = (...ids: string[]) =>
    deps.events.emit(ids, { type: "friends" });

  /** The pending request this person may answer or take back, or null. */
  async function mine(user: Actor, friendshipId: string) {
    const row = await deps.friends.byId(friendshipId);
    if (!row || (row.userAId !== user.id && row.userBId !== user.id))
      return null;
    return row;
  }

  async function acceptRow(user: Actor, row: FriendshipRow) {
    const at = now();
    await deps.friends.accept(row.id, at);
    // The note they sent with the request opens the chat, as written when they asked.
    if (row.note) {
      const thread = await deps.dms.ensureThread(
        pairOf(row.userAId, row.userBId),
        row.createdAt,
      );
      await deps.dms.send(thread.id, row.requesterId, row.note, row.createdAt);
    }
    await deps.notify([
      {
        userId: row.requesterId,
        actorId: user.id,
        kind: "FRIEND_ACCEPTED",
        groupId: null,
        href: `/groups/friends/dm/${user.id}`,
        subject: "",
      },
    ]);
    await changed(row.userAId, row.userBId);
  }

  return {
    /**
     * The person's username, made now if they have none yet (accounts from before
     * usernames were given to everyone, or seeded ones).
     */
    async ensureHandle(user: Actor & { displayName: string }) {
      const me = await deps.friends.person(user.id);
      if (me?.handle) return me.handle;
      for (let i = 0; i < 3; i++) {
        const handle = starterHandle(user.displayName, deps.suffix());
        if (await deps.users.claimHandle(user.id, handle)) return handle;
      }
      return null;
    },

    /** Friends (who's studying now), requests both ways, and who they've blocked. */
    async overview(user: Actor) {
      const [rows, blocked] = await Promise.all([
        deps.friends.listFor(user.id),
        deps.friends.blocked(user.id),
      ]);
      const friends = rows
        .filter((r) => r.status === "ACCEPTED")
        .map((r) => ({ friendshipId: r.id, ...otherIn(r, user.id) }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      const at = now();
      const live = await deps.friends.studying(
        friends.map((f) => f.id),
        new Date(at.getTime() - PRESENCE_MS),
      );
      const minutes = new Map(
        live.map((s) => {
          const since = Math.floor(
            (at.getTime() - s.lastBeatAt.getTime()) / 1000,
          );
          const seconds =
            s.activeSeconds +
            (s.paused ? 0 : Math.max(0, Math.min(MAX_BEAT_SECONDS, since)));
          return [s.userId, Math.floor(seconds / 60)];
        }),
      );
      const pending = rows.filter((r) => r.status === "PENDING");
      const request = (r: FriendshipRow) => ({
        friendshipId: r.id,
        note: r.note,
        at: r.createdAt,
        ...otherIn(r, user.id),
      });
      return {
        friends: friends.map((f) => ({
          ...f,
          studyingMinutes: minutes.get(f.id) ?? null,
        })),
        incoming: pending.filter((r) => r.requesterId !== user.id).map(request),
        outgoing: pending.filter((r) => r.requesterId === user.id).map(request),
        blocked: blocked.map((b) => b.blocked),
      };
    },

    incomingCount: (user: Actor) => deps.friends.incomingCount(user.id),

    /** Whether the person is public (in search, open to requests). */
    isFindable: (user: Actor) => deps.friends.findable(user.id),

    /**
     * People to add, by name or username, as the person types. Only those who chose to
     * be found; each with where things stand between the two of them.
     */
    async search(user: Actor, input: string) {
      const text = input.trim().replace(/^@/, "").slice(0, 40);
      if (text.length < SEARCH_MIN) return [];
      const [found, rows] = await Promise.all([
        deps.friends.search(user.id, text, SEARCH_TAKE),
        deps.friends.listFor(user.id),
      ]);
      const between = new Map(
        rows.map((r) => [r.userAId === user.id ? r.userBId : r.userAId, r]),
      );
      return found.map((p) => {
        const row = between.get(p.id);
        const status: SearchStatus = !row
          ? "none"
          : row.status === "ACCEPTED"
            ? "friends"
            : row.requesterId === user.id
              ? "sent"
              : "received";
        return {
          ...p,
          handle: p.handle!,
          status,
          friendshipId: row?.id ?? null,
        };
      });
    },

    /** Whether two people are friends now. */
    async areFriends(a: string, b: string) {
      const row = await deps.friends.find(pairOf(a, b));
      return row?.status === "ACCEPTED";
    },

    /**
     * Asks someone by their username. If they had already asked you, this says yes to
     * them instead, as Discord does.
     */
    async request(
      user: Actor,
      input: { handle: string; note: string | null },
    ): Promise<Result<{ name: string; accepted: boolean }>> {
      const parsed = handleSchema.safeParse(input.handle.replace(/^@/, ""));
      if (!parsed.success) return NO_ONE;
      const note = input.note?.trim().slice(0, NOTE_MAX) || null;
      const target = await deps.friends.byHandle(parsed.data);
      if (!target) return NO_ONE;
      if (target.id === user.id)
        return failure("SELF", "That's your own username.");
      if (await deps.friends.blockedEither(user.id, target.id)) return NO_ONE;

      const pair = pairOf(user.id, target.id);
      const existing = await deps.friends.find(pair);
      if (existing?.status === "ACCEPTED")
        return failure(
          "ALREADY",
          `You're already friends with ${target.displayName}.`,
        );
      if (existing?.requesterId === user.id)
        return failure(
          "ALREADY",
          `You've already sent ${target.displayName} a request.`,
        );
      if (existing) {
        await acceptRow(user, existing);
        return { ok: true, name: target.displayName, accepted: true };
      }
      // A private person can't be asked: they make friends by asking themselves. The
      // answer matches "no such username", so being private stays private.
      if (!target.findable) return NO_ONE;

      await deps.friends.create({
        ...pair,
        requesterId: user.id,
        note,
        createdAt: now(),
      });
      await deps.notify([
        {
          userId: target.id,
          actorId: user.id,
          kind: "FRIEND_REQUEST",
          groupId: null,
          href: "/groups/friends?tab=pending",
          subject: "",
        },
      ]);
      await changed(user.id, target.id);
      return { ok: true, name: target.displayName, accepted: false };
    },

    /** Says yes to a request sent to this person. */
    async accept(user: Actor, friendshipId: string): Promise<Result<object>> {
      const row = await mine(user, friendshipId);
      if (!row || row.status !== "PENDING" || row.requesterId === user.id)
        return GONE;
      await acceptRow(user, row);
      return { ok: true };
    },

    /** Declines a request, takes back one they sent, or ends a friendship. */
    async drop(user: Actor, friendshipId: string): Promise<Result<object>> {
      const row = await mine(user, friendshipId);
      if (!row) return GONE;
      await deps.friends.remove(row.id);
      await changed(row.userAId, row.userBId);
      return { ok: true };
    },

    /** Blocks someone: any friendship or request between them ends, and no new ones. */
    async block(user: Actor, otherId: string): Promise<Result<object>> {
      if (otherId === user.id)
        return failure("SELF", "You can't block yourself.");
      const other = await deps.friends.person(otherId);
      if (!other)
        return failure("NOT_FOUND", "That person isn't here anymore.");
      const row = await deps.friends.find(pairOf(user.id, otherId));
      if (row) await deps.friends.remove(row.id);
      await deps.friends.block(user.id, otherId);
      await changed(user.id, otherId);
      return { ok: true };
    },

    async unblock(user: Actor, otherId: string): Promise<Result<object>> {
      await deps.friends.unblock(user.id, otherId);
      await changed(user.id);
      return { ok: true };
    },
  };
}

export type FriendService = ReturnType<typeof createFriendService>;
