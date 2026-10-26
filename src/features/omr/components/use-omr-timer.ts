"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { toast } from "@/components/ui/toast";
import type { TimerView } from "@/lib/omr/timer";

import { timerAction } from "../actions";

type Op =
  | { op: "start"; limitMin: number | null }
  | { op: "pause" | "resume" | "reset" };

/**
 * The timer as the server last reported it, ticking on from the moment it arrived.
 * Pause and resume show at once and roll back if the server says no. `onTimeUp` runs
 * when a countdown reaches zero while the sheet is open.
 */
export function useOmrTimer(
  sheetId: string,
  initial: TimerView,
  onTimeUp: () => void,
) {
  const [base, setBase] = useState(() => ({ view: initial, at: Date.now() }));
  const [now, setNow] = useState(base.at);
  const [pending, startTransition] = useTransition();
  const { view } = base;
  const elapsed =
    view.elapsedSec +
    (view.running ? Math.max(0, Math.floor((now - base.at) / 1000)) : 0);

  useEffect(() => {
    if (!view.running) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [view.running]);

  const timeUp = useRef(onTimeUp);
  const before = useRef(elapsed);
  useEffect(() => {
    timeUp.current = onTimeUp;
  });
  useEffect(() => {
    const limit = view.limitSec;
    if (view.running && limit !== null && before.current < limit)
      if (elapsed >= limit) timeUp.current();
    before.current = elapsed;
  }, [elapsed, view.limitSec, view.running]);

  function show(next: TimerView) {
    const at = Date.now();
    setBase({ view: next, at });
    setNow(at);
  }

  function run(input: Op) {
    const previous = { view: { ...view, elapsedSec: elapsed }, at: Date.now() };
    if (input.op === "pause")
      show({ ...view, elapsedSec: elapsed, running: false });
    if (input.op === "resume") show({ ...view, running: true });
    if (input.op === "start")
      show({
        on: true,
        limitSec: input.limitMin === null ? null : input.limitMin * 60,
        elapsedSec: 0,
        running: true,
      });
    startTransition(async () => {
      const result = await timerAction({ id: sheetId, timer: input });
      if (!result.ok) {
        toast.error(result.error);
        return show(previous.view);
      }
      show(result.timer);
    });
  }

  return { view, elapsed, pending, run };
}
