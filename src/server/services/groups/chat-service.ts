import type { Clock } from "@/lib/clock";
import { plainText } from "@/lib/markdown/markdown";
import { canModerate } from "@/lib/squads/roles";
import type { MessageView } from "@/lib/squads/chat-types";
import type {
  MessageRepository,
  MessageRow,
} from "@/server/repositories/message-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import type { GroupEvent } from "@/server/realtime/types";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";
import type { ChannelService } from "./channel-service";
import type { GroupService } from "./group-service";

type User = Actor;
type Reaction = "LIKE" | "HELPFUL" | "THANKS";

export type { MessageView };

/** How many messages one page holds. */
export const CHAT_PAGE = 50;

export type ChatDeps = {
  groups: GroupService;
  channels: Pick<ChannelService, "get" | "slowModeWait">;
  messages: MessageRepository;
  /** How much of each channel reaches this person: no row means everything. */
  notifyLevels: (
    userId: string,
    groupId: string,
  ) => Promise<Map<string, "ALL" | "MENTIONS" | "MUTE">>;
  /** Of these people, who has muted this channel (no mention notification). */
  mutedOn: (channelId: string, userIds: string[]) => Promise<Set<string>>;
  /** Everyone in the squad, to check mentions and name them. */
  memberNames: (
    groupId: string,
  ) => Promise<{ user: { id: string; displayName: string } }[]>;
  /** Copies a pod item into the squad, for sharing it in a message. */
  shareFromPod: (
    user: User,
    groupId: string,
    podItemId: string,
    channelId: string,
  ) => Promise<Result<{ itemId: string }>>;
  clock: Clock;
  emit: (groupId: string, event: GroupEvent) => Promise<void>;
  notify: (rows: NewNotification[]) => Promise<void>;
};

const CHAT_TYPES = new Set(["CHAT", "ANNOUNCEMENTS"]);
const GONE = failure("NOT_FOUND", "That message is gone.");
const MUTED = failure(
  "MUTED",
  "A squad admin has muted you for now, so you can't send messages.",
);

