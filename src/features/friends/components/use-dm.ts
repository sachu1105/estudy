"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PendingMessage } from "@/lib/squads/chat-types";

import { markDmReadAction } from "../actions";
import { DM_EVENT, DM_RESYNC, type DmEvent } from "./friends-live";

const byTime = (a: PendingMessage, b: PendingMessage) =>
  a.at.localeCompare(b.at) || a.id.localeCompare(b.id);

function mergeInto(prev: PendingMessage[], incoming: PendingMessage[]) {
  if (!incoming.length) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(byTime);
}

/**
 * One direct chat on the client: the server's first page, older pages on request, and a
 * catch-up whenever the person's stream says something changed in this chat.
 */
export function useDm({
  userId,
  initial,
  initialHasMore,
}: {
  /** The other person. */
  userId: string;
  initial: PendingMessage[];
  initialHasMore: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const base = `/api/friends/dm/${userId}/messages`;
  const router = useRouter();

  // Read up to now on open, and again (at most every couple of seconds) as messages arrive.
  const readTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const markRead = useCallback(() => {
    clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      if (document.visibilityState === "visible")
        void markDmReadAction({ userId });
    }, 1500);
  }, [userId]);
  // Opening reads the chat; the list and the rail redraw without its unread count.
  useEffect(() => {
    void markDmReadAction({ userId }).then(() => router.refresh());
    return () => clearTimeout(readTimer.current);
  }, [userId, router]);

  const catchUp = useCallback(async () => {
    const res = await fetch(base, { cache: "no-store" });
    if (!res.ok) return;
    const page = (await res.json()) as { messages: PendingMessage[] };
    setMessages((prev) => {
      const fresh = new Map(page.messages.map((m) => [m.id, m]));
      const kept = prev.filter((m) => !m.pending && !fresh.has(m.id));
      return [...kept, ...page.messages].sort(byTime);
    });
    markRead();
  }, [base, markRead]);

  // Opening catches up once: the page may come from the router's cache, from before
  // messages that arrived while the person was elsewhere.
  useEffect(() => {
    const timer = setTimeout(() => void catchUp(), 0);
    return () => clearTimeout(timer);
  }, [catchUp]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void catchUp(), 150);
    };
    const onEvent = (e: Event) => {
      const event = (e as CustomEvent<DmEvent>).detail;
      if (event.users.includes(userId)) soon();
    };
    window.addEventListener(DM_EVENT, onEvent);
    window.addEventListener(DM_RESYNC, soon);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(DM_EVENT, onEvent);
      window.removeEventListener(DM_RESYNC, soon);
    };
  }, [userId, catchUp]);

  const loadOlder = useCallback(async () => {
    const first = messages.find((m) => !m.pending);
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`${base}?before=${first.id}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const page = (await res.json()) as {
        messages: PendingMessage[];
        hasMore: boolean;
      };
      setMessages((prev) => mergeInto(prev, page.messages));
      setHasMore(page.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [base, messages, loadingOlder]);

  /** Shows a message at once; `settle` swaps in the server's copy or takes it back. */
  const addPending = useCallback((message: PendingMessage) => {
    setMessages((prev) => mergeInto(prev, [{ ...message, pending: true }]));
    return (saved: PendingMessage | null) =>
      setMessages((prev) => {
        const rest = prev.filter((m) => m.id !== message.id);
        return saved
          ? [...rest.filter((m) => m.id !== saved.id), saved].sort(byTime)
          : rest;
      });
  }, []);

  /** Changes one message in place (an edit or a delete) before the server says so. */
  const patch = useCallback(
    (id: string, change: (m: PendingMessage) => PendingMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === id ? change(m) : m))),
    [],
  );

  return { messages, hasMore, loadingOlder, loadOlder, addPending, patch };
}
