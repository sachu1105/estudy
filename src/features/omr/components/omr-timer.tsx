"use client";

import { RotateCcw, Timer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { clock, face } from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

import { TimerSetup } from "./timer-setup";
import type { OmrTimerState } from "./use-omr-timer";

/**
 * The paper's clock in the header, run like the exam hall's: started before the first
 * answer, never paused, only reset. Off, it offers to start one (and the sheet asks for
 * it when a bubble is tapped first); on, it shows time left, or time used with no limit.
 */
export function OmrTimer({
  timer,
  open,
  onOpenChange,
  prompted,
  onStart,
}: {
  timer: OmrTimerState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened by a tap on the sheet before the timer was started. */
  prompted: boolean;
  onStart: (limitMin: number | null) => void;
}) {
  const { view, elapsed, pending, run } = timer;
  const [confirming, setConfirming] = useState(false);
  const shown = face(view.limitSec, elapsed);
  const left = view.limitSec === null ? null : view.limitSec - elapsed;
  const urgent = left !== null && left <= 60;
  const change = (next: boolean) => {
    setConfirming(false);
    onOpenChange(next);
  };

  return (
    <>
      {view.on ? (
        <Button
          variant="ghost"
          className="h-11 px-2 md:h-10"
          aria-label={`Timer ${shown.text}${shown.over ? ", over time" : ""}. Open timer`}
          onClick={() => change(true)}
        >
          <span
            role="timer"
            className={cn(
              "font-mono text-body font-medium tabular-nums",
              urgent ? "text-danger-ink" : "text-ink",
            )}
          >
            {shown.text}
          </span>
        </Button>
      ) : (
        <Button
          variant="ghost"
          className="h-11 px-2 md:h-10"
          aria-label="Start a timer"
          onClick={() => change(true)}
        >
          <Timer aria-hidden />
          <span className="hidden sm:inline">Start timer</span>
        </Button>
      )}

      <Sheet open={open} onOpenChange={change}>
        <SheetContent side="bottom">
          <SheetTitle>{view.on ? "Timer" : "Start the timer"}</SheetTitle>
          {view.on ? (
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
                    Reset the timer? It goes back to the start, and your marks
                    stay.
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button onClick={() => setConfirming(false)}>
                      Keep it running
                    </Button>
                    <Button
                      variant="danger"
                      disabled={pending}
                      onClick={() => {
                        run({ op: "reset" });
                        setConfirming(false);
                      }}
                    >
                      Reset timer
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="self-end"
                  onClick={() => setConfirming(true)}
                >
                  <RotateCcw aria-hidden /> Reset timer
                </Button>
              )}
            </>
          ) : (
            <>
              <SheetDescription>
                {prompted
                  ? "Start the clock before you mark your first answer, as in the exam. "
                  : ""}
                It counts down and keeps running if you leave the paper. It
                can&apos;t be paused, only reset.
              </SheetDescription>
              <TimerSetup pending={pending} onStart={onStart} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
