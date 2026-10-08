import Link from "next/link";

import { systemClock } from "@/lib/clock";
import { timeAgo } from "@/lib/format/ago";
import { cn } from "@/lib/utils/cn";
import { discussionService } from "@/server/services/groups";
import { podService } from "@/server/services/pods";

import { channelHref } from "../components/channels/channel-icon";
import { ChannelHeader } from "../components/channels/channel-header";
import { DiscussionBoard } from "../components/discussion/discussion-board";
import { GroupLive } from "../components/discussion/group-live";
import type { ChannelViewProps } from "./types";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "questions", label: "Questions" },
  { value: "unanswered", label: "Unanswered" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

/** A threads channel: discussions and questions. Updates arrive live; pinned posts on top. */
export async function ThreadsChannel({
  user,
  groupId,
  channel,
  canPost,
  manage,
  notify,
  searchParams,
}: ChannelViewProps) {
  const filter: Filter =
    FILTERS.find((f) => f.value === searchParams.show)?.value ?? "all";
  const [posts, members, pods] = await Promise.all([
    discussionService.list(user, groupId, filter, channel.id),
    discussionService.mentionable(user, groupId),
    podService.list(user),
  ]);
  const now = systemClock.now();
  const topics = [
    ...new Set(pods.flatMap((p) => p.topics.map((t) => t.name))),
  ].sort();
  const base = channelHref(groupId, channel.id);

  return (
    <>
      <GroupLive groupId={groupId} />
      <ChannelHeader
        manage={manage}
        notify={notify}
        groupId={groupId}
        channel={channel}
      />
      <div className="flex flex-col gap-4">
        <nav aria-label="Show" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === "all" ? base : `${base}?show=${f.value}`}
              aria-current={f.value === filter ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-chip border px-3 text-small font-medium md:h-8",
                f.value === filter
                  ? "border-transparent bg-accent-soft text-accent-ink"
                  : "border-border bg-surface text-ink-muted hover:text-ink",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <DiscussionBoard
          groupId={groupId}
          channelId={channel.id}
          me={{
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }}
          muted={!canPost}
          members={members}
          topics={topics}
          posts={(posts ?? []).map((p) => ({
            id: p.id,
            kind: p.kind,
            title: p.title,
            preview: p.preview,
            topicName: p.topicName,
            author: p.author,
            replyCount: p.replyCount,
            answered: !!p.acceptedReplyId,
            pinned: !!p.pinnedAt,
            hidden: !!p.hiddenAt,
            when: timeAgo(p.lastActivityAt, now, user.timezone),
          }))}
        />
      </div>
    </>
  );
}
