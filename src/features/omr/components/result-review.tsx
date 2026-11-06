"use client";

import {
  Ban,
  Check,
  CircleHelp,
  Minus,
  X,
  type LucideIcon,
} from "lucide-react";
import { memo, useState } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { accepts, describeEntry, type AnswerKey } from "@/lib/omr/key";
import { BLANK, letters, OPTION_LETTERS, type Marks } from "@/lib/omr/marks";
import type { Outcome } from "@/lib/omr/score";
import { cn } from "@/lib/utils/cn";

type Filter = "all" | "wrong" | "blank" | "right";

const STATUS: Record<
  Outcome,
  { icon: LucideIcon; text: string; tone: string }
> = {
  right: { icon: Check, text: "Right", tone: "text-success" },
  wrong: { icon: X, text: "Wrong", tone: "text-danger" },
  blank: { icon: Minus, text: "Left blank", tone: "text-ink-muted" },
  cancelled: { icon: Ban, text: "Cancelled", tone: "text-ink-muted" },
  unkeyed: { icon: CircleHelp, text: "No key yet", tone: "text-ink-muted" },
};

/**
 * Every answer beside the key: what you marked is filled, as in pen, and the key's answer
 * is outlined in green. A tick or a cross at the end says which, never colour alone. The
 * filter narrows it to the ones that went wrong, were left, or went right.
 */
export function ResultReview({
  marks,
  answerKey,
  outcomes,
  options,
}: {
  marks: Marks;
  answerKey: AnswerKey;
  outcomes: Outcome[];
  options: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const count = (o: Outcome) => outcomes.filter((x) => x === o).length;
  const shown = outcomes
    .map((outcome, question) => ({ outcome, question }))
    .filter(({ outcome }) => filter === "all" || outcome === filter);

  return (
    <section aria-labelledby="answers" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="answers" className="font-heading text-h2 font-semibold">
          Answers
        </h2>
        <SegmentedControl
          size="sm"
          ariaLabel="Show answers"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "wrong", label: `Wrong ${count("wrong")}` },
            { value: "blank", label: `Blank ${count("blank")}` },
            { value: "right", label: `Right ${count("right")}` },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-6 text-center text-small text-ink-muted">
          None here.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(252px,1fr))] gap-x-4 overflow-hidden rounded-card border border-border bg-surface px-3">
          {shown.map(({ outcome, question }) => (
            <ReviewRow
              key={question}
              question={question}
              mark={marks[question] ?? BLANK}
              entry={answerKey[question] ?? 0}
              outcome={outcome}
              options={options}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

const ReviewRow = memo(function ReviewRow({
  question,
  mark,
  entry,
  outcome,
  options,
}: {
  question: number;
  mark: number;
  entry: number;
  outcome: Outcome;
  options: number;
}) {
  const status = STATUS[outcome];
  const Icon = status.icon;
  const said =
    mark === BLANK ? "nothing marked" : `you marked ${OPTION_LETTERS[mark]}`;
  return (
    <li className="-mb-px flex h-11 items-center gap-1 border-b border-border">
      <span className="sr-only">
        Question {question + 1}: {said}, key {describeEntry(entry)}.{" "}
        {status.text}.
      </span>
      <span
        aria-hidden
        className="w-8 shrink-0 pr-1 text-right font-mono text-small tabular-nums"
      >
        {question + 1}
      </span>
      <span aria-hidden className="flex flex-1 justify-around">
        {letters(options).map((letter, option) => {
          const key = accepts(entry, option);
          const yours = mark === option;
          return (
            <span
              key={letter}
              className={cn(
                "grid h-6 w-8 place-items-center rounded-[9px] border text-small font-medium",
                yours
                  ? "border-ink bg-ink text-bg"
                  : key
                    ? "border-success bg-success-soft text-success-ink"
                    : "border-border text-ink-muted",
                yours &&
                  key &&
                  "ring-2 ring-success ring-offset-1 ring-offset-surface",
              )}
            >
              {letter}
            </span>
          );
        })}
      </span>
      <Icon aria-hidden className={cn("mx-2 size-4 shrink-0", status.tone)} />
    </li>
  );
});
