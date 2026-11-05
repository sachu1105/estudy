"use client";

import { useSyncExternalStore } from "react";

const WIDE = "(min-width: 768px)";
const subscribe = (change: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

/** Sheets beside the timer come from the side on a wide screen, from the bottom on a phone. */
export function useSheetSide() {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  return wide ? ("right" as const) : ("bottom" as const);
}
