"use client";

import { ChevronRight, Eraser, KeyRound, Timer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { letters } from "@/lib/omr/marks";
import { describeMarking } from "@/lib/omr/marking";
import { cn } from "@/lib/utils/cn";

import { ExamTime } from "./exam-time";
import type { ExamSitting, PaperSummary } from "./paper-summary";

import { ExamRules } from "./exam-rules";
import { LimitPicker, short } from "./limit-picker";

/**
 * The moment before the paper: how long it gets (the one decision, shown large with when
 * it would end), the hall's rules at a glance, and one button that breathes until it's
 * pressed. Used to start the timer.
 */
export function ExamStart({
  paper,
  exam,
  note,
  final,
  previous,
  pending,
  onStart,
}: {
  paper: PaperSummary;
  /** A squad exam: the time is the paper's, and there's one sitting. */
  exam: ExamSitting | null;
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
  const [limit, setLimit] = useState<number | null | undefined>(paper.limitMin);
  const { questions, options } = paper.shape;
  const optionLetters = letters(options);
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
        {paper.title.replaceAll("_", " ")} · {questions} questions ·{" "}
        {optionLetters[0]}–{optionLetters.at(-1)} ·{" "}
        {describeMarking(paper.marking)}
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

      {exam ? (
        <ExamTime limitMin={paper.limitMin} closesAt={exam.closesAt} />
      ) : (
        <LimitPicker initial={paper.limitMin} onChange={setLimit} />
      )}

      <ExamRules final={final} exam={exam !== null} />

      {paper.owner ? (
        <Link
          href={`/omr/${paper.id}/key`}
          className="-my-2 flex min-h-11 items-center gap-3 rounded-control px-1 text-small text-ink-muted hover:text-ink"
        >
          <KeyRound className="size-4 shrink-0" aria-hidden />
          <span className="flex-1">
            {paper.keyed === 0
              ? "No answer key yet"
              : paper.keyed < questions
                ? `Key: ${paper.keyed} of ${questions}`
                : "Answer key added"}
          </span>
          <span className="font-medium text-accent-ink">Key and marking</span>
          <ChevronRight className="size-4 shrink-0" aria-hidden />
        </Link>
      ) : null}

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
