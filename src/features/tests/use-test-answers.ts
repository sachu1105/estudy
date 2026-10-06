"use client";

import { useCallback, useSyncExternalStore } from "react";

type Saved = { answers: Record<string, number>; flags: string[] };

const EMPTY: Saved = { answers: {}, flags: [] };
const cache = new Map<string, Saved>();
const listeners = new Set<() => void>();
const key = (testId: string) => `test:${testId}`;

function load(testId: string): Saved {
  const cached = cache.get(testId);
  if (cached) return cached;
  let saved = EMPTY;
  try {
    const raw = window.localStorage.getItem(key(testId));
    if (raw) saved = JSON.parse(raw) as Saved;
  } catch {
    // Storage may be off (private mode): answers then live only in memory.
  }
  cache.set(testId, saved);
  return saved;
}

function save(testId: string, next: Saved) {
  cache.set(testId, next);
  try {
    window.localStorage.setItem(key(testId), JSON.stringify(next));
  } catch {
    // See load().
  }
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Answers and flags for one test, kept in this browser so a refresh or a closed tab
 * doesn't lose them. Nothing is scored here; the server scores on submit.
 */
export function useTestAnswers(testId: string) {
  const state = useSyncExternalStore(
    subscribe,
    () => load(testId),
    () => EMPTY,
  );
  const update = useCallback(
    (change: (s: Saved) => Saved) => save(testId, change(load(testId))),
    [testId],
  );
  return {
    answers: state.answers,
    flags: new Set(state.flags),
    choose: (questionId: string, index: number) =>
      update((s) => ({ ...s, answers: { ...s.answers, [questionId]: index } })),
    toggleFlag: (questionId: string) =>
      update((s) => ({
        ...s,
        flags: s.flags.includes(questionId)
          ? s.flags.filter((f) => f !== questionId)
          : [...s.flags, questionId],
      })),
    clear: () => {
      cache.delete(testId);
      try {
        window.localStorage.removeItem(key(testId));
      } catch {
        // See load().
      }
    },
  };
}
