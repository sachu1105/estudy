"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { Pen } from "@/lib/omr/ink";

// How the person likes their answer sheet: the pen colour, and whether marks are final
// as with a real pen. A per-browser convenience, so it lives in localStorage; the page
// draws the defaults until it has read them.

export type { Pen };
export type OmrPrefs = { pen: Pen; final: boolean };

const KEY = "omr-prefs";
const CHANGE = "omr-prefs-change";
const DEFAULTS: OmrPrefs = { pen: "black", final: true };

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function parse(raw: string): OmrPrefs {
  try {
    const value = JSON.parse(raw) as Partial<OmrPrefs>;
    return {
      pen: value.pen === "blue" ? "blue" : "black",
      final: typeof value.final === "boolean" ? value.final : DEFAULTS.final,
    };
  } catch {
    return DEFAULTS;
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

export function useOmrPrefs() {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const prefs = raw ? parse(raw) : DEFAULTS;
  const set = useCallback((change: Partial<OmrPrefs>) => {
    const next = { ...parse(read() || "{}"), ...change };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private mode or storage off: the choice lasts until the page closes.
    }
    window.dispatchEvent(new Event(CHANGE));
  }, []);
  return [prefs, set] as const;
}
