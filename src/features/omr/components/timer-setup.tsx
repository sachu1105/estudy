"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import {
  DEFAULT_LIMIT_MIN,
  LIMIT_CHOICES_MIN,
  MAX_LIMIT_MIN,
} from "@/lib/omr/timer";

const label = (min: number) =>
  min % 60 === 0 ? `${min / 60} h` : `${min} min`;

/** Choose how long the paper gets (75 minutes to start with), or no limit. */
export function TimerSetup({
  pending,
  onStart,
}: {
  pending: boolean;
  onStart: (limitMin: number | null) => void;
}) {
  const [choice, setChoice] = useState<number | null>(DEFAULT_LIMIT_MIN);
  const [custom, setCustom] = useState("");
  const typed = Number(custom);
  const customOk =
    custom !== "" &&
    Number.isInteger(typed) &&
    typed >= 1 &&
    typed <= MAX_LIMIT_MIN;
  const limit = custom !== "" ? (customOk ? typed : undefined) : choice;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (limit !== undefined) onStart(limit);
      }}
    >
      <div
        role="group"
        aria-label="Time limit"
        className="flex flex-wrap gap-2"
      >
        {LIMIT_CHOICES_MIN.map((min) => (
          <Chip
            key={min}
            selected={custom === "" && choice === min}
            onClick={() => {
              setChoice(min);
              setCustom("");
            }}
          >
            {label(min)}
          </Chip>
        ))}
        <Chip
          selected={custom === "" && choice === null}
          onClick={() => {
            setChoice(null);
            setCustom("");
          }}
        >
          No limit
        </Chip>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="timer-minutes">Or your own, in minutes</Label>
        <Input
          id="timer-minutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_LIMIT_MIN}
          placeholder="For example 45"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="max-w-40"
        />
        {custom !== "" && !customOk ? (
          <p className="text-small text-danger-ink">
            Enter whole minutes from 1 to {MAX_LIMIT_MIN}.
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending || limit === undefined}
      >
        Start timer
      </Button>
    </form>
  );
}
