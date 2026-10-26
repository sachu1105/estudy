"use client";

import { memo } from "react";

import { OMR_OPTIONS, type Marks } from "@/lib/omr/marks";
import { cn } from "@/lib/utils/cn";

const BLOCK = 20;

/**
 * The answer sheet: 100 questions in blocks of 20, four bubbles each, like the printed
 * OMR sheet. Tapping a bubble fills it; tapping it again rubs it out.
 */
export function OmrGrid({
  marks,
  onMark,
}: {
  marks: Marks;
  onMark: (question: number, option: number) => void;
}) {
  const blocks = Array.from(
    { length: Math.ceil(marks.length / BLOCK) },
    (_, b) => b * BLOCK,
  );
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-3 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
      {blocks.map((start) => (
        <fieldset
          key={start}
          className="rounded-card border border-border bg-surface px-2 py-2"
        >
          <legend className="float-left mb-1 w-full px-2 pt-1 text-micro text-ink-muted uppercase">
            {start + 1}–{Math.min(start + BLOCK, marks.length)}
          </legend>
          <ol className="clear-both">
            {marks.slice(start, start + BLOCK).map((mark, i) => (
              <OmrRow
                key={start + i}
                question={start + i}
                mark={mark}
                onMark={onMark}
              />
            ))}
          </ol>
        </fieldset>
      ))}
    </div>
  );
}

const OmrRow = memo(function OmrRow({
  question,
  mark,
  onMark,
}: {
  question: number;
  mark: number;
  onMark: (question: number, option: number) => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-1 rounded-chip px-1",
        // A light band every fifth row, as on the printed sheet, so the eye keeps its place.
        Math.floor(question / 5) % 2 === 1 && "bg-surface-muted/60",
      )}
    >
      <span className="w-8 shrink-0 text-right font-mono text-small text-ink-muted tabular-nums">
        {question + 1}
      </span>
      {OMR_OPTIONS.map((letter, option) => {
        const on = mark === option;
        return (
          <button
            key={letter}
            type="button"
            aria-pressed={on}
            aria-label={`Question ${question + 1}, option ${letter}`}
            onClick={() => onMark(question, option)}
            className="group grid size-11 shrink-0 cursor-pointer place-items-center rounded-full md:size-9"
          >
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full border text-small font-medium transition-colors duration-[120ms]",
                on
                  ? "border-accent bg-accent text-on-accent"
                  : "border-ink-subtle text-ink-muted group-hover:border-accent group-hover:text-accent-ink",
              )}
            >
              {letter}
            </span>
          </button>
        );
      })}
    </li>
  );
});
