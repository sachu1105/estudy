"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during SSR and before hydration, true after. No effect, no extra render pass. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
