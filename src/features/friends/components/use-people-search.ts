"use client";

import { useEffect, useState } from "react";

export type FoundPerson = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  handle: string;
  status: "none" | "friends" | "sent" | "received";
  friendshipId: string | null;
};

const MIN = 2;

/**
 * People matching what's typed, a moment after typing stops. Null while there's nothing
 * to search for yet; an empty list when nobody matches.
 */
export function usePeopleSearch(text: string) {
  const q = text.trim().replace(/^@/, "");
  const [found, setFound] = useState<{ q: string; people: FoundPerson[] }>();
  useEffect(() => {
    if (q.length < MIN) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/friends/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!res.ok) return;
        const body = (await res.json()) as { people: FoundPerson[] };
        setFound({ q, people: body.people });
      } catch {
        // Aborted by the next keystroke, or offline: the last list stays.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);
  const searching = q.length >= MIN && found?.q !== q;
  const people = q.length < MIN ? null : (found?.people ?? null);
  // Mark a change in place (a request sent, accepted) without searching again.
  const update = (id: string, status: FoundPerson["status"]) =>
    setFound((f) =>
      f
        ? {
            ...f,
            people: f.people.map((p) => (p.id === id ? { ...p, status } : p)),
          }
        : f,
    );
  return { people, searching, update };
}
