"use client";

import { Button } from "@/components/ui/button";

import { useInbox } from "../use-inbox";
import type { NotificationView } from "../view";
import { NotificationRow } from "./notification-row";

export type { NotificationView };

/** The full inbox page. Each row can be read or deleted; "Mark all read" clears the rest. */
export function NotificationList({ items }: { items: NotificationView[] }) {
  const inbox = useInbox(items);

  if (inbox.items.length === 0)
    return (
      <p className="rounded-card border border-border bg-surface px-4 py-6 text-center text-body text-ink-muted">
        Nothing new. You&apos;re all caught up.
      </p>
    );

  return (
    <div className="flex flex-col gap-3">
      {inbox.anyUnread ? (
        <Button
          variant="secondary"
          className="self-end"
          onClick={() => void inbox.readAll()}
        >
          Mark all read
        </Button>
      ) : null}
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {inbox.items.map((n) => (
          <NotificationRow key={n.id} n={n} inbox={inbox} />
        ))}
      </ul>
    </div>
  );
}
