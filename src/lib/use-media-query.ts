"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept in sync as the window changes. The server (and the
 * first client render) say false, so use it for things that open on demand, not for
 * what the page first shows.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
