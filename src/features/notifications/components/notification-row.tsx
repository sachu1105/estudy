"use client";

import { Check, Flag, Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

import type { Inbox } from "../use-inbox";
import type { NotificationView } from "../view";

const action =
  "grid size-11 shrink-0 cursor-pointer place-items-center rounded-control text-ink-muted transition-colors duration-[120ms] hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent md:size-8 [&_svg]:size-4";

/**
 * One notification: tap it to open it. Mark as read and delete sit beside it, always on
 * a phone and on hover or focus from md up, where they float over the row's end.
 */
export function NotificationRow({
  n,
  inbox,
  onOpen,
}: {
  n: NotificationView;
  inbox: Inbox;
  /** Runs before it opens (the menu closes itself). */
  onOpen?: () => void;
}) {
  return (
    <li
      className={cn(
        "group relative flex items-start transition-colors duration-[120ms] hover:bg-surface-muted",
        n.unread && "bg-accent-soft/50",
      )}
    >
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          inbox.open(n);
        }}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 py-3 pl-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:pr-4"
      >
        {n.report ? (
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-ink-muted">
            <Flag className="size-3.5" aria-hidden />
          </span>
        ) : (
          <Avatar
            name={n.actor?.displayName ?? "?"}
            src={n.actor?.avatarUrl ?? undefined}
            size="sm"
            className="mt-0.5"
          />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body wrap-break-word">
            {n.text} <span className="font-medium">{n.subject}</span>
          </span>
          <span className="text-small text-ink-muted">{n.when}</span>
        </span>
        {n.unread ? (
          <span className="mt-2 hidden items-center md:flex">
            <span className="size-2 rounded-full bg-accent" aria-hidden />
            <span className="sr-only">Unread</span>
          </span>
        ) : null}
      </button>
      <div className="flex shrink-0 items-center py-1.5 pr-1.5 md:absolute md:top-1/2 md:right-2 md:-translate-y-1/2 md:gap-0.5 md:rounded-control md:bg-surface-muted md:p-0.5 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        {n.unread ? (
          <button
            type="button"
            aria-label="Mark as read"
            title="Mark as read"
            onClick={() => void inbox.read(n.id)}
            className={action}
          >
            <Check aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Delete notification"
          title="Delete"
          onClick={() => void inbox.remove(n.id)}
          className={cn(action, "hover:text-danger-ink")}
        >
          <Trash2 aria-hidden />
        </button>
      </div>
    </li>
  );
}
