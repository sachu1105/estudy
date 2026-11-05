"use client";

import { useRef } from "react";

import { PAPER_MIN, SHEET_MAX, SHEET_MIN } from "./use-sheet-width";

const STEP = 40;

/**
 * The line between the paper and the answer sheet: drag it to give the sheet more room
 * or less, or focus it and use the arrow keys. A plain line that lights up, no grip.
 */
export function SheetDivider({
  width,
  onResize,
  onCommit,
}: {
  /** The sheet's width now, or null for the layout's default. */
  width: number | null;
  onResize: (width: number) => void;
  onCommit: (width: number) => void;
}) {
  const dragging = useRef(false);
  // The sheet sits right of the divider: its width runs from the pointer to the right edge.
  const measure = (divider: HTMLElement, clientX?: number) => {
    const box = divider.parentElement!.getBoundingClientRect();
    const sheet = divider.nextElementSibling as HTMLElement | null;
    const current = width ?? sheet?.getBoundingClientRect().width ?? SHEET_MIN;
    const max = Math.max(SHEET_MIN, Math.min(SHEET_MAX, box.width - PAPER_MIN));
    const clamp = (w: number) => Math.min(max, Math.max(SHEET_MIN, w));
    const at = clientX === undefined ? current : box.right - clientX;
    return { current, clamp, at };
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the answer sheet"
      aria-valuemin={SHEET_MIN}
      aria-valuemax={SHEET_MAX}
      aria-valuenow={width === null ? undefined : Math.round(width)}
      tabIndex={0}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const { clamp, at } = measure(e.currentTarget, e.clientX);
        onResize(clamp(at));
      }}
      onPointerUp={(e) => {
        if (!dragging.current) return;
        dragging.current = false;
        const { clamp, at } = measure(e.currentTarget, e.clientX);
        onCommit(clamp(at));
      }}
      onKeyDown={(e) => {
        const step =
          e.key === "ArrowLeft" ? STEP : e.key === "ArrowRight" ? -STEP : 0;
        if (!step) return;
        e.preventDefault();
        const { current, clamp } = measure(e.currentTarget);
        onCommit(clamp(current + step));
      }}
      className="group relative hidden w-2 shrink-0 cursor-col-resize touch-none justify-center focus-visible:outline-none md:flex"
    >
      <span
        aria-hidden
        className="h-full w-px bg-border transition-[width,background-color] duration-[120ms] group-hover:w-0.5 group-hover:bg-accent group-focus-visible:w-0.5 group-focus-visible:bg-accent group-active:w-0.5 group-active:bg-accent"
      />
    </div>
  );
}
