"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** A direct-message event as the person's stream sends it (ids only). */
export type DmEvent = {
  type: "dm";
  action: "new" | "edit" | "delete";
  users: [string, string];
  messageId: string;
  authorId: string;
};

/** Fired on window for each DM event, so an open chat needs no stream of its own. */
export const DM_EVENT = "dm:message";
/** Fired when the stream (re)opens: anything may have been missed. */
export const DM_RESYNC = "dm:resync";

/**
 * The person's one live connection while on Friends. It hands DM events to the open
 * chat, and refreshes the lists (requests, unread counts) when something changes there.
 */
export function FriendsLive({ meId }: { meId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const here = useRef(pathname);
  useEffect(() => {
    here.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let source: EventSource | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // Many changes close together become one refresh.
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 800);
    };
    const open = () => {
      source = new EventSource("/api/friends/stream");
      source.addEventListener("user", (e) => {
        const event = JSON.parse((e as MessageEvent<string>).data) as
          DmEvent | { type: "friends" };
        if (event.type === "friends") return refresh();
        window.dispatchEvent(new CustomEvent(DM_EVENT, { detail: event }));
        const other = event.users.find((u) => u !== meId) ?? meId;
        const viewing = here.current === `/groups/friends/dm/${other}`;
        if (event.action === "new" && event.authorId !== meId && !viewing)
          refresh();
      });
      source.addEventListener("open", () =>
        window.dispatchEvent(new Event(DM_RESYNC)),
      );
      source.onerror = () => {
        if (source?.readyState !== EventSource.CLOSED) return;
        retryTimer = setTimeout(open, 30_000);
      };
    };
    open();
    return () => {
      source?.close();
      clearTimeout(refreshTimer);
      clearTimeout(retryTimer);
    };
  }, [meId, router]);
  return null;
}
