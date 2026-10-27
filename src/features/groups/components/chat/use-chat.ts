"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PendingMessage } from "@/lib/squads/chat-types";

import { markReadAction } from "../../chat-actions";
import {
  SQUAD_EVENT,
  SQUAD_RESYNC,
  type SquadMessageEvent,
} from "./squad-live";

const byTime = (a: PendingMessage, b: PendingMessage) =>
  a.at.localeCompare(b.at) || a.id.localeCompare(b.id);

/** Adds or replaces messages by id, keeping time order. */
function mergeInto(prev: PendingMessage[], incoming: PendingMessage[]) {
  if (!incoming.length) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(byTime);
}

/**
 * One chat channel's messages on the client: the server's first page, older pages on
 * request, and catch-ups whenever the squad stream says something changed here.
 */
export function useChat({
  groupId,
  channelId,
  initial,
  initialHasMore,
}: {
  groupId: string;
  channelId: string;
  initial: PendingMessage[];
  initialHasMore: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const base = `/api/groups/${groupId}/channels/${channelId}/messages`;

  const merge = useCallback(
    (incoming: PendingMessage[]) =>
      setMessages((prev) => mergeInto(prev, incoming)),
    [],
  );

  // A server refresh brings a fresh first page: fold it in, never drop what's loaded.
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setMessages((prev) => mergeInto(prev, initial));
  }

  // Read up to now on open, and again (at most every few seconds) as messages arrive.
  const readTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const markRead = useCallback(() => {
    clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      if (document.visibilityState === "visible")
        void markReadAction({ groupId, channelId });
    }, 1500);
  }, [groupId, channelId]);
  useEffect(() => {
    void markReadAction({ groupId, channelId });
    return () => clearTimeout(readTimer.current);
  }, [groupId, channelId]);

  // Catch up on the latest page: covers new, edited, deleted and reacted messages.
  const catchUp = useCallback(async () => {
    const res = await fetch(base, { cache: "no-store" });
    if (!res.ok) return;
    const page = (await res.json()) as { messages: PendingMessage[] };
    setMessages((prev) => {
      const fresh = new Map(page.messages.map((m) => [m.id, m]));
      // Drop optimistic copies the server now has.
      const kept = prev.filter((m) => !m.pending && !fresh.has(m.id));
      return [...kept, ...page.messages].sort(byTime);
    });
    markRead();
  }, [base, markRead]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void catchUp(), 150);
    };
    const onEvent = (e: Event) => {
      const event = (e as CustomEvent<SquadMessageEvent>).detail;
      if (event.channelId === channelId) soon();
    };
    window.addEventListener(SQUAD_EVENT, onEvent);
    window.addEventListener(SQUAD_RESYNC, soon);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(SQUAD_EVENT, onEvent);
      window.removeEventListener(SQUAD_RESYNC, soon);
    };
  }, [channelId, catchUp]);

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
      merge(page.messages);
      setHasMore(page.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [base, messages, loadingOlder, merge]);

  /**
   * Loads older pages until a message is in the list (a search result far back), up to
   * about a thousand messages. False when it's further back than that, or gone.
   */
  const reach = useCallback(
    async (id: string) => {
      if (messages.some((m) => m.id === id)) return true;
      let oldest = messages.find((m) => !m.pending)?.id;
      for (let i = 0; oldest && i < 20; i++) {
        const res = await fetch(`${base}?before=${oldest}`, {
          cache: "no-store",
        });
        if (!res.ok) return false;
        const page = (await res.json()) as {
          messages: PendingMessage[];
          hasMore: boolean;
        };
        merge(page.messages);
        setHasMore(page.hasMore);
        if (page.messages.some((m) => m.id === id)) return true;
        if (!page.hasMore) return false;
        oldest = page.messages[0]?.id;
      }
      return false;
    },
    [base, messages, merge],
  );

  /** Shows a message at once; `settle` swaps in the server's copy or takes it back. */
  const addPending = useCallback(
    (message: PendingMessage) => {
      merge([{ ...message, pending: true }]);
      return (saved: PendingMessage | null) =>
        setMessages((prev) => {
          const rest = prev.filter((m) => m.id !== message.id);
          return saved
            ? [...rest.filter((m) => m.id !== saved.id), saved].sort(byTime)
            : rest;
        });
    },
    [merge],
  );

  /** Changes one message in place (an edit, a reaction, a delete) before the server says so. */
  const patch = useCallback(
    (id: string, change: (m: PendingMessage) => PendingMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === id ? change(m) : m))),
    [],
  );

  return {
    messages,
    hasMore,
    loadingOlder,
    loadOlder,
    reach,
    addPending,
    patch,
    catchUp,
  };
}
