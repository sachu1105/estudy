"use client";

import { useMemo, useState } from "react";

import { useHydrated } from "@/lib/use-hydrated";

function read<T>(key: string): Partial<T> | null {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as Partial<T>) : null;
  } catch {
    // Nothing saved, unreadable, or storage is blocked.
    return null;
  }
}

/**
 * A form's text kept in this browser while it's being written, so leaving the page or
 * closing a dialog never loses it. Storage can be blocked: then it's plain state.
 */
export function useDraft<T extends object>(key: string, empty: T) {
  const storageKey = `draft:${key}`;
  const hydrated = useHydrated();
  // Read once the page is live in the browser, so the server and first paint agree.
  const saved = useMemo(
    () => (hydrated ? read<T>(storageKey) : null),
    [hydrated, storageKey],
  );
  const [edited, setEdited] = useState<T | null>(null);
  const value: T = edited ?? (saved ? { ...empty, ...saved } : empty);

  const update = (patch: Partial<T>) => {
    const next = { ...value, ...patch };
    setEdited(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Storage blocked: the draft lives for this visit only.
    }
  };

  const clear = () => {
    setEdited(empty);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Nothing to clear.
    }
  };

  return [value, update, clear] as const;
}
