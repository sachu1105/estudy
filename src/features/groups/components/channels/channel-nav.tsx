"use client";

import { BellOff, Lock, Timer, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { CategoryTools } from "./category-menu";
import { CategorySection } from "./category-section";
import {
  CHANNEL_ICONS,
  channelHref,
  type CategorySummary,
  type ChannelSummary,
} from "./channel-icon";
import { ChannelMenu } from "./channel-menu";

const rowLink = (active: boolean) =>
  cn(
    "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-control px-2 text-body transition-colors duration-[120ms] md:min-h-9",
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
    active
      ? "bg-accent-soft font-medium text-accent-ink"
      : "text-ink-muted hover:bg-surface-muted hover:text-ink",
  );

function Row({
  href,
  icon,
  label,
  active,
  tools,
  unread,
  badge,
  extra,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  tools?: ReactNode;
  /** A lock or a crossed-out bell, before the unread mark. */
  badge?: ReactNode;
  /** What those icons mean, for a screen reader. */
  extra?: string;
  /** New messages from others, and how many name the viewer. */
  unread?: { unread: number; mentions: number };
}) {
  const fresh = !active && !!unread?.unread;
  return (
    <li className="group flex items-center gap-1">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(rowLink(active), fresh && "font-medium text-ink")}
      >
        {icon}
        <span className="flex-1 truncate">
          {label}
          {extra ? <span className="sr-only">{extra}</span> : null}
          {fresh ? <span className="sr-only">, new messages</span> : null}
        </span>
        {badge}
        {!active && unread?.mentions ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-micro text-on-accent tabular-nums">
            {unread.mentions}
            <span className="sr-only"> mentions</span>
          </span>
        ) : fresh ? (
          <span aria-hidden className="size-2 rounded-full bg-ink" />
        ) : null}
      </Link>
      {tools ? (
        // Phones manage a channel from its own page: rows stay clean.
        <span className="hidden md:flex md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          {tools}
        </span>
      ) : null}
    </li>
  );
}

/** A squad's channels by category, then its members and rank. Admins arrange them here. */
export function ChannelNav({
  groupId,
  loose,
  categories,
  canManage,
  unread = {},
  notify = {},
}: {
  groupId: string;
  loose: ChannelSummary[];
  categories: CategorySummary[];
  canManage: boolean;
  unread?: Record<string, { unread: number; mentions: number }>;
  notify?: Record<string, "ALL" | "MENTIONS" | "MUTE">;
}) {
  const pathname = usePathname();
  const options = categories.map(({ id, name }) => ({ id, name }));
  const isOpen = (ch: ChannelSummary) =>
    pathname === channelHref(groupId, ch.id);
  const rows = (channels: ChannelSummary[], all = channels) =>
    channels.map((ch) => {
      const i = all.indexOf(ch);
      const Icon = CHANNEL_ICONS[ch.type];
      const href = channelHref(groupId, ch.id);
      return (
        <Row
          key={ch.id}
          href={href}
          label={ch.name}
          active={isOpen(ch)}
          unread={unread[ch.id]}
          icon={<Icon className="size-4 shrink-0" aria-hidden />}
          extra={[
            ch.viewRule !== "EVERYONE" ? ", private" : "",
            notify[ch.id] === "MUTE" ? ", muted" : "",
          ].join("")}
          badge={
            <>
              {ch.viewRule !== "EVERYONE" ? (
                <Lock
                  className="size-3.5 shrink-0 text-ink-subtle"
                  aria-hidden
                />
              ) : null}
              {notify[ch.id] === "MUTE" ? (
                <BellOff
                  className="size-3.5 shrink-0 text-ink-subtle"
                  aria-hidden
                />
              ) : null}
            </>
          }
          tools={
            canManage ? (
              <ChannelMenu
                groupId={groupId}
                channel={ch}
                categories={options}
                first={i === 0}
                last={i === all.length - 1}
              />
            ) : null
          }
        />
      );
    });

  return (
    <nav aria-label="Squad" className="flex flex-col gap-4">
      {/* The squad's own places first, as Discord puts its server guide. */}
      <ul className="flex flex-col border-b border-border pb-3">
        <Row
          href={`/groups/${groupId}/members`}
          label="Members"
          active={pathname === `/groups/${groupId}/members`}
          icon={<Users className="size-4 shrink-0" aria-hidden />}
        />
        <Row
          href={`/groups/${groupId}/room`}
          label="Study room"
          active={pathname === `/groups/${groupId}/room`}
          icon={<Timer className="size-4 shrink-0" aria-hidden />}
        />
        <Row
          href={`/groups/${groupId}/rank`}
          label="Squad rank"
          active={pathname === `/groups/${groupId}/rank`}
          icon={<Trophy className="size-4 shrink-0" aria-hidden />}
        />
      </ul>
      {loose.length ? <ul className="flex flex-col">{rows(loose)}</ul> : null}
      {categories.map((c, i) => (
        <CategorySection
          key={c.id}
          name={c.name}
          channels={c.channels}
          rows={rows}
          keep={(ch) => isOpen(ch) || !!unread[ch.id]?.unread}
          tools={
            canManage ? (
              <CategoryTools
                groupId={groupId}
                category={c}
                categories={options}
                first={i === 0}
                last={i === categories.length - 1}
              />
            ) : null
          }
        />
      ))}
    </nav>
  );
}
