"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import type { AnswerKey } from "@/lib/omr/key";

import { saveKeyAction } from "../actions";

export type KeySource = "OWN" | "OFFICIAL";
type Saved = { answerKey: AnswerKey; source: KeySource };

/**
 * The answer key and who wrote it, saved half a second after the last change. Anything
 * not yet sent goes when the tab is hidden or the page closes.
 */
export function useSavedKey(id: string, initial: Saved) {
  const [value, setValue] = useState(initial);
  // What the server last confirmed: a change shows as "Saving" on the very next render.
  const [confirmed, setConfirmed] = useState(initial);
  const saved = useRef(initial);
  const latest = useRef(initial);

  const send = useCallback(
    async (next: Saved) => {
      const result = await saveKeyAction({ id, ...next });
      if (!result.ok) return void toast.error(result.error);
      saved.current = next;
      setConfirmed(next);
    },
    [id],
  );
  const flush = useCallback(async () => {
    if (latest.current !== saved.current) await send(latest.current);
  }, [send]);

  useEffect(() => {
    latest.current = value;
    if (value === saved.current) return;
    const timer = setTimeout(() => void send(value), 500);
    return () => clearTimeout(timer);
  }, [value, send]);

  useEffect(() => {
    const hidden = () => document.visibilityState === "hidden" && void flush();
    const warn = (e: BeforeUnloadEvent) =>
      latest.current !== saved.current && e.preventDefault();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("beforeunload", warn);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("beforeunload", warn);
      void flush();
    };
  }, [flush]);

  const setKey = useCallback(
    (change: (key: AnswerKey) => AnswerKey) =>
      setValue((v) => ({ ...v, answerKey: change(v.answerKey) })),
    [],
  );
  const setSource = useCallback(
    (source: KeySource) => setValue((v) => ({ ...v, source })),
    [],
  );

  return { ...value, setKey, setSource, saving: value !== confirmed, flush };
}
