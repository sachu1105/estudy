import { Check, CircleCheck, EyeOff } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

import { PostBody } from "./post-body";
import { PostMenu } from "./post-menu";
import { ReactionBar } from "./reaction-bar";
import type { ReplyView } from "./types";

/** One reply: hidden ones keep their place, so the thread still reads in order. */
export function ReplyItem({
  groupId,
  postId,
  reply,
  accepted,
  canAccept,
  admin,
  onAccept,
}: {
  groupId: string;
  postId: string;
  reply: ReplyView;
  accepted: boolean;
  canAccept: boolean;
  admin: boolean;
  onAccept: (replyId: string | null) => void;
}) {
  const what = `reply by ${reply.author.displayName}`;
  const masked = reply.hidden && !admin;
  return (
    <li
      id={`reply-${reply.id}`}
      aria-busy={reply.pending}
      className={cn(
        "flex scroll-mt-20 flex-col gap-3 rounded-card border bg-surface p-4",
        accepted ? "border-success" : "border-border",
        reply.pending && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar
          name={reply.author.displayName}
          src={reply.author.avatarUrl ?? undefined}
          size="sm"
        />
        <span className="min-w-0 flex-1 truncate text-small">
          <span className="font-medium text-ink">
            {reply.author.displayName}
          </span>{" "}
          <span className="text-ink-muted">
            {reply.pending ? "Sending…" : reply.when}
          </span>
        </span>
        {accepted ? (
          <Badge tone="success">
            <CircleCheck aria-hidden /> accepted
          </Badge>
        ) : null}
        {reply.hidden && admin ? (
          <Badge>
            <EyeOff aria-hidden /> hidden
          </Badge>
        ) : null}
        {reply.pending ? null : (
          <PostMenu
            groupId={groupId}
            postId={postId}
            replyId={reply.id}
            what={what}
            admin={admin}
            mine={reply.mine}
            hidden={reply.hidden}
          />
        )}
      </div>
      {masked ? (
        <p className="text-body text-ink-muted italic">
          A squad admin hid this reply.
        </p>
      ) : (
        <PostBody source={reply.body} mentions={reply.mentions} />
      )}
      {reply.pending || masked ? null : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ReactionBar
            groupId={groupId}
            postId={postId}
            replyId={reply.id}
            reactions={reply.reactions}
          />
          {canAccept && !reply.mine && !reply.hidden ? (
            <Button
              size="sm"
              variant={accepted ? "ghost" : "secondary"}
              onClick={() => onAccept(accepted ? null : reply.id)}
            >
              <Check aria-hidden />
              {accepted ? "Unaccept" : "Accept answer"}
            </Button>
          ) : null}
        </div>
      )}
    </li>
  );
}
