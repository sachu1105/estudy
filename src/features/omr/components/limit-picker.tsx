"use client";

import { useState } from "react";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_LIMIT_MIN,
  LIMIT_CHOICES_MIN,
  MAX_LIMIT_MIN,
} from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

export const short = (min: number) =>
  min % 60 === 0 ? `${min / 60} h` : `${min} min`;

/** "4:35 pm": when a sitting started now would end. */
const endsAt = (min: number) =>
  new Date(Date.now() + min * 60_000).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

type Choice = number | null | "custom";

/**
 * How long the paper gets: the choice shown large with when it would end, the usual
 * lengths as an even grid, and a custom number. Reports minutes, null for no limit, or
 * undefined while a custom time isn't valid.
 */
export function LimitPicker({
  onChange,
}: {
  onChange: (limit: number | null | undefined) => void;
}) {
  const [choice, setChoice] = useState<Choice>(DEFAULT_LIMIT_MIN);
  const [custom, setCustom] = useState("");
  const valid = (text: string) => {
    const typed = Number(text);
    return Number.isInteger(typed) && typed >= 1 && typed <= MAX_LIMIT_MIN
      ? typed
      : undefined;
  };
  const limit = choice === "custom" ? valid(custom) : choice;
  const pick = (next: Choice) => {
    setChoice(next);
    onChange(next === "custom" ? valid(custom) : next);
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">How long?</legend>
      {/* The choice, large: the one number that matters before the paper. */}
      <div aria-live="polite" className="flex flex-col items-center py-1">
        <span className="font-heading text-display font-semibold tabular-nums">
          {limit === null
            ? "No limit"
            : limit === undefined
              ? "–"
              : short(limit)}
        </span>
        {/* The end time is the moment it's drawn; the browser's is the one kept. */}
        <span className="text-small text-ink-muted" suppressHydrationWarning>
          {limit === null
            ? "The clock counts up"
            : limit === undefined
              ? `Type 1 to ${MAX_LIMIT_MIN} minutes`
              : `Ends at ${endsAt(limit)}`}
        </span>
      </div>
      <div
        role="group"
        aria-label="Time limit"
        className="grid grid-cols-4 gap-2"
      >
        {[...LIMIT_CHOICES_MIN, null, "custom" as const].map((min) => (
          <Chip
            key={String(min)}
            selected={choice === min}
            onClick={() => pick(min)}
            className={cn(
              "h-11 w-full justify-center px-2 md:h-10",
              min === "custom" && "col-span-2",
            )}
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
            onChange={(e) => {
              setCustom(e.target.value);
              onChange(valid(e.target.value));
            }}
            className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-body text-ink-muted">minutes</span>
        </div>
      ) : null}
    </fieldset>
  );
}
