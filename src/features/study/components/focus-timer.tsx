"use client";

import { Check, Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

import {
  beatAction,
  finishSessionAction,
  startSessionAction,
} from "../actions";

const BEAT_MS = 60_000;

function clock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * The running timer. The server holds the time, so a refresh carries on; the browser
 * ticks locally for display and beats every minute so idle time doesn't count.
 */
export function FocusTimer({
  taskId,
  plannedMinutes,
}: {
  taskId: string;
  plannedMinutes: number;
}) {
  const router = useRouter();
  const [seconds, setSeconds] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [busy, start] = useTransition();

  useEffect(() => {
    let live = true;
    void startSessionAction({ taskId }).then((r) => {
      if (!live) return;
      if (!r.ok) return void toast.error(r.error);
      setSeconds(r.seconds);
      setPaused(r.paused);
      if (r.closedOther > 0)
        toast.success(`Your other session was saved: ${r.closedOther} min`);
    });
    return () => {
      live = false;
    };
  }, [taskId]);

  useEffect(() => {
    if (seconds === null || paused) return;
    const tick = setInterval(() => setSeconds((s) => (s ?? 0) + 1), 1000);
    const beat = setInterval(() => {
      void beatAction({}).then((r) => r.ok && setSeconds(r.seconds));
    }, BEAT_MS);
    return () => {
      clearInterval(tick);
      clearInterval(beat);
    };
  }, [paused, seconds === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () =>
    start(async () => {
      const r = await beatAction({ paused: !paused });
      if (!r.ok) return void toast.error(r.error);
      setSeconds(r.seconds);
      setPaused(r.paused);
    });

  const finish = (complete: boolean) =>
    start(async () => {
      const r = await finishSessionAction({ complete });
      if (!r.ok) return void toast.error(r.error);
      toast.success(
        r.minutes > 0
          ? `Session saved: ${r.minutes} min${complete ? ", task done" : ""}`
          : complete
            ? "Task done"
            : "Session ended",
      );
      router.push("/today");
    });

  const planned = plannedMinutes * 60;
  const percent =
    seconds === null ? 0 : Math.min(100, (seconds / planned) * 100);
  const left = seconds === null ? null : Math.ceil((planned - seconds) / 60);
  const disabled = busy || seconds === null;

  return (
    <div className="flex flex-1 flex-col md:flex-none">
      {/* The ring holds the middle of the screen on a phone; on md+ it sits under the title. */}
      <div className="flex flex-1 items-center justify-center py-6 md:py-10">
        <ProgressRing
          value={percent}
          size={264}
          strokeWidth={12}
          label="Time studied against the plan"
          className={cn(
            "transition-opacity duration-[200ms]",
            paused && "opacity-60",
          )}
        >
          <span className="flex flex-col items-center gap-1">
            <span className="text-micro text-ink-muted uppercase">
              {paused ? "Paused" : "Focus"}
            </span>
            <span
              className="font-mono text-display font-medium tabular-nums"
              role="timer"
              aria-live="off"
            >
              {seconds === null ? "--:--" : clock(seconds)}
            </span>
            <span className="text-small text-ink-muted">
              {left === null
                ? `${plannedMinutes} min planned`
                : left > 0
                  ? `${left} min left`
                  : "Planned time reached"}
            </span>
          </span>
        </ProgressRing>
      </div>

      {/* Thumb reach on a phone: pause beside finishing, stopping quietly below. */}
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-2">
        <div className="flex w-full items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            className="size-14 shrink-0 rounded-full md:size-14 [&_svg]:size-5"
            aria-label={paused ? "Resume" : "Pause"}
            disabled={disabled}
            onClick={toggle}
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="h-14 flex-1"
            disabled={disabled}
            onClick={() => finish(true)}
          >
            <Check aria-hidden /> Finish and mark done
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => finish(false)}
        >
          Stop for now
        </Button>
      </div>
    </div>
  );
}
