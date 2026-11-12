"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "@/components/ui/toast";

import { deleteNotificationAction, markReadAction } from "./actions";
import type { NotificationView } from "./view";

/** Fired after any change, so the bell re-counts whichever list made it. */
export const INBOX_CHANGED = "studypods:inbox-changed";

type Result = { ok: true } | { ok: false; error: string };

/**
 * One inbox's rows, changed optimistically: read, read all, delete, open. A failed call
 * puts the rows back as they were. `onUnread` hears how the unread count moved.
 */
export function useInbox(
  initial: NotificationView[],
  onUnread?: (delta: number) => void,
) {
  const router = useRouter();
  const [items, setItems] = useState(initial);

  const change = async (
    next: NotificationView[],
    delta: number,
    call: () => Promise<Result>,
  ) => {
    const before = items;
    setItems(next);
    if (delta) onUnread?.(delta);
    const result = await call().catch(
      (): Result => ({ ok: false, error: "Check your connection and try again." }),
    );
    if (!result.ok) {
      setItems(before);
      if (delta) onUnread?.(-delta);
      toast.error(result.error);
      return;
    }
    window.dispatchEvent(new Event(INBOX_CHANGED));
  };

  const read = (id: string) => {
    if (!items.some((n) => n.id === id && n.unread)) return Promise.resolve();
    return change(
      items.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      -1,
      () => markReadAction({ id }),
    );
  };

  return {
    items,
    /** Replaces the rows with a fresh load. */
    reset: setItems,
    anyUnread: items.some((n) => n.unread),
    read,
    readAll: () =>
      change(
        items.map((n) => ({ ...n, unread: false })),
        -items.filter((n) => n.unread).length,
        () => markReadAction({ id: null }),
      ),
    remove: (id: string) => {
      const gone = items.find((n) => n.id === id);
      return change(
        items.filter((n) => n.id !== id),
        gone?.unread ? -1 : 0,
        () => deleteNotificationAction({ id }),
      );
    },
    /** Opening one reads it and goes where it points. */
    open: (n: NotificationView) => {
      void read(n.id);
      router.push(n.href);
    },
  };
}

export type Inbox = ReturnType<typeof useInbox>;
