import { CircleCheck, EyeOff, MessageSquare, Pin } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

import type { PostSummary } from "./types";

/** One thread in the list: what it's about, who started it, how it's going. */
export function PostRow({
  groupId,
  post,
}: {
  groupId: string;
  post: PostSummary;
}) {
  return (
    <li className={cn(post.pending && "opacity-60")} aria-busy={post.pending}>
      <Link
        href={post.pending ? "#" : `/groups/${groupId}/discuss/${post.id}`}
        aria-disabled={post.pending}
        className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
      >
        <Avatar
          name={post.author.displayName}
          src={post.author.avatarUrl ?? undefined}
          size="sm"
          className="mt-0.5"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-1.5">
            {post.pinned ? (
              <Badge tone="accent">
                <Pin aria-hidden /> pinned
              </Badge>
            ) : null}
            {post.kind === "QUESTION" ? (
              <Badge tone={post.answered ? "success" : "outline"}>
                {post.answered ? <CircleCheck aria-hidden /> : null}
                {post.answered ? "answered" : "question"}
              </Badge>
            ) : null}
            {post.hidden ? (
              <Badge>
                <EyeOff aria-hidden /> hidden
              </Badge>
            ) : null}
            {post.topicName ? (
              <span className="text-small text-ink-muted">
                {post.topicName}
              </span>
            ) : null}
          </span>
          <span className="text-body font-medium wrap-break-word">
            {post.title}
          </span>
          {post.preview ? (
            <span className="line-clamp-2 text-small wrap-break-word text-ink-muted">
              {post.preview}
            </span>
          ) : null}
          <span className="flex flex-wrap items-center gap-x-3 text-small text-ink-muted">
            <span>{post.author.displayName}</span>
            <span>{post.pending ? "Posting…" : post.when}</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3.5" aria-hidden />
              {post.replyCount}
              <span className="sr-only">
                {post.replyCount === 1 ? "reply" : "replies"}
              </span>
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
