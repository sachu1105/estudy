"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

// How wide the person likes the answer sheet beside the paper, from dragging the divider.
// A per-browser convenience in localStorage; until it's read (or never set), the layout's
// own default holds.

const KEY = "omr-sheet-width";
const CHANGE = "omr-sheet-width-change";

/** Narrowest the sheet goes: one column of bubbles. */
export const SHEET_MIN = 300;
/** Widest it goes: all four columns of 25 side by side, comfortably; wider is only blank. */
export const SHEET_MAX = 1040;
/** Room the paper always keeps beside it. */
export const PAPER_MIN = 320;

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
};

export function useSheetWidth() {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const saved =
    Number(raw) >= SHEET_MIN ? Math.min(SHEET_MAX, Number(raw)) : null;
  // While dragging, the width follows the pointer; it's saved when the drag ends.
  const [live, setLive] = useState<number | null>(null);
  const commit = useCallback((width: number) => {
    setLive(null);
    try {
      localStorage.setItem(KEY, String(Math.round(width)));
    } catch {
      // Storage off: the width lasts until the page closes.
    }
    window.dispatchEvent(new Event(CHANGE));
  }, []);
  return { width: live ?? saved, setLive, commit };
}
