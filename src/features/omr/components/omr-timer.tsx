"use client";

import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { clock, face, type TimerView } from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

import { TimerSetup } from "./timer-setup";
import { useOmrTimer } from "./use-omr-timer";

/**
 * The paper's clock in the header. Off, it offers to start one; on, it shows time left
 * (or used, with no limit) and opens pause, resume and reset. It keeps running if the
 * sheet is closed, like the exam hall's clock.
 */
export function OmrTimer({
  sheetId,
  initial,
  marked,
}: {
  sheetId: string;
  initial: TimerView;
  marked: number;
}) {
  const [open, setOpen] = useState(false);
  const { view, elapsed, pending, run } = useOmrTimer(sheetId, initial, () =>
    toast(`Time's up. You marked ${marked} of 100.`),
  );
  const shown = face(view.limitSec, elapsed);
  const left = view.limitSec === null ? null : view.limitSec - elapsed;
  const urgent = left !== null && left <= 60;
  const state = !view.running ? "paused" : shown.over ? "over time" : "running";

  return (
    <>
      {view.on ? (
        <Button
          variant="ghost"
          className="h-11 gap-1.5 px-2 md:h-10"
          aria-label={`Timer ${shown.text}, ${state}. Open timer controls`}
          onClick={() => setOpen(true)}
        >
          {view.running ? null : <Pause aria-hidden />}
          <span
            role="timer"
            className={cn(
              "font-mono text-body font-medium tabular-nums",
              urgent ? "text-danger-ink" : "text-ink",
              !view.running && "text-ink-muted",
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
          onClick={() => setOpen(true)}
        >
          <Timer aria-hidden />
          <span className="hidden sm:inline">Timer</span>
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetTitle>{view.on ? "Timer" : "Set a timer"}</SheetTitle>
          {view.on ? (
            <>
              <SheetDescription>
                {view.limitSec === null
                  ? "Counting up, no limit."
                  : `${clock(Math.min(elapsed, view.limitSec))} used of ${clock(view.limitSec)}.`}{" "}
                It keeps running if you leave the paper.
              </SheetDescription>
              <p
                className={cn(
                  "text-center font-mono text-[40px] leading-[48px] font-medium tabular-nums",
                  urgent && view.running ? "text-danger-ink" : "text-ink",
                )}
              >
                {shown.text}
              </p>
              {shown.over ? (
                <p className="text-center text-small text-ink-muted">
                  Time&apos;s up. The extra time shows with a plus.
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button disabled={pending} onClick={() => run({ op: "reset" })}>
                  <RotateCcw aria-hidden /> Reset timer
                </Button>
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() => run({ op: view.running ? "pause" : "resume" })}
                >
                  {view.running ? (
                    <>
                      <Pause aria-hidden /> Pause
                    </>
                  ) : (
                    <>
                      <Play aria-hidden /> Resume
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <SheetDescription>
                The clock counts down and keeps running if you leave the paper.
                Pause it any time.
              </SheetDescription>
              <TimerSetup
                pending={pending}
                onStart={(limitMin) => {
                  run({ op: "start", limitMin });
                  setOpen(false);
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
