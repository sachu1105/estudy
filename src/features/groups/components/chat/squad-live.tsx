"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** A chat event as the squad stream sends it (ids only). */
export type SquadMessageEvent = {
  type: "message";
  action: "new" | "edit" | "delete" | "react";
  channelId: string;
  messageId: string;
  authorId: string;
};

/** Fired on window for every chat event, so an open chat needs no stream of its own. */
export const SQUAD_EVENT = "squad:message";
/** Fired when the stream (re)opens: anything may have been missed. */
export const SQUAD_RESYNC = "squad:resync";

/**
 * The squad's one live connection. It hands chat events to the open chat, and refreshes
 * the channel list (unread dots) when someone else writes in another channel.
 */
export function SquadLive({
  groupId,
  meId,
}: {
  groupId: string;
  meId: string;
}) {
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
    // Many messages close together become one refresh.
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 1500);
    };
    const open = () => {
      source = new EventSource(`/api/groups/${groupId}/stream`);
      source.addEventListener("group", (e) => {
        const event = JSON.parse((e as MessageEvent<string>).data) as {
          type: string;
        };
        if (event.type !== "message") return;
        const message = event as SquadMessageEvent;
        window.dispatchEvent(new CustomEvent(SQUAD_EVENT, { detail: message }));
        const viewing = here.current.endsWith(`/c/${message.channelId}`);
        if (message.action === "new" && message.authorId !== meId && !viewing)
          refresh();
      });
      const resync = () => window.dispatchEvent(new Event(SQUAD_RESYNC));
      source.addEventListener("open", resync);
      source.addEventListener("resync", resync);
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
  }, [groupId, meId, router]);
  return null;
}
