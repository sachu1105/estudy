"use client";

import { Timer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { face } from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

import { ExamStart } from "./exam-start";
import { StartCountdown } from "./start-countdown";
import { TimerPanel } from "./timer-panel";
import type { OmrTimerState } from "./use-omr-timer";

/**
 * The paper's clock in the header, run like the exam hall's: started before the first
 * answer, never paused, only reset. Off, it offers to start one (and the sheet asks for
 * it when a bubble is tapped first); on, it shows time left, or time used with no limit.
 */
export function OmrTimer({
  title,
  timer,
  open,
  onOpenChange,
  onDismiss,
  prompted,
  onStart,
}: {
  title: string;
  timer: OmrTimerState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The person closed the sheet without starting. */
  onDismiss: () => void;
  /** Opened by a tap on the sheet before the timer was started. */
  prompted: boolean;
  onStart: (limitMin: number | null) => void;
}) {
  const { view, elapsed, pending, run } = timer;
  // The limit chosen, while the 3-2-1 runs; the clock starts when it ends.
  const [starting, setStarting] = useState<{ limit: number | null } | null>(
    null,
  );
  const shown = face(view.limitSec, elapsed);
  const left = view.limitSec === null ? null : view.limitSec - elapsed;
  const urgent = left !== null && left <= 60;
  const change = (next: boolean) => {
    onOpenChange(next);
    if (!next) onDismiss();
  };

  return (
    <>
      {view.on ? (
        <Button
          variant="ghost"
          className="h-11 px-2 md:h-10"
          aria-label={`Timer ${shown.text}${shown.over ? ", over time" : ""}. Open timer`}
          aria-busy={pending || undefined}
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
          aria-label="Start the exam timer"
          onClick={() => change(true)}
        >
          <span className="relative">
            <Timer aria-hidden />
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 size-2 animate-pulse-ring rounded-full bg-accent"
            />
          </span>
          <span className="hidden sm:inline">Start exam</span>
        </Button>
      )}

      <Sheet open={open} onOpenChange={change}>
        <SheetContent
          side="bottom"
          // Focus the one action, not the first chip (its ring reads as "chosen").
          onOpenAutoFocus={(e) => {
            const start = (
              e.currentTarget as HTMLElement
            ).querySelector<HTMLElement>("[data-autofocus]");
            if (!start) return;
            e.preventDefault();
            start.focus();
          }}
        >
          {view.on ? null : (
            <p className="text-micro text-ink-muted uppercase">Exam mode</p>
          )}
          <SheetTitle className={view.on ? undefined : "-mt-3"}>
            {view.on ? "Timer" : "Ready to start?"}
          </SheetTitle>
          {view.on ? (
            <TimerPanel
              view={view}
              elapsed={elapsed}
              pending={pending}
              onReset={() => run({ op: "reset" })}
            />
          ) : (
            <>
              <SheetDescription className="sr-only">
                Choose how long the paper gets, then start the exam.
              </SheetDescription>
              <ExamStart
                title={title}
                prompted={prompted}
                pending={pending}
                onStart={(limit) => {
                  setStarting({ limit });
                  onOpenChange(false);
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
      {starting ? (
        <StartCountdown
          title={title}
          onDone={() => {
            onStart(starting.limit);
            setStarting(null);
          }}
        />
      ) : null}
    </>
  );
}
