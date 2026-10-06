"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { PlanDraft } from "@/lib/plans/draft";

import { savePlanDraftAction } from "./actions";

export type DraftSaveState = "idle" | "saving" | "saved" | "error";

/**
 * One step's view of the plan setup. Changes save themselves after a short pause; `goTo`
 * saves at once and then moves, so going back or forward never loses anything.
 */
export function usePlanDraft(draftId: string, initial: PlanDraft) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [state, setState] = useState<DraftSaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [moving, startMoving] = useTransition();
  const dirty = useRef(false);
  const latest = useRef(initial);

  const save = async (value: PlanDraft) => {
    setState("saving");
    const result = await savePlanDraftAction({ draftId, data: value }).catch(
      () => ({
        ok: false as const,
        error: "Couldn't save. Check your connection.",
      }),
    );
    if (latest.current === value) dirty.current = !result.ok;
    setError(result.ok ? null : result.error);
    setState(result.ok ? "saved" : "error");
    return result.ok;
  };

  useEffect(() => {
    latest.current = draft;
    if (!dirty.current) return;
    const timer = setTimeout(() => void save(draft), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save is stable in effect
  }, [draft]);

  const update = (change: Partial<PlanDraft>) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, ...change }));
  };

  const goTo = (href: string) =>
    startMoving(async () => {
      if (dirty.current && !(await save(latest.current))) return;
      router.push(href);
    });

  return { draft, update, state, error, goTo, moving };
}
