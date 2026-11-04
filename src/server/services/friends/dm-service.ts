import type { Clock } from "@/lib/clock";
import { DM_MAX, pairOf, sideOf } from "@/lib/friends/pair";
import type { MessageView } from "@/lib/squads/chat-types";
import type { UserEvent, UserEvents } from "@/server/realtime/types";
import type { DmRepository, DmRow } from "@/server/repositories/dm-repository";
import type { FriendRepository } from "@/server/repositories/friend-repository";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";

export type DmDeps = {
  dms: DmRepository;
  friends: Pick<FriendRepository, "find" | "person" | "blockedEither">;
  events: UserEvents;
  clock: Clock;
};

const PAGE = 50;
const NOT_YOURS = failure("NOT_FOUND", "That message is no longer there.");

/** A direct message in the shape the chat draws (no squad extras: no polls or tests). */
export function dmView(row: DmRow, me: string): MessageView {
  const deleted = !!row.deletedAt;
  return {
    id: row.id,
    body: deleted ? "" : row.body,
    deleted,
    hidden: false,
    edited: !!row.editedAt,
    at: row.createdAt.toISOString(),
    author: row.author,
    mentions: [],
    replyTo: null,
    item: null,
    reactions: [],
    mine: row.authorId === me,
    canDelete: row.authorId === me && !deleted,
    kind: "TEXT",
    doubt: null,
    answer: null,
    poll: null,
    test: null,
  };
}

/**
 * One-to-one chats between friends. Only the two people in a chat ever read it (rule 15).
 * Writing needs a friendship and no block; a chat outlives a friendship as history.
 */
export function createDmService(deps: DmDeps) {
  const now = () => deps.clock.now();
  const emit = (
    users: [string, string],
    action: "new" | "edit" | "delete",
    message: { id: string; authorId: string },
  ) => {
    const event: UserEvent = {
      type: "dm",
      action,
      users,
      messageId: message.id,
      authorId: message.authorId,
    };
    return deps.events.emit(users, event);
  };

  /** Whether `user` may write to `otherId` now, and if not, why. */
  async function sendable(user: Actor, otherId: string, name: string) {
    const [friendship, blocked] = await Promise.all([
      deps.friends.find(pairOf(user.id, otherId)),
      deps.friends.blockedEither(user.id, otherId),
    ]);
    if (blocked) return `You can't message ${name}.`;
    if (friendship?.status !== "ACCEPTED")
      return `You and ${name} aren't friends right now. Add them as a friend to message them.`;
    return null;
  }

  /** A message by its author, in a chat they're part of. */
  async function own(user: Actor, messageId: string) {
    const row = await deps.dms.message(messageId);
    if (!row || row.authorId !== user.id || row.deletedAt) return null;
    return row;
  }

  return {
    /**
     * The chat with someone: who they are, and whether you may write. Null when there's
     * no chat and you aren't friends (a stranger's chat doesn't exist).
     */
    async open(user: Actor, otherId: string) {
      if (otherId === user.id) return null;
      const person = await deps.friends.person(otherId);
      if (!person) return null;
      const [thread, blockedWhy] = await Promise.all([
        deps.dms.thread(pairOf(user.id, otherId)),
        sendable(user, otherId, person.displayName),
      ]);
      const friends = !blockedWhy;
      if (!thread && !friends) return null;
      return { person, canSend: friends, why: blockedWhy };
    },

    /** The latest messages, or the page before one. */
    async page(user: Actor, otherId: string, beforeId: string | null) {
      const thread = await deps.dms.thread(pairOf(user.id, otherId));
      if (!thread) return { messages: [] as MessageView[], hasMore: false };
      let before: { createdAt: Date } | null = null;
      if (beforeId) {
        const row = await deps.dms.message(beforeId);
        if (!row || row.threadId !== thread.id)
          return { messages: [] as MessageView[], hasMore: false };
        before = row;
      }
      const rows = await deps.dms.page(thread.id, PAGE + 1, before);
      return {
        messages: rows
          .slice(0, PAGE)
          .reverse()
          .map((r) => dmView(r, user.id)),
        hasMore: rows.length > PAGE,
      };
    },

    async send(
      user: Actor,
      otherId: string,
      text: string,
    ): Promise<Result<{ message: MessageView }>> {
      const body = text.trim();
      if (!body) return failure("INVALID", "Write something to send.");
      if (body.length > DM_MAX)
        return failure("INVALID", "Keep a message under 2,000 characters.");
      const person = await deps.friends.person(otherId);
      if (!person || otherId === user.id)
        return failure("NOT_FOUND", "That person isn't here anymore.");
      const why = await sendable(user, otherId, person.displayName);
      if (why) return failure("FORBIDDEN", why);
      const at = now();
      const pair = pairOf(user.id, otherId);
      const thread = await deps.dms.ensureThread(pair, at);
      const row = await deps.dms.send(thread.id, user.id, body, at);
      // Sending reads the chat up to here.
      await deps.dms.markRead(thread.id, sideOf(pair, user.id), at);
      await emit([user.id, otherId], "new", row);
      return { ok: true, message: dmView(row, user.id) };
    },

    async edit(
      user: Actor,
      messageId: string,
      text: string,
    ): Promise<Result<{ message: MessageView }>> {
      const body = text.trim();
      if (!body) return failure("INVALID", "Write something, or delete it.");
      if (body.length > DM_MAX)
        return failure("INVALID", "Keep a message under 2,000 characters.");
      const row = await own(user, messageId);
      if (!row) return NOT_YOURS;
      const saved = await deps.dms.edit(row.id, body, now());
      await emit([row.thread.userAId, row.thread.userBId], "edit", row);
      return { ok: true, message: dmView(saved, user.id) };
    },

    async remove(user: Actor, messageId: string): Promise<Result<object>> {
      const row = await own(user, messageId);
      if (!row) return NOT_YOURS;
      await deps.dms.softDelete(row.id, now());
      await emit([row.thread.userAId, row.thread.userBId], "delete", row);
      return { ok: true };
    },

    async markRead(user: Actor, otherId: string) {
      const pair = pairOf(user.id, otherId);
      const thread = await deps.dms.thread(pair);
      if (thread)
        await deps.dms.markRead(thread.id, sideOf(pair, user.id), now());
    },

    /** The person's chats for the list: who, the last line, and how many are unread. */
    async threads(user: Actor) {
      const rows = await deps.dms.threadsOf(user.id);
      return rows.map((t) => {
        const last = t.messages[0];
        return {
          person: t.userAId === user.id ? t.userB : t.userA,
          last: last
            ? { body: last.body, mine: last.authorId === user.id }
            : null,
          unread: t.unread,
        };
      });
    },

    /** Unread messages across every chat, for the Friends tile. */
    async unreadTotal(user: Actor) {
      const map = await deps.dms.unreadByThread(user.id);
      return [...map.values()].reduce((a, b) => a + b, 0);
    },
  };
}

export type DmService = ReturnType<typeof createDmService>;
