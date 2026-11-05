"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The rail's unread dots and Friends count. The rail stays mounted between squads, so
 * after each move it asks again; a fresh render from the server (a refresh, a join)
 * replaces whatever it had.
 */
export function useRailMarks(initial: { unread: string[]; friends: number }) {
  const pathname = usePathname();
  const [marks, setMarks] = useState(initial);
  // Compared by value: the rail builds a new object on every render.
  const key = JSON.stringify(initial);
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setMarks(initial);
  }
  const [firstPath] = useState(pathname);
  useEffect(() => {
    if (pathname === firstPath) return;
    const controller = new AbortController();
    void fetch("/api/groups/rail", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((next: { unread: string[]; friends: number } | null) => {
        if (next) setMarks(next);
      })
      .catch(() => {
        // Aborted by the next move, or offline: the marks stay as they were.
      });
    return () => controller.abort();
  }, [pathname, firstPath]);
  return { unread: new Set(marks.unread), friends: marks.friends };
}
