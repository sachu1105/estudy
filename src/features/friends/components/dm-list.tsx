"use client";

import { Compass, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils/cn";

export type DmThread = {
  person: { id: string; displayName: string; avatarUrl: string | null };
  last: { body: string; mine: boolean } | null;
  unread: number;
};

const row = (active: boolean) =>
  cn(
    "flex min-h-11 items-center gap-3 rounded-control px-2 transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
    active
      ? "bg-accent-soft text-accent-ink"
      : "text-ink-muted hover:bg-surface-muted hover:text-ink",
  );

/** A count in a small accent pill: requests waiting, or unread messages. */
export function CountPill({ n, label }: { n: number; label: string }) {
  if (n <= 0) return null;
  return (
    <span className="relative ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-micro font-medium text-on-accent tabular-nums">
      {n > 99 ? "99+" : n}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  count = 0,
  countLabel = "",
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  active: boolean;
  count?: number;
  countLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(row(active), "font-medium")}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      {label}
      <CountPill n={count} label={countLabel} />
    </Link>
  );
}

/**
 * Discord's left column for direct messages: Friends and finding a squad on top, then
 * every chat, latest first, with what was said last and how much is unread.
 */
export function DmList({
  threads,
  pending,
  nav = true,
}: {
  threads: DmThread[];
  /** Friend requests waiting on an answer. */
  pending: number;
  /** Off on the phone's Messages tab, which sits under Friends already. */
  nav?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-1">
      {nav ? (
        <>
          <NavLink
            href="/groups/friends"
            icon={Users}
            label="Friends"
            active={pathname === "/groups/friends"}
            count={pending}
            countLabel="friend requests"
          />
          <NavLink
            href="/groups/discover"
            icon={Compass}
            label="Find a squad"
            active={false}
          />
        </>
      ) : null}
      <h2 className="mt-4 mb-1 px-2 text-micro text-ink-muted uppercase first:mt-0">
        Direct messages
      </h2>
      {threads.length === 0 ? (
        <p className="px-2 text-small text-ink-muted">
          No chats yet. Message a friend from your friends list.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5" aria-label="Direct messages">
          {threads.map((t) => {
            const href = `/groups/friends/dm/${t.person.id}`;
            const active = pathname === href;
            return (
              <li key={t.person.id}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={row(active)}
                >
                  <Avatar
                    name={t.person.displayName}
                    src={t.person.avatarUrl}
                    size="md"
                  />
                  <span className="flex min-w-0 flex-1 flex-col py-1">
                    <span
                      className={cn(
                        "truncate text-body",
                        t.unread > 0 && "font-medium text-ink",
                      )}
                    >
                      {t.person.displayName}
                    </span>
                    {t.last ? (
                      <span className="truncate text-small text-ink-muted">
                        {t.last.mine ? "You: " : ""}
                        {t.last.body}
                      </span>
                    ) : null}
                  </span>
                  <CountPill n={t.unread} label="unread" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
