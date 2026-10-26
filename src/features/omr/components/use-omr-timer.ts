"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { toast } from "@/components/ui/toast";
import type { TimerView } from "@/lib/omr/timer";

import { timerAction } from "../actions";

type Op = { op: "start"; limitMin: number | null } | { op: "reset" };

const OFF: TimerView = {
  on: false,
  limitSec: null,
  elapsedSec: 0,
  running: false,
};

/**
 * The timer as the server last reported it, ticking on from the moment it arrived.
 * Starting shows at once and rolls back if the server says no. `onTimeUp` runs when a
 * countdown reaches zero while the sheet is open.
 *
 * Leaving a sitting ends it, so a paper that opens with its clock still running was
 * left (closed, reloaded, the phone died): the clock is reset and `abandoned` is true.
 */
export function useOmrTimer(
  sheetId: string,
  initial: TimerView,
  onTimeUp: () => void,
) {
  const [abandoned] = useState(initial.on);
  const [base, setBase] = useState(() => ({
    view: initial.on ? OFF : initial,
    at: Date.now(),
  }));
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

  useEffect(() => {
    if (abandoned) void timerAction({ id: sheetId, timer: { op: "reset" } });
  }, [abandoned, sheetId]);

  function show(next: TimerView) {
    const at = Date.now();
    setBase({ view: next, at });
    setNow(at);
  }

  function run(input: Op) {
    const previous = { ...view, elapsedSec: elapsed };
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
        return show(previous);
      }
      show(result.timer);
    });
  }

  /** Reset and wait for it: leaving the exam does this before it navigates. */
  async function reset() {
    const result = await timerAction({ id: sheetId, timer: { op: "reset" } });
    if (result.ok) show(result.timer);
    return result.ok;
  }

  return { view, elapsed, pending, abandoned, run, reset };
}

export type OmrTimerState = ReturnType<typeof useOmrTimer>;
