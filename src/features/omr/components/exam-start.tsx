"use client";

import { Eraser, Timer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { OMR_OPTIONS, OMR_QUESTIONS } from "@/lib/omr/marks";
import { DEFAULT_LIMIT_MIN } from "@/lib/omr/timer";
import { cn } from "@/lib/utils/cn";

import { ExamRules } from "./exam-rules";
import { LimitPicker, short } from "./limit-picker";

/**
 * The moment before the paper: how long it gets (the one decision, shown large with when
 * it would end), the hall's rules at a glance, and one button that breathes until it's
 * pressed. Used to start the timer.
 */
export function ExamStart({
  title,
  note,
  final,
  previous,
  pending,
  onStart,
}: {
  title: string;
  /** Why the card is up, when it isn't the paper simply opening. */
  note: string | null;
  /** Marks can't be taken back (the sheet setting). */
  final: boolean;
  /** Answers left from an earlier sitting; starting clears them. */
  previous: number;
  pending: boolean;
  onStart: (limitMin: number | null) => void;
}) {
  // Minutes, null for no limit, undefined while a custom time isn't valid yet.
  const [limit, setLimit] = useState<number | null | undefined>(
    DEFAULT_LIMIT_MIN,
  );
  const notes = [
    note ? { icon: Timer, text: note } : null,
    previous > 0
      ? {
          icon: Eraser,
          text: `Starting clears the ${previous} answer${previous === 1 ? "" : "s"} from your last sitting, for a clean sheet.`,
        }
      : null,
  ].filter((n) => n !== null);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (limit !== undefined) onStart(limit);
      }}
    >
      <p className="-mt-2 truncate text-small text-ink-muted">
        {title.replaceAll("_", " ")} · {OMR_QUESTIONS} questions ·{" "}
        {OMR_OPTIONS[0]}–{OMR_OPTIONS.at(-1)}
      </p>
      {notes.map(({ icon: Icon, text }) => (
        <p
          key={text}
          className="-mt-2 flex items-start gap-2 rounded-control bg-surface-muted px-3 py-2 text-small"
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
          {text}
        </p>
      ))}

      <LimitPicker onChange={setLimit} />

      <ExamRules final={final} />

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
          {limit !== undefined ? (
            <span className="font-normal opacity-80">
              · {limit === null ? "no limit" : short(limit)}
            </span>
          ) : null}
        </Button>
      </span>
    </form>
  );
}
