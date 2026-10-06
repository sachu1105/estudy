"use client";

import { Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { toast } from "@/components/ui/toast";

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

  const percent =
    seconds === null
      ? 0
      : Math.min(100, (seconds / (plannedMinutes * 60)) * 100);

  return (
    <div className="flex flex-col items-center gap-8">
      <ProgressRing
        value={percent}
        size={240}
        strokeWidth={10}
        label="Time studied against the plan"
      >
        <span className="flex flex-col items-center">
          <span
            className="font-mono text-display font-medium tabular-nums"
            role="timer"
            aria-live="off"
          >
            {seconds === null ? "--:--" : clock(seconds)}
          </span>
          <span className="text-small text-ink-muted">
            {paused ? "Paused" : `of ${plannedMinutes} min`}
          </span>
        </span>
      </ProgressRing>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Button
          variant="primary"
          disabled={busy || seconds === null}
          onClick={() => finish(true)}
        >
          Finish and mark done
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={busy || seconds === null}
            onClick={toggle}
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="ghost"
            disabled={busy || seconds === null}
            onClick={() => finish(false)}
          >
            Stop for now
          </Button>
        </div>
      </div>
    </div>
  );
}