/** Chat and announcement channels: messages, replies, reactions and unread state. */
export function createChatService(deps: ChatDeps) {
  const now = () => deps.clock.now();
  const isAdmin = (role: string) => canModerate(role as "MEMBER");

  /** A member in a chat channel, with what they may do there. */
  async function inChat(user: User, groupId: string, channelId: string) {
    const found = await deps.channels.get(user, groupId, channelId);
    if (!found || !CHAT_TYPES.has(found.channel.type)) return null;
    const member = await deps.groups.require(user, groupId, "MEMBER");
    if ("error" in member) return null;
    const muted = !!member.me.mutedUntil && member.me.mutedUntil > now();
    return { ...found, muted };
  }

  /** Only members can be mentioned, and not yourself. */
  async function names(groupId: string) {
    const rows = await deps.memberNames(groupId);
    return new Map(rows.map((m) => [m.user.id, m.user.displayName]));
  }

  function view(
    m: MessageRow,
    user: User,
    role: string,
    people: Map<string, string>,
    blocked: Set<string>,
  ): MessageView {
    const deleted = !!m.deletedAt;
    const reply = m.replyTo;
    return {
      id: m.id,
      body: deleted ? "" : m.body,
      deleted,
      hidden: !!m.hiddenAt,
      edited: !!m.editedAt,
      at: m.createdAt.toISOString(),
      author: m.author,
      mentions: m.mentionIds
        .filter((id) => people.has(id))
        .map((id) => ({ id, name: people.get(id)! })),
      replyTo: reply
        ? {
            id: reply.id,
            author: reply.author.displayName,
            preview:
              reply.deletedAt || reply.hiddenAt
                ? "Message removed"
                : plainText(reply.body, 80),
          }
        : null,
      item: deleted ? null : m.item,
      reactions: (["LIKE", "HELPFUL", "THANKS"] as const).map((kind) => {
        const of = m.reactions.filter(
          (r) => r.kind === kind && !blocked.has(r.userId),
        );
        return {
          kind,
          count: of.length,
          mine: of.some((r) => r.userId === user.id),
        };
      }),
      mine: m.authorId === user.id,
      canDelete: !deleted && (m.authorId === user.id || isAdmin(role)),
    };
  }

  /** Mentions of members only, never yourself. */
  const checkMentions = (
    ids: string[],
    people: Map<string, string>,
    self: string,
  ) => [...new Set(ids)].filter((id) => people.has(id) && id !== self);

  return {
    /**
     * A page of messages, oldest first: the latest, those before a message (scrolling
     * up), or those after one (catching up after a live event).
     */
    async page(
      user: User,
      groupId: string,
      channelId: string,
      cursor: { before?: string; after?: string } = {},
    ) {
      const chat = await inChat(user, groupId, channelId);
      if (!chat) return null;
      const anchorId = cursor.before ?? cursor.after;
      const anchor = anchorId
        ? await deps.messages.find(channelId, anchorId)
        : null;
      if (anchorId && !anchor) return null;
      const [blocked, people] = await Promise.all([
        deps.groups.blockedIds(user),
        names(groupId),
      ]);
      const rows = await deps.messages.page(channelId, {
        before: cursor.before ? anchor : null,
        after: cursor.after ? anchor : null,
        limit: CHAT_PAGE + 1,
        withHidden: isAdmin(chat.role),
        notBy: [...blocked],
      });
      const more = rows.length > CHAT_PAGE;
      const shown = rows.slice(0, CHAT_PAGE).reverse();
      return {
        messages: shown.map((m) => view(m, user, chat.role, people, blocked)),
        // Catching up returns everything new; only scrolling up has an older page.
        hasMore: !cursor.after && more,
      };
    },

    /** Who can be mentioned here. */
    async mentionable(user: User, groupId: string) {
      const blocked = await deps.groups.blockedIds(user);
      return [...(await names(groupId))]
        .filter(([id]) => id !== user.id && !blocked.has(id))
        .map(([id, name]) => ({ id, name }));
    },

    async send(
      user: User,
      groupId: string,
      channelId: string,
      input: {
        body: string;
        replyToId: string | null;
        mentionIds: string[];
        podItemId: string | null;
      },
    ): Promise<Result<{ message: MessageView }>> {
      const chat = await inChat(user, groupId, channelId);
      if (!chat)
        return failure("NOT_FOUND", "That channel is gone or isn't a chat.");
      if (chat.muted) return MUTED;
      if (!chat.canPost)
        return failure(
          "FORBIDDEN",
          "Only the squad's admins post in this channel.",
        );
      const wait = await deps.channels.slowModeWait(
        chat.channel,
        { id: user.id, role: chat.role },
        await deps.messages.lastSentAt(channelId, user.id),
      );
      if (wait)
        return failure(
          "SLOW_MODE",
          `This channel is in slow mode. You can write again in ${wait} second${wait === 1 ? "" : "s"}.`,
        );
      const body = input.body.trim();
      if (!body && !input.podItemId)
        return failure("EMPTY", "Write a message first.");
      if (input.replyToId) {
        const target = await deps.messages.find(channelId, input.replyToId);
        if (!target || target.deletedAt)
          return failure("NOT_FOUND", "The message you replied to is gone.");
      }
      let itemId: string | null = null;
      if (input.podItemId) {
        const shared = await deps.shareFromPod(
          user,
          groupId,
          input.podItemId,
          channelId,
        );
        if (!shared.ok) return shared;
        itemId = shared.itemId;
      }
      const people = await names(groupId);
      const mentionIds = checkMentions(input.mentionIds, people, user.id);
      const row = await deps.messages.create({
        groupId,
        channelId,
        authorId: user.id,
        body,
        replyToId: input.replyToId,
        mentionIds,
        itemId,
        at: now(),
      });
      // Someone who muted the channel hears nothing from it, mentions included.
      const silent = await deps.mutedOn(channelId, mentionIds);
      await deps.notify(
        mentionIds
          .filter((userId) => !silent.has(userId))
          .map((userId) => ({
            userId,
            actorId: user.id,
            kind: "MENTION" as const,
            groupId,
            href: `/groups/${groupId}/c/${channelId}`,
            subject: `#${chat.channel.name}: ${plainText(body, 80)}`,
          })),
      );
      await deps.emit(groupId, {
        type: "message",
        action: "new",
        channelId,
        messageId: row.id,
        authorId: user.id,
      });
      return {
        ok: true,
        message: view(row, user, chat.role, people, new Set()),
      };
    },

    /** The author fixes their own words. */
    async edit(
      user: User,
      groupId: string,
      channelId: string,
      messageId: string,
      input: { body: string; mentionIds: string[] },
    ): Promise<Result<object>> {
      const chat = await inChat(user, groupId, channelId);
      if (!chat) return GONE;
      const message = await deps.messages.find(channelId, messageId);
      if (!message || message.deletedAt) return GONE;
      if (message.authorId !== user.id)
        return failure("FORBIDDEN", "Only whoever wrote it can edit it.");
      const body = input.body.trim();
      if (!body && !message.item)
        return failure("EMPTY", "Write something, or delete the message.");
      const people = await names(groupId);
      await deps.messages.edit(
        messageId,
        body,
        checkMentions(input.mentionIds, people, user.id),
        now(),
      );
      await deps.emit(groupId, {
        type: "message",
        action: "edit",
        channelId,
        messageId,
        authorId: user.id,
      });
      return { ok: true };
    },

    /** The author, or a squad admin, deletes a message; replies keep a stub to point at. */
    async remove(
      user: User,
      groupId: string,
      channelId: string,
      messageId: string,
    ): Promise<Result<object>> {
      const chat = await inChat(user, groupId, channelId);
      if (!chat) return GONE;
      const message = await deps.messages.find(channelId, messageId);
      if (!message || message.deletedAt) return GONE;
      if (message.authorId !== user.id && !isAdmin(chat.role))
        return failure(
          "FORBIDDEN",
          "Only whoever wrote it, or a squad admin, can delete it.",
        );
      await deps.messages.softDelete(messageId, now());
      await deps.emit(groupId, {
        type: "message",
        action: "delete",
        channelId,
        messageId,
        authorId: user.id,
      });
      return { ok: true };
    },

    async react(
      user: User,
      groupId: string,
      channelId: string,
      messageId: string,
      kind: Reaction,
      on: boolean,
    ): Promise<Result<object>> {
      const chat = await inChat(user, groupId, channelId);
      if (!chat) return GONE;
      const message = await deps.messages.find(channelId, messageId);
      if (!message || message.deletedAt) return GONE;
      await deps.messages.react(messageId, user.id, kind, on);
      await deps.emit(groupId, {
        type: "message",
        action: "react",
        channelId,
        messageId,
        authorId: user.id,
      });
      return { ok: true };
    },

    /** The person has seen the channel up to now. */
    async markRead(user: User, groupId: string, channelId: string) {
      const chat = await inChat(user, groupId, channelId);
      if (!chat) return;
      await deps.messages.markRead(user.id, channelId, now());
    },

    /**
     * Unread messages and mentions per channel, for the channel list. A channel set to
     * mentions only shows just those; a muted one shows nothing.
     */
    async unread(user: User, groupId: string) {
      const [rows, levels] = await Promise.all([
        deps.messages.unread(user.id, groupId),
        deps.notifyLevels(user.id, groupId),
      ]);
      const counted = rows.flatMap((r) => {
        const level = levels.get(r.channelId) ?? "ALL";
        if (level === "MUTE") return [];
        return [
          [
            r.channelId,
            {
              unread: level === "MENTIONS" ? r.mentions : r.unread,
              mentions: r.mentions,
            },
          ] as const,
        ];
      });
      return Object.fromEntries(counted) as Record<
        string,
        { unread: number; mentions: number }
      >;
    },

    squadsWithUnread: (user: User) => deps.messages.squadsWithUnread(user.id),
  };
}

export type ChatService = ReturnType<typeof createChatService>;
