import { today, type Clock } from "@/lib/clock";
import { plainText } from "@/lib/markdown/markdown";
import type { DiscussionRepository } from "@/server/repositories/discussion-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";
import type { GroupEvent } from "@/server/realtime/types";
import type { Actor } from "@/server/services/syllabus/deps";

import { failure, type Result } from "../syllabus/deps";
import type { GroupService } from "./group-service";

type User = Actor;
type Reaction = "LIKE" | "HELPFUL" | "THANKS";

/** XP for an answer the asker accepts, and the most a person earns that way a day. */
export const ANSWER_XP = 10;
export const ANSWER_XP_DAILY_CAP = 30;

export type DiscussionDeps = {
  groups: GroupService;
  posts: DiscussionRepository;
  clock: Clock;
  emit: (groupId: string, event: GroupEvent) => Promise<void>;
  notify: (rows: NewNotification[]) => Promise<void>;
  addXp: (entry: {
    userId: string;
    kind: "ANSWER";
    amount: number;
    refId: string;
    localDate: string;
  }) => Promise<unknown>;
};

const MUTED = failure(
  "MUTED",
  "A group admin has muted you for now, so you can't post.",
);
const GONE = failure("NOT_FOUND", "That post is gone.");

/** Threads, questions, replies and reactions in a group (milestone 14). */
export function createDiscussionService(deps: DiscussionDeps) {
  const now = () => deps.clock.now();
  const isAdmin = (role: string) => role === "OWNER" || role === "ADMIN";

  /** A member who may post: not muted. */
  async function poster(user: User, groupId: string) {
    const ok = await deps.groups.require(user, groupId, "MEMBER");
    if ("error" in ok) return { fail: ok.error! } as const;
    if (ok.me.mutedUntil && ok.me.mutedUntil > now())
      return { fail: MUTED } as const;
    return { fail: null, me: ok.me } as const;
  }

  /** A post the caller may see: hidden ones only for the group's admins. */
  async function visiblePost(groupId: string, postId: string, role: string) {
    const post = await deps.posts.findPost(groupId, postId);
    if (!post || (post.hiddenAt && !isAdmin(role))) return null;
    return post;
  }

  /** Only members can be mentioned, and not yourself. */
  async function members(groupId: string, ids: string[], selfId: string) {
    if (!ids.length) return [];
    const all = new Set(
      (await deps.posts.memberNames(groupId)).map((m) => m.user.id),
    );
    return [...new Set(ids)].filter((id) => all.has(id) && id !== selfId);
  }

  const threadHref = (groupId: string, postId: string) =>
    `/groups/${groupId}/discuss/${postId}`;

  return {
    async list(
      user: User,
      groupId: string,
      filter: "all" | "questions" | "unanswered",
    ) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const blocked = await deps.groups.blockedIds(user);
      const posts = await deps.posts.list(groupId, {
        kind: filter === "all" ? null : "QUESTION",
        unanswered: filter === "unanswered",
        withHidden: isAdmin(ok.me.role),
        notBy: [...blocked],
      });
      return posts.map(({ body, ...p }) => ({
        ...p,
        preview: plainText(body, 140),
      }));
    },

    /** A post with its replies and reactions, and what the caller may do with each. */
    async thread(user: User, groupId: string, postId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return null;
      const post = await visiblePost(groupId, postId, ok.me.role);
      if (!post) return null;
      const admin = isAdmin(ok.me.role);
      const [replies, reactions, blocked] = await Promise.all([
        deps.posts.replies(postId),
        deps.posts.reactions(postId),
        deps.groups.blockedIds(user),
      ]);
      const shown = replies.filter((r) => !blocked.has(r.authorId));
      const people = await deps.posts.people([
        ...new Set([post, ...shown].flatMap((x) => x.mentionIds)),
      ]);
      const names = new Map(people.map((p) => [p.id, p.displayName]));
      const mentions = (ids: string[]) =>
        ids.flatMap((id) =>
          names.has(id) ? [{ id, name: names.get(id)! }] : [],
        );
      const tally = (targetId: string) =>
        (["LIKE", "HELPFUL", "THANKS"] as const).map((kind) => {
          const mine = reactions.filter(
            (r) => r.targetId === targetId && r.kind === kind,
          );
          return {
            kind,
            count: mine.length,
            mine: mine.some((r) => r.userId === user.id),
          };
        });

      return {
        admin,
        muted: !!(ok.me.mutedUntil && ok.me.mutedUntil > now()),
        post: {
          ...post,
          mentions: mentions(post.mentionIds),
          reactions: tally(post.id),
          mine: post.authorId === user.id,
        },
        replies: shown.map((r) => ({
          ...r,
          // Hidden replies keep their place; only admins still read them.
          body: r.hiddenAt && !admin ? "" : r.body,
          mentions: mentions(r.mentionIds),
          reactions: tally(r.id),
          mine: r.authorId === user.id,
          accepted: post.acceptedReplyId === r.id,
        })),
        canAccept: post.kind === "QUESTION" && post.authorId === user.id,
      };
    },

    /** Members to offer while typing "@". */
    async mentionable(user: User, groupId: string) {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return [];
      const blocked = await deps.groups.blockedIds(user);
      return (await deps.posts.memberNames(groupId))
        .map((m) => ({ id: m.user.id, name: m.user.displayName }))
        .filter((m) => m.id !== user.id && !blocked.has(m.id));
    },

    async create(
      user: User,
      groupId: string,
      input: {
        kind: "DISCUSSION" | "QUESTION";
        title: string;
        body: string;
        mentionIds: string[];
        subjectName: string | null;
        topicName: string | null;
      },
    ): Promise<Result<{ postId: string }>> {
      const ok = await poster(user, groupId);
      if (ok.fail) return ok.fail;
      const mentionIds = await members(groupId, input.mentionIds, user.id);
      const post = await deps.posts.createPost({
        groupId,
        authorId: user.id,
        kind: input.kind,
        title: input.title,
        body: input.body,
        mentionIds,
        subjectName: input.kind === "QUESTION" ? input.subjectName : null,
        topicName: input.kind === "QUESTION" ? input.topicName : null,
        at: now(),
      });
      await deps.notify(
        mentionIds.map((userId) => ({
          userId,
          actorId: user.id,
          kind: "MENTION",
          groupId,
          href: threadHref(groupId, post.id),
          subject: input.title,
        })),
      );
      await deps.emit(groupId, { type: "post", postId: post.id });
      return { ok: true, postId: post.id };
    },

    async reply(
      user: User,
      groupId: string,
      postId: string,
      input: { body: string; mentionIds: string[] },
    ): Promise<Result<{ replyId: string }>> {
      const ok = await poster(user, groupId);
      if (ok.fail) return ok.fail;
      const post = await visiblePost(groupId, postId, "MEMBER");
      if (!post) return GONE;
      const mentionIds = await members(groupId, input.mentionIds, user.id);
      const reply = await deps.posts.createReply({
        postId,
        authorId: user.id,
        body: input.body,
        mentionIds,
        at: now(),
      });
      const href = `${threadHref(groupId, postId)}#reply-${reply.id}`;
      // Mentions first: someone both mentioned and the author hears it once.
      await deps.notify([
        ...mentionIds.map((userId) => ({
          userId,
          actorId: user.id,
          kind: "MENTION" as const,
          groupId,
          href,
          subject: post.title,
        })),
        {
          userId: post.authorId,
          actorId: user.id,
          kind: "REPLY",
          groupId,
          href,
          subject: post.title,
        },
      ]);
      await deps.emit(groupId, { type: "reply", postId });
      return { ok: true, replyId: reply.id };
    },

    /** Reactions are open to muted members too: they aren't posts. */
    async react(
      user: User,
      groupId: string,
      input: {
        postId: string;
        replyId: string | null;
        kind: Reaction;
        on: boolean;
      },
    ): Promise<Result<object>> {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return ok.error!;
      const post = await visiblePost(groupId, input.postId, "MEMBER");
      if (!post) return GONE;
      if (input.replyId) {
        const reply = await deps.posts.findReply(input.postId, input.replyId);
        if (!reply || reply.hiddenAt) return GONE;
      }
      await deps.posts.react({ ...input, userId: user.id });
      await deps.emit(groupId, { type: "reaction", postId: input.postId });
      return { ok: true };
    },

    /**
     * The asker picks the answer that helped. The first acceptance on a question pays
     * the answerer ANSWER_XP, within a daily cap; changing the pick later pays nothing.
     */
    async accept(
      user: User,
      groupId: string,
      postId: string,
      replyId: string | null,
    ): Promise<Result<{ xp: number }>> {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return ok.error!;
      const post = await visiblePost(groupId, postId, "MEMBER");
      if (!post) return GONE;
      if (post.kind !== "QUESTION" || post.authorId !== user.id)
        return failure(
          "FORBIDDEN",
          "Only the person who asked picks the answer.",
        );
      if (!replyId) {
        await deps.posts.setPost(postId, { acceptedReplyId: null });
        await deps.emit(groupId, { type: "update", postId });
        return { ok: true, xp: 0 };
      }
      const reply = await deps.posts.findReply(postId, replyId);
      if (!reply || reply.hiddenAt)
        return failure("NOT_FOUND", "That answer is gone.");
      await deps.posts.setPost(postId, { acceptedReplyId: replyId });

      let xp = 0;
      if (
        reply.authorId !== user.id &&
        !(await deps.posts.answerPaid(postId))
      ) {
        const localDate = today(deps.clock);
        const earned = await deps.posts.answerXpOn(reply.authorId, localDate);
        xp = Math.max(0, Math.min(ANSWER_XP, ANSWER_XP_DAILY_CAP - earned));
        // Written even at 0 (the day's cap was reached): it marks the question as paid.
        await deps.addXp({
          userId: reply.authorId,
          kind: "ANSWER",
          amount: xp,
          refId: postId,
          localDate,
        });
        await deps.notify([
          {
            userId: reply.authorId,
            actorId: user.id,
            kind: "ACCEPTED",
            groupId,
            href: `${threadHref(groupId, postId)}#reply-${replyId}`,
            subject: post.title,
          },
        ]);
      }
      await deps.emit(groupId, { type: "update", postId });
      return { ok: true, xp };
    },

    async pin(
      user: User,
      groupId: string,
      postId: string,
      on: boolean,
    ): Promise<Result<object>> {
      const ok = await deps.groups.require(user, groupId, "ADMIN");
      if ("error" in ok) return ok.error!;
      if (!(await deps.posts.findPost(groupId, postId))) return GONE;
      await deps.posts.setPost(postId, { pinnedAt: on ? now() : null });
      await deps.emit(groupId, { type: "update", postId });
      return { ok: true };
    },

    /** Group admins hide a post or a reply; hiding can be undone. */
    async hide(
      user: User,
      groupId: string,
      target: { postId: string; replyId: string | null },
      on: boolean,
    ): Promise<Result<object>> {
      const ok = await deps.groups.require(user, groupId, "ADMIN");
      if ("error" in ok) return ok.error!;
      if (!(await deps.posts.findPost(groupId, target.postId))) return GONE;
      const hiddenAt = on ? now() : null;
      if (target.replyId) {
        if (!(await deps.posts.findReply(target.postId, target.replyId)))
          return GONE;
        await deps.posts.setReply(target.postId, target.replyId, { hiddenAt });
      } else await deps.posts.setPost(target.postId, { hiddenAt });
      await deps.emit(groupId, { type: "update", postId: target.postId });
      return { ok: true };
    },

    /** Authors delete their own posts and replies. */
    async remove(
      user: User,
      groupId: string,
      target: { postId: string; replyId: string | null },
    ): Promise<Result<object>> {
      const ok = await deps.groups.require(user, groupId, "MEMBER");
      if ("error" in ok) return ok.error!;
      const post = await deps.posts.findPost(groupId, target.postId);
      if (!post) return GONE;
      const at = now();
      if (target.replyId) {
        const reply = await deps.posts.findReply(target.postId, target.replyId);
        if (!reply || reply.authorId !== user.id)
          return failure("FORBIDDEN", "You can delete only your own replies.");
        await deps.posts.setReply(target.postId, target.replyId, {
          deletedAt: at,
        });
      } else {
        if (post.authorId !== user.id)
          return failure("FORBIDDEN", "You can delete only your own posts.");
        await deps.posts.setPost(target.postId, { deletedAt: at });
      }
      await deps.emit(groupId, { type: "update", postId: target.postId });
      return { ok: true };
    },
  };
}

export type DiscussionService = ReturnType<typeof createDiscussionService>;
