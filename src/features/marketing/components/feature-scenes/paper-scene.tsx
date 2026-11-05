import { Download, Timer } from "lucide-react";

import { cn } from "@/lib/utils/cn";

// Sample content, not data. A question paper on the desk and the OMR answer sheet laid
// over it, running off the cell's corner, with the exam clock above and the sheet's PDF
// below. Both are paper, so white in any theme. The sheet copies the app's own
// (features/omr/components/omr-grid.tsx): printed in teal ink, oval bubbles, five-row
// blocks shaded, timing marks down the edge, answers filled in blue pen.

const sheet = [
  [21, 2],
  [22, 0],
  [23, 1],
  [24, 3],
  [25, -1],
  [26, 1],
  [27, 0],
  [28, -1],
] as const;

export function PaperScene() {
  return (
    <>
      <div
        data-theme="light"
        className="absolute top-6 left-4 w-60 -rotate-3 rounded-[6px] border border-border bg-surface p-4 [color-scheme:light] shadow-md sm:left-8 lg:left-12"
      >
        <p className="text-micro text-ink-muted uppercase">
          General studies · Paper 1
        </p>
        <p className="mt-3 text-small text-ink">
          <span className="font-mono text-ink-muted">23.</span> The right to
          education is a fundamental right under which article?
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-small text-ink-muted">
          <li>(A) 19</li>
          <li>(B) 21A</li>
          <li>(C) 32</li>
          <li>(D) 45</li>
        </ul>
        <div className="mt-4 flex flex-col gap-2">
          <span className="h-2 w-full rounded-full bg-surface-muted" />
          <span className="h-2 w-4/5 rounded-full bg-surface-muted" />
          <span className="h-2 w-3/5 rounded-full bg-surface-muted" />
        </div>
      </div>

      <div
        data-theme="light"
        className="absolute top-20 left-[38%] w-72 rotate-2 overflow-hidden rounded-tl-[6px] border-t border-l border-border bg-surface text-ink [color-scheme:light] shadow-lg"
      >
        <p className="flex justify-between bg-tint-teal/15 px-3 py-1.5 text-micro text-tint-teal uppercase">
          <span>Answer sheet</span>
          <span>21–40</span>
        </p>
        <div className="flex gap-2 p-3 pr-0">
          <ol className="flex-1 border border-tint-teal/60">
            {sheet.map(([n, mark]) => (
              <li
                key={n}
                className={cn(
                  "flex h-9 items-stretch",
                  n > 25 && "bg-tint-teal/15",
                )}
              >
                <span className="flex w-9 shrink-0 items-center justify-end border-r border-tint-teal/60 pr-1.5 font-mono text-small text-tint-teal tabular-nums">
                  {n}
                </span>
                <span className="flex flex-1 items-center justify-around">
                  {["A", "B", "C", "D"].map((letter, i) => (
                    <span
                      key={letter}
                      className={cn(
                        "grid h-[22px] w-[30px] place-items-center rounded-[8px] border text-small font-medium",
                        i === mark
                          ? "border-pen-blue bg-pen-blue text-bg"
                          : "border-tint-teal/60 text-tint-teal",
                      )}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
          {/* Timing marks, one beside every row. */}
          <span className="flex w-3 shrink-0 flex-col">
            {sheet.map(([n]) => (
              <span key={n} className="grid h-9 items-center">
                <span className="h-1.5 bg-ink/80" />
              </span>
            ))}
          </span>
        </div>
      </div>

      <span className="absolute top-2 right-4 z-10 flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 font-mono text-small font-medium text-bg tabular-nums sm:right-8">
        <Timer className="size-4" /> 01:24:07
      </span>
      <span className="absolute bottom-8 left-6 z-10 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-small font-medium text-ink shadow-md sm:left-10 lg:left-14">
        <Download className="size-4 text-ink-muted" /> Answer sheet.pdf
      </span>
    </>
  );
}
