"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SheetDescription } from "@/components/ui/sheet";
import { clock, face, type TimerView } from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

/** A running timer, large: time used of the limit, and a reset that asks first. */
export function TimerPanel({
  view,
  elapsed,
  pending,
  onReset,
}: {
  view: TimerView;
  elapsed: number;
  pending: boolean;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const shown = face(view.limitSec, elapsed);
  const urgent = view.limitSec !== null && view.limitSec - elapsed <= 60;

  return (
    <>
      <SheetDescription>
        {view.limitSec === null
          ? "Counting up, no limit."
          : `${clock(Math.min(elapsed, view.limitSec))} used of ${clock(view.limitSec)}.`}{" "}
        Like the exam hall clock, it can&apos;t be paused.
      </SheetDescription>
      <p
        className={cn(
          "text-center font-mono text-[40px] leading-[48px] font-medium tabular-nums",
          urgent ? "text-danger-ink" : "text-ink",
        )}
      >
        {shown.text}
      </p>
      {shown.over ? (
        <p className="text-center text-small text-ink-muted">
          Time&apos;s up. The extra time shows with a plus.
        </p>
      ) : null}
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-card border border-border p-4">
          <p className="text-body">
            Reset the timer? It goes back to the start, and your marks stay.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setConfirming(false)}>
              Keep it running
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                onReset();
                setConfirming(false);
              }}
            >
              Reset timer
            </Button>
          </div>
        </div>
      ) : (
        <Button className="self-end" onClick={() => setConfirming(true)}>
          <RotateCcw aria-hidden /> Reset timer
        </Button>
      )}
    </>
  );
}
