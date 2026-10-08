"use client";

import {
  CornerUpLeft,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Link2,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { clockTime } from "@/lib/squads/chat-time";
import type { PendingMessage, Reaction } from "@/lib/squads/chat-types";
import { cn } from "@/lib/utils/cn";

import { PostBody } from "../discussion/post-body";
import { REACTIONS } from "./message-menu";

const ITEM_ICONS = {
  NOTE: NotebookPen,
  LINK: Link2,
  FILE: FileText,
  IMAGE: ImageIcon,
} as const;

/**
 * One message. A message that follows the same person's last one within minutes is
 * compact: no avatar or name, the time only on hover.
 */
export function MessageItem({
  groupId,
  message: m,
  compact,
  timeZone,
  menu,
  onReact,
  active,
  onToggle,
}: {
  groupId: string;
  message: PendingMessage;
  compact: boolean;
  timeZone: string;
  menu: ReactNode;
  onReact: (kind: Reaction) => void;
  /** On phones a tapped message shows its menu. */
  active: boolean;
  onToggle: () => void;
}) {
  const time = clockTime(new Date(m.at), timeZone);
  // Always in the same order, so a reaction doesn't jump when toggled.
  const shown = (Object.keys(REACTIONS) as Reaction[])
    .map((kind) => m.reactions.find((r) => r.kind === kind))
    .filter((r) => !!r && r.count > 0) as PendingMessage["reactions"];
  return (
    <li
      id={`m-${m.id}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("a,button")) onToggle();
      }}
      className={cn(
        "group relative flex gap-3 rounded-control px-2 hover:bg-surface-muted/60",
        active && "bg-surface-muted/60",
        compact ? "py-0.5" : "mt-3 pt-1.5 pb-0.5",
        m.pending && "opacity-60",
      )}
    >
      <div className="w-9 shrink-0">
        {compact ? (
          <span className="invisible block pt-1 text-right font-mono text-micro text-ink-muted tabular-nums group-hover:visible">
            {time.replace(/ [ap]m$/, "")}
          </span>
        ) : (
          <Avatar
            name={m.author.displayName}
            src={m.author.avatarUrl ?? undefined}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {m.replyTo ? (
          <a
            href={`#m-${m.replyTo.id}`}
            className="flex min-w-0 items-center gap-1 text-small text-ink-muted hover:text-ink"
          >
            <CornerUpLeft className="size-3.5 shrink-0" aria-hidden />
            <span className="shrink-0 font-medium">{m.replyTo.author}</span>
            <span className="truncate">{m.replyTo.preview}</span>
          </a>
        ) : null}
        {compact ? null : (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-body font-medium">
              {m.author.displayName}
            </span>
            <time
              dateTime={m.at}
              className="text-small text-ink-muted"
              suppressHydrationWarning
            >
              {time}
            </time>
          </p>
        )}
        {m.deleted ? (
          <p className="text-body text-ink-muted italic">Message deleted</p>
        ) : (
          <>
            {m.hidden ? (
              <p className="flex items-center gap-1 text-small text-ink-muted">
                <EyeOff className="size-3.5" aria-hidden /> Hidden from members
              </p>
            ) : null}
            {m.body ? <PostBody source={m.body} mentions={m.mentions} /> : null}
            {m.edited ? (
              <span className="text-micro text-ink-muted">(edited)</span>
            ) : null}
          </>
        )}
        {m.item ? <ItemCard groupId={groupId} item={m.item} /> : null}
        {shown.length ? (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((r) => {
              const { icon: Icon, label } = REACTIONS[r.kind];
              return (
                <Chip
                  key={r.kind}
                  selected={r.mine}
                  aria-label={`${label}, ${r.count}`}
                  onClick={() => onReact(r.kind)}
                >
                  <Icon aria-hidden />
                  <span className="font-mono tabular-nums">{r.count}</span>
                </Chip>
              );
            })}
          </div>
        ) : null}
      </div>
      {m.pending || m.deleted ? null : (
        <div
          className={cn(
            active ? "flex" : "hidden",
            "shrink-0 items-start md:absolute md:top-0 md:right-2 md:flex md:-translate-y-1/3 md:rounded-control md:border md:border-border md:bg-surface md:opacity-0 md:shadow-sm md:group-focus-within:opacity-100 md:group-hover:opacity-100",
          )}
        >
          {menu}
        </div>
      )}
    </li>
  );
}

function ItemCard({
  groupId,
  item,
}: {
  groupId: string;
  item: NonNullable<PendingMessage["item"]>;
}) {
  const Icon = ITEM_ICONS[item.type];
  return (
    <Link
      href={`/groups/${groupId}/items/${item.id}`}
      className="flex max-w-sm items-center gap-3 rounded-control border border-border bg-surface px-3 py-2 hover:bg-surface-muted"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-body font-medium">
        {item.title}
      </span>
    </Link>
  );
}
