"use client";

import { Ban } from "lucide-react";
import { memo } from "react";

import { accepts, CANCELLED, type AnswerKey } from "@/lib/omr/key";
import { letters } from "@/lib/omr/marks";
import { cn } from "@/lib/utils/cn";

/** Questions per column, as on the answer sheet. */
const COLUMN = 25;

/**
 * The answer key, laid out like the answer sheet: tap an option to accept it (tap a
 * second one when the key accepts either), and the last button cancels the question.
 */
export function KeyGrid({
  answerKey,
  options,
  onToggle,
  onCancel,
}: {
  answerKey: AnswerKey;
  options: number;
  onToggle: (question: number, option: number) => void;
  onCancel: (question: number) => void;
}) {
  const columns = Array.from(
    { length: Math.ceil(answerKey.length / COLUMN) },
    (_, c) => c * COLUMN,
  );
  return (
    <div
      className={cn(
        "grid gap-3",
        options === 5
          ? "grid-cols-[repeat(auto-fill,minmax(296px,1fr))]"
          : "grid-cols-[repeat(auto-fill,minmax(252px,1fr))]",
      )}
    >
      {columns.map((start) => (
        <fieldset
          key={start}
          className="overflow-hidden rounded-control border border-border"
        >
          <legend className="sr-only">
            Questions {start + 1} to{" "}
            {Math.min(start + COLUMN, answerKey.length)}
          </legend>
          <ol className="divide-y divide-border">
            {answerKey.slice(start, start + COLUMN).map((entry, i) => (
              <KeyRow
                key={start + i}
                question={start + i}
                entry={entry}
                options={options}
                onToggle={onToggle}
                onCancel={onCancel}
              />
            ))}
          </ol>
        </fieldset>
      ))}
    </div>
  );
}

const KeyRow = memo(function KeyRow({
  question,
  entry,
  options,
  onToggle,
  onCancel,
}: {
  question: number;
  entry: number;
  options: number;
  onToggle: (question: number, option: number) => void;
  onCancel: (question: number) => void;
}) {
  const cancelled = entry === CANCELLED;
  const number = question + 1;
  return (
    <li
      className={cn(
        "flex h-11 items-center",
        Math.floor(question / 5) % 2 === 1 && "bg-surface-muted/60",
      )}
    >
      <span
        className={cn(
          "w-8 shrink-0 pr-1 text-right font-mono text-small tabular-nums",
          cancelled ? "text-ink-muted line-through" : "text-ink",
        )}
      >
        {number}
      </span>
      <span className="flex flex-1 justify-around">
        {letters(options).map((letter, option) => {
          const on = accepts(entry, option);
          return (
            <button
              key={letter}
              type="button"
              aria-pressed={on}
              aria-label={`Question ${number}, option ${letter} is right`}
              onClick={() => onToggle(question, option)}
              className="grid size-11 shrink-0 cursor-pointer place-items-center"
            >
              <span
                className={cn(
                  "grid h-6 w-8 place-items-center rounded-[9px] border text-small font-medium transition-colors duration-[120ms]",
                  on
                    ? "border-ink bg-ink text-bg"
                    : "border-border text-ink-muted hover:border-ink-subtle hover:text-ink",
                  cancelled && "opacity-50",
                )}
              >
                {letter}
              </span>
            </button>
          );
        })}
      </span>
      <button
        type="button"
        aria-pressed={cancelled}
        aria-label={`Question ${number} is cancelled`}
        onClick={() => onCancel(question)}
        className={cn(
          "grid size-11 shrink-0 cursor-pointer place-items-center rounded-control transition-colors duration-[120ms]",
          cancelled
            ? "text-ink"
            : "text-ink-subtle hover:bg-surface-muted hover:text-ink-muted",
        )}
      >
        <Ban className="size-4" aria-hidden />
      </button>
    </li>
  );
});
