"use client";

import { CircleDot, RotateCcw, Save, Timer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { OMR_OPTIONS, OMR_QUESTIONS } from "@/lib/omr/marks";
import {
  DEFAULT_LIMIT_MIN,
  LIMIT_CHOICES_MIN,
  MAX_LIMIT_MIN,
} from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

const RULES = [
  [Timer, "The clock runs until time's up. No pause, as in the hall."],
  [CircleDot, "Tap a bubble to mark it, tap it again to clear it."],
  [Save, "Every mark saves as you go, even if you leave."],
  [RotateCcw, "A reset starts the clock over. Your marks stay."],
] as const;

const short = (min: number) =>
  min % 60 === 0 ? `${min / 60} h` : `${min} min`;

/**
 * The moment before the paper: what it is, how long it gets, the hall's rules, and one
 * button that breathes until it's pressed. Used to start the timer.
 */
export function ExamStart({
  title,
  prompted,
  pending,
  onStart,
}: {
  title: string;
  /** A bubble was tapped before the clock ran. */
  prompted: boolean;
  pending: boolean;
  onStart: (limitMin: number | null) => void;
}) {
  const [choice, setChoice] = useState<number | null | "custom">(
    DEFAULT_LIMIT_MIN,
  );
  const [custom, setCustom] = useState("");
  const typed = Number(custom);
  const customOk =
    Number.isInteger(typed) && typed >= 1 && typed <= MAX_LIMIT_MIN;
  const limit = choice === "custom" ? (customOk ? typed : undefined) : choice;
  const tiles = [
    [String(OMR_QUESTIONS), "questions"],
    [
      limit === null ? "∞" : limit === undefined ? "–" : String(limit),
      "minutes",
    ],
    [`${OMR_OPTIONS[0]}–${OMR_OPTIONS.at(-1)}`, "options"],
  ];

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (limit !== undefined) onStart(limit);
      }}
    >
      <p className="-mt-2 truncate text-small text-ink-muted">{title}</p>
      {prompted ? (
        <p className="flex items-center gap-2 rounded-control bg-surface-muted px-3 py-2 text-small">
          <Timer className="size-4 shrink-0 text-ink-muted" aria-hidden />
          Start the clock to mark your first answer, as in the exam.
        </p>
      ) : null}

      <dl className="grid grid-cols-3 gap-2">
        {tiles.map(([value, name]) => (
          <div
            key={name}
            className="flex flex-col items-center gap-1 rounded-card border border-border px-2 py-3"
          >
            <dd className="font-heading text-h2 font-semibold tabular-nums">
              {value}
            </dd>
            <dt className="text-micro text-ink-muted uppercase">{name}</dt>
          </div>
        ))}
      </dl>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium">How long?</legend>
        <div
          role="group"
          aria-label="Time limit"
          className="flex flex-wrap gap-2"
        >
          {[...LIMIT_CHOICES_MIN, null, "custom" as const].map((min) => (
            <Chip
              key={String(min)}
              selected={choice === min}
              onClick={() => setChoice(min)}
              className="h-11 px-4 md:h-10"
            >
              {min === null
                ? "No limit"
                : min === "custom"
                  ? "Custom"
                  : short(min)}
            </Chip>
          ))}
        </div>
        {choice === "custom" ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label="Minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_LIMIT_MIN}
              autoFocus
              placeholder="45"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-body text-ink-muted">minutes</span>
            {custom !== "" && !customOk ? (
              <span className="text-small text-danger-ink">
                1 to {MAX_LIMIT_MIN}
              </span>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <ul className="flex flex-col gap-2.5">
        {RULES.map(([Icon, text]) => (
          <li
            key={text}
            className="flex items-start gap-3 text-small text-ink-muted"
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {text}
          </li>
        ))}
      </ul>

      <span className="relative flex">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-control",
            limit !== undefined && !pending && "animate-pulse-ring",
          )}
        />
        <Button
          type="submit"
          data-autofocus
          variant="primary"
          size="lg"
          className="relative w-full"
          disabled={pending || limit === undefined}
        >
          <Timer aria-hidden /> Start exam
        </Button>
      </span>
    </form>
  );
}
