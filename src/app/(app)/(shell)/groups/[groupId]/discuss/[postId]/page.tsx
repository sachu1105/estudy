import { EyeOff, Pin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GroupLive } from "@/features/groups/components/discussion/group-live";
import { PostBody } from "@/features/groups/components/discussion/post-body";
import { PostMenu } from "@/features/groups/components/discussion/post-menu";
import { ReactionBar } from "@/features/groups/components/discussion/reaction-bar";
import { ReplySection } from "@/features/groups/components/discussion/reply-section";
import { channelHref } from "@/features/groups/components/channels/channel-icon";
import { BackLink } from "@/features/pods/components/back-link";
import { systemClock } from "@/lib/clock";
import { timeAgo } from "@/lib/format/ago";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { channelService, discussionService } from "@/server/services/groups";

export const metadata: Metadata = { title: "Squad thread" };

/** One thread: the post, its replies, and for questions the accepted answer. */
export default async function ThreadPage({
  params,
}: PageProps<"/groups/[groupId]/discuss/[postId]">) {
  const user = await requireUser();
  const { groupId, postId } = await params;
  const [data, members] =
    isId(groupId) && isId(postId)
      ? await Promise.all([
          discussionService.thread(user, groupId, postId),
          discussionService.mentionable(user, groupId),
        ])
      : [null, []];
  if (!data) notFound();
  const { post } = data;
  const now = systemClock.now();
  const question = post.kind === "QUESTION";
  const channel = await channelService.get(user, groupId, post.channelId);

  return (
    <div className="flex flex-col gap-6">
      <GroupLive groupId={groupId} postId={postId} />
      <BackLink
        href={
          channel
            ? channelHref(groupId, channel.channel.id)
            : `/groups/${groupId}`
        }
        label={channel?.channel.name ?? "Channels"}
      />
      <article className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {post.pinnedAt ? (
            <Badge tone="accent">
              <Pin aria-hidden /> pinned
            </Badge>
          ) : null}
          {question ? <Badge tone="outline">question</Badge> : null}
          {post.hiddenAt ? (
            <Badge>
              <EyeOff aria-hidden /> hidden from members
            </Badge>
          ) : null}
          {post.topicName ? (
            <span className="text-small text-ink-muted">{post.topicName}</span>
          ) : null}
        </div>
        <div className="flex items-start gap-2">
          <h1 className="min-w-0 flex-1 text-h2 wrap-break-word">
            {post.title}
          </h1>
          <PostMenu
            groupId={groupId}
            postId={postId}
            replyId={null}
            what={`post ${post.title}`}
            admin={data.admin}
            mine={post.mine}
            pinned={!!post.pinnedAt}
            hidden={!!post.hiddenAt}
          />
        </div>
        <div className="flex items-center gap-2 text-small">
          <Avatar
            name={post.author.displayName}
            src={post.author.avatarUrl ?? undefined}
            size="sm"
          />
          <span className="font-medium">{post.author.displayName}</span>
          <span className="text-ink-muted">
            {timeAgo(post.createdAt, now, user.timezone)}
          </span>
        </div>
        {post.body ? (
          <PostBody source={post.body} mentions={post.mentions} />
        ) : null}
        <ReactionBar
          groupId={groupId}
          postId={postId}
          replyId={null}
          reactions={post.reactions}
        />
      </article>
      <ReplySection
        groupId={groupId}
        postId={postId}
        me={{
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }}
        replies={data.replies.map((r) => ({
          id: r.id,
          body: r.body,
          hidden: !!r.hiddenAt,
          author: r.author,
          when: timeAgo(r.createdAt, now, user.timezone),
          mentions: r.mentions,
          reactions: r.reactions,
          mine: r.mine,
        }))}
        acceptedId={post.acceptedReplyId}
        question={question}
        canAccept={data.canAccept}
        admin={data.admin}
        muted={data.muted}
        members={members}
      />
    </div>
  );
}
