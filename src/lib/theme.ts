"use client";

import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function resolve(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return darkQuery().matches ? "dark" : "light";
}

function readPreference(): ThemePreference {
  const value = document.documentElement.getAttribute("data-theme-pref");
  return value === "light" || value === "dark" ? value : "system";
}

function apply(preference: ThemePreference) {
  const root = document.documentElement;
  root.setAttribute("data-theme-pref", preference);
  root.setAttribute("data-theme", resolve(preference));
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  apply(preference);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const query = darkQuery();
  const onSystemChange = () => {
    if (readPreference() === "system") apply("system");
  };
  query.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    query.removeEventListener("change", onSystemChange);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "system");
}
