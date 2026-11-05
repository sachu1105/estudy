"use client";

import { memo } from "react";

import { OMR_OPTIONS, type Marks } from "@/lib/omr/marks";
import { cn } from "@/lib/utils/cn";

import type { SheetInk } from "./sheet-ink";

const BLOCK = 20;

/**
 * The answer sheet: 100 questions in blocks of 20, four bubbles each, printed like a real
 * OMR sheet in the paper's own ink (a header band per block, a band every five rows,
 * timing marks down the edge). Tapping a bubble fills it in pen; tapping it again rubs
 * it out.
 */
export function OmrGrid({
  marks,
  ink,
  onMark,
}: {
  marks: Marks;
  ink: SheetInk;
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
          className="overflow-hidden rounded-card border border-border bg-surface"
        >
          <legend
            className={cn(
              "float-left flex w-full items-center justify-between px-3 py-1.5 text-micro uppercase",
              ink.band,
              ink.text,
            )}
          >
            <span>Questions</span>
            <span className="font-mono">
              {start + 1}–{Math.min(start + BLOCK, marks.length)}
            </span>
          </legend>
          <ol className="clear-both px-2 py-2">
            {marks.slice(start, start + BLOCK).map((mark, i) => (
              <OmrRow
                key={start + i}
                question={start + i}
                mark={mark}
                ink={ink}
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
  ink,
  onMark,
}: {
  question: number;
  mark: number;
  ink: SheetInk;
  onMark: (question: number, option: number) => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-1 rounded-chip px-1",
        // A light band every fifth row, as on the printed sheet, so the eye keeps its place.
        Math.floor(question / 5) % 2 === 1 && ink.stripe,
      )}
    >
      <span
        className={cn(
          "w-8 shrink-0 text-right font-mono text-small tabular-nums",
          ink.text,
        )}
      >
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
                // Filled in pen, as on paper; empty ones are printed in the sheet's ink.
                on
                  ? "border-ink bg-ink text-bg"
                  : cn("bg-surface", ink.line, ink.text, ink.hover),
              )}
            >
              {letter}
            </span>
          </button>
        );
      })}
      {/* The timing mark a scanner reads down the edge of a printed sheet. */}
      <span
        aria-hidden
        className="ml-auto h-2 w-3 shrink-0 rounded-[1px] bg-ink/70"
      />
    </li>
  );
});
