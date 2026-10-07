import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscussionBoard } from "@/features/groups/components/discussion/discussion-board";
import { GroupLive } from "@/features/groups/components/discussion/group-live";
import { systemClock } from "@/lib/clock";
import { timeAgo } from "@/lib/format/ago";
import { isId } from "@/lib/ids";
import { cn } from "@/lib/utils/cn";
import { requireUser } from "@/server/auth/session";
import { discussionService, groupService } from "@/server/services/groups";
import { podService } from "@/server/services/pods";

export const metadata: Metadata = { title: "Squad discussion" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "questions", label: "Questions" },
  { value: "unanswered", label: "Unanswered" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

/** Threads and questions. Updates arrive live; pinned posts stay on top. */
export default async function DiscussPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/discuss">) {
  const user = await requireUser();
  const { groupId } = await params;
  const { show } = await searchParams;
  if (!isId(groupId)) notFound();
  const filter: Filter = FILTERS.find((f) => f.value === show)?.value ?? "all";
  const [view, posts, members, pods] = await Promise.all([
    groupService.view(user, groupId),
    discussionService.list(user, groupId, filter),
    discussionService.mentionable(user, groupId),
    podService.list(user),
  ]);
  if (!view?.role || !posts) return null;
  const now = systemClock.now();
  const topics = [
    ...new Set(pods.flatMap((p) => p.topics.map((t) => t.name))),
  ].sort();

  return (
    <div className="flex flex-col gap-4">
      <GroupLive groupId={groupId} />
      <nav aria-label="Show" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={
              f.value === "all"
                ? `/groups/${groupId}/discuss`
                : `/groups/${groupId}/discuss?show=${f.value}`
            }
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
        me={{
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }}
        muted={!!view.muted}
        members={members}
        topics={topics}
        posts={posts.map((p) => ({
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
  );
}
