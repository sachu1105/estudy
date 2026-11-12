"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { Inbox } from "../use-inbox";
import { NotificationRow } from "./notification-row";

/** What the bell opens: a header, the latest notifications, and a way to the full page. */
export function NotificationPanel({
  title,
  inbox,
  loaded,
  close,
}: {
  /** A plain heading in the popover, the sheet's own title on a phone. */
  title: ReactNode;
  inbox: Inbox;
  loaded: boolean;
  close: () => void;
}) {
  return (
    <>
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border py-2 pr-12 pl-4 md:pr-2">
        {title}
        {inbox.anyUnread ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-11 md:h-8"
            onClick={() => void inbox.readAll()}
          >
            Mark all read
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto">
        {!loaded ? (
          <ul aria-label="Loading notifications">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <span className="flex flex-1 flex-col gap-2 pt-1">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-16" />
                </span>
              </li>
            ))}
          </ul>
        ) : inbox.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-body text-ink-muted">
            Nothing new. Mentions, replies, friend requests and exam reminders
            show up here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {inbox.items.map((n) => (
              <NotificationRow key={n.id} n={n} inbox={inbox} onOpen={close} />
            ))}
          </ul>
        )}
      </div>
      <Link
        href="/notifications"
        onClick={close}
        className="flex min-h-11 shrink-0 items-center justify-center border-t border-border text-small font-medium text-accent-ink transition-colors duration-[120ms] hover:bg-surface-muted md:min-h-10"
      >
        See all notifications
      </Link>
    </>
  );
}
