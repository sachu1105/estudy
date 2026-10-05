"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error" | "invalid";

/**
 * Saves `value` `delayMs` after the last change. `save` returns an error message or null.
 * While `valid` is false nothing is sent and the state reads "invalid".
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<string | null>,
  { delayMs = 2000, valid = true }: { delayMs?: number; valid?: boolean } = {},
) {
  const [state, setState] = useState<Exclude<SaveState, "invalid">>("idle");
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const latest = useRef(value);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
    latest.current = value;
  });

  const run = useCallback(async () => {
    setState("saving");
    const message = await saveRef
      .current(latest.current)
      .catch(
        () =>
          "Couldn't save. Check your connection; your next change tries again.",
      );
    setError(message);
    setState(message ? "error" : "saved");
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!valid) return;
    const timer = setTimeout(() => void run(), delayMs);
    return () => clearTimeout(timer);
  }, [value, valid, delayMs, run]);

  return { state: (valid ? state : "invalid") as SaveState, error };
}
