"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Listens to the group's stream and re-reads the page when something it shows changes.
 * Events carry ids only, so what each person sees is decided on the server. EventSource
 * reconnects by itself with Last-Event-ID; if the server refused it (signed out, left
 * the group), one fresh try after 30 s.
 */
export function GroupLive({
  groupId,
  postId,
}: {
  groupId: string;
  /** On a thread, only that thread's events matter. */
  postId?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    let source: EventSource | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // Several events close together become one refresh.
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 300);
    };
    const open = () => {
      source = new EventSource(`/api/groups/${groupId}/stream`);
      source.addEventListener("group", (e) => {
        const event = JSON.parse((e as MessageEvent<string>).data) as {
          postId: string;
        };
        if (!postId || event.postId === postId) refresh();
      });
      source.addEventListener("resync", refresh);
      // Anything posted between this page being rendered and the stream opening would
      // otherwise be missed, so the first open re-reads once.
      source.addEventListener("open", refresh);
      source.onerror = () => {
        if (source?.readyState !== EventSource.CLOSED) return;
        retryTimer = setTimeout(() => {
          open();
          refresh();
        }, 30_000);
      };
    };
    open();
    return () => {
      source?.close();
      clearTimeout(refreshTimer);
      clearTimeout(retryTimer);
    };
  }, [groupId, postId, router]);
  return null;
}
