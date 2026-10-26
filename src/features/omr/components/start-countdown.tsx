"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const STEPS = ["3", "2", "1", "Begin"] as const;
const STEP_MS = 750;

/** "3, 2, 1, Begin" over the whole screen, then the clock starts. Skippable. */
export function StartCountdown({
  title,
  onDone,
}: {
  title: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const last = step + 1 === STEPS.length;
    const next = setTimeout(
      () => (last ? done.current() : setStep(step + 1)),
      last ? STEP_MS / 2 : STEP_MS,
    );
    return () => clearTimeout(next);
  }, [step]);

  const word = STEPS[step];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Exam starting"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-bg/95 px-4 backdrop-blur-sm"
    >
      <p className="max-w-full truncate text-small text-ink-muted">{title}</p>
      <div className="grid size-44 animate-pulse-ring place-items-center rounded-full border-2 border-accent">
        <span
          key={word}
          aria-live="assertive"
          className="animate-count-in font-heading text-[64px] leading-none font-semibold tabular-nums"
        >
          {word}
        </span>
      </div>
      <p className="text-body text-ink-muted">
        {word === "Begin"
          ? "Good luck."
          : "Get ready. The clock starts after 1."}
      </p>
      <Button variant="ghost" onClick={onDone}>
        Start now
      </Button>
    </div>
  );
}
