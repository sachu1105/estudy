"use client";

import { memo } from "react";

import { letters, type Marks } from "@/lib/omr/marks";
import { cn } from "@/lib/utils/cn";

import type { SheetInk } from "./sheet-ink";
import type { Pen } from "./use-omr-prefs";

/** A filled bubble, in the chosen pen. */
const PEN: Record<Pen, string> = {
  black: "border-ink bg-ink text-bg",
  blue: "border-pen-blue bg-pen-blue text-bg",
};

/** Questions per printed column, as on a real sheet: four columns of 25. */
const COLUMN = 25;
/** The bars that make a barcode at the foot of the sheet (widths in px). */
const BARCODE = [1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1];

/**
 * The answer sheet, printed like a real OMR sheet in the paper's own ink: four ruled
 * columns of 25, every five rows shaded in a checkerboard, a ladder of timing marks down
 * the right edge and a barcode at the foot. Tapping a bubble fills it in pen; tapping it
 * again rubs it out.
 */
export function OmrGrid({
  marks,
  options,
  ink,
  pen,
  onMark,
}: {
  marks: Marks;
  /** Options per question: 4 is A-D. */
  options: number;
  ink: SheetInk;
  /** The colour a mark is filled in. */
  pen: Pen;
  onMark: (question: number, option: number) => void;
}) {
  const columns = Array.from(
    { length: Math.ceil(marks.length / COLUMN) },
    (_, c) => c * COLUMN,
  );
  return (
    // Paper is white in any theme: the sheet takes the light tokens, whatever the app's.
    <div
      data-theme="light"
      className="overflow-hidden rounded-[6px] border border-border bg-surface text-ink [color-scheme:light] shadow-sm [--row:44px] md:[--row:36px]"
    >
      <p
        aria-hidden
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-3 px-3 py-1.5 text-micro uppercase",
          ink.band,
          ink.text,
        )}
      >
        <span>Answer sheet</span>
        <span>Darken the bubble completely</span>
      </p>
      <div className="flex gap-2 p-3">
        {/* Columns stack a row's height apart, so the timing marks stay in step. */}
        {/* As many whole columns as fit, stretched evenly across the width (auto-fit: no
            empty tracks once all four are out). A column is never narrower than its row
            (number + four bubbles + rules), so nothing is cut at any width. */}
        <div
          className={cn(
            "grid min-w-0 flex-1 gap-x-3 gap-y-11 md:gap-y-9",
            options === 5
              ? "grid-cols-[repeat(auto-fit,minmax(260px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
              : "grid-cols-[repeat(auto-fit,minmax(216px,1fr))] md:grid-cols-[repeat(auto-fit,minmax(184px,1fr))]",
          )}
        >
          {columns.map((start, c) => (
            <fieldset key={start} className={cn("border", ink.line)}>
              <legend className="sr-only">
                Questions {start + 1} to{" "}
                {Math.min(start + COLUMN, marks.length)}
              </legend>
              <ol>
                {marks.slice(start, start + COLUMN).map((mark, i) => (
                  <OmrRow
                    key={start + i}
                    question={start + i}
                    mark={mark}
                    options={options}
                    ink={ink}
                    pen={pen}
                    // Five-row blocks shaded in a checkerboard across the columns.
                    shaded={(Math.floor(i / 5) + c) % 2 === 1}
                    onMark={onMark}
                  />
                ))}
              </ol>
            </fieldset>
          ))}
        </div>
        {/* The timing marks a scanner reads down the edge of a printed sheet. */}
        <span
          aria-hidden
          className="w-3 shrink-0"
          // One mark centred in every row's height; the offset is part of the stripe
          // itself, so nothing wraps in at the top.
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0 calc((var(--row) - 6px) / 2), color-mix(in oklab, var(--ink) 80%, transparent) calc((var(--row) - 6px) / 2) calc((var(--row) + 6px) / 2), transparent calc((var(--row) + 6px) / 2) var(--row))",
          }}
        />
      </div>
      <span aria-hidden className="flex h-7 items-stretch gap-[2px] px-3 pb-3">
        {BARCODE.map((width, i) => (
          <span key={i} className="bg-ink" style={{ width }} />
        ))}
      </span>
    </div>
  );
}

const OmrRow = memo(function OmrRow({
  question,
  mark,
  options,
  ink,
  pen,
  shaded,
  onMark,
}: {
  question: number;
  mark: number;
  options: number;
  ink: SheetInk;
  pen: Pen;
  shaded: boolean;
  onMark: (question: number, option: number) => void;
}) {
  return (
    <li className={cn("flex h-11 items-stretch md:h-9", shaded && ink.band)}>
      <span
        className={cn(
          "flex w-9 shrink-0 items-center justify-end border-r pr-1.5 font-mono text-small tabular-nums",
          ink.line,
          ink.text,
        )}
      >
        {question + 1}
      </span>
      <span className="flex flex-1 items-center justify-around">
        {letters(options).map((letter, option) => {
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
                  // A wide, softly squared oval, as printed on a real sheet.
                  "grid h-6 w-8 place-items-center rounded-[9px] border text-small font-medium transition-colors duration-[120ms] md:h-[22px] md:w-[30px] md:rounded-[8px]",
                  // Filled in pen, as on paper; empty ones are printed in the sheet's ink.
                  on ? PEN[pen] : cn(ink.line, ink.text, ink.hover),
                )}
              >
                {letter}
              </span>
            </button>
          );
        })}
      </span>
    </li>
  );
});
