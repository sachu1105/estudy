"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import type { Marks } from "@/lib/omr/marks";

import type { SheetApi } from "./sheet-api";

/**
 * The sheet's marks, saved half a second after the last tap. Anything not yet sent goes
 * when the tab is hidden (a phone switching apps) or the sheet closes; `flush` lets a
 * link wait for it, and a tab close with unsent marks asks first.
 */
export function useSavedMarks(save: SheetApi["saveMarks"], initial: Marks) {
  const [marks, setMarks] = useState(initial);
  const [saving, setSaving] = useState(false);
  const saved = useRef(initial);
  const latest = useRef(initial);
  // The save waiting out the half second. A flush sends now and cancels it, so it can't
  // land later (after a hand-in has cleared the sheet) and write the old marks back.
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (waiting.current) clearTimeout(waiting.current);
    waiting.current = null;
  }, []);

  const send = useCallback(
    async (next: Marks) => {
      const result = await save(next);
      if (!result.ok) return void toast.error(result.error);
      saved.current = next;
      if (latest.current === next) setSaving(false);
    },
    [save],
  );
  const dirty = useCallback(() => latest.current !== saved.current, []);
  const flush = useCallback(async () => {
    cancel();
    if (dirty()) await send(latest.current);
  }, [cancel, dirty, send]);

  useEffect(() => {
    latest.current = marks;
    if (marks === saved.current) return;
    setSaving(true);
    waiting.current = setTimeout(() => {
      waiting.current = null;
      void send(marks);
    }, 500);
    return cancel;
  }, [marks, send, cancel]);

  useEffect(() => {
    const hidden = () => document.visibilityState === "hidden" && void flush();
    const warn = (e: BeforeUnloadEvent) => dirty() && e.preventDefault();
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("beforeunload", warn);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("beforeunload", warn);
      void flush();
    };
  }, [dirty, flush]);

  return { marks, setMarks, saving, dirty, flush };
}
