"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import type { Marks } from "@/lib/omr/marks";

import { saveMarksAction } from "../actions";

/**
 * The sheet's marks, saved half a second after the last tap. Anything not yet sent goes
 * when the tab is hidden (a phone switching apps) or the sheet closes; `flush` lets a
 * link wait for it, and a tab close with unsent marks asks first.
 */
export function useSavedMarks(id: string, initial: Marks) {
  const [marks, setMarks] = useState(initial);
  const [saving, setSaving] = useState(false);
  const saved = useRef(initial);
  const latest = useRef(initial);

  const send = useCallback(
    async (next: Marks) => {
      const result = await saveMarksAction({ id, marks: next });
      if (!result.ok) return void toast.error(result.error);
      saved.current = next;
      if (latest.current === next) setSaving(false);
    },
    [id],
  );
  const dirty = useCallback(() => latest.current !== saved.current, []);
  const flush = useCallback(
    async () => void (dirty() && (await send(latest.current))),
    [dirty, send],
  );

  useEffect(() => {
    latest.current = marks;
    if (marks === saved.current) return;
    setSaving(true);
    const timer = setTimeout(() => void send(marks), 500);
    return () => clearTimeout(timer);
  }, [marks, send]);

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
