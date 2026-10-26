"use client";

import { useSyncExternalStore } from "react";

// Light unless the user picked dark. The OS colour scheme is not followed.
export type ThemePreference = "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "dark" ? "dark" : "light";
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  document.documentElement.setAttribute("data-theme", preference);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "light");
}
