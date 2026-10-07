"use client";

import { useState, useSyncExternalStore } from "react";

// Drafts survive a reload or a lost connection (friction rules: forms autosave drafts).
// Read through useSyncExternalStore so the server render and hydration agree.

const read = (key: string) => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

export function useDraft(key: string) {
  const saved = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => "",
  );
  // null until the person types: until then the saved draft shows.
  const [text, setText] = useState<string | null>(null);
  const set = (value: string) => {
    setText(value);
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      // Private mode: the draft just isn't kept.
    }
  };
  return [text ?? saved, set] as const;
}
