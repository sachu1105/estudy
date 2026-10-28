import { Timer } from "lucide-react";

import { cn } from "@/lib/utils/cn";

// Sample content, not data. A question paper on the desk and the OMR sheet laid over it,
// running off the cell's corner, with the exam clock above. The bubbles copy the app's
// own sheet (features/omr/components/omr-grid.tsx).

const sheet = [
  [21, 2],
  [22, 0],
  [23, 1],
  [24, 3],
  [25, -1],
  [26, 1],
  [27, -1],
  [28, 0],
] as const;

export function PaperScene() {
  return (
    <>
      <div className="absolute top-6 left-4 w-60 -rotate-3 rounded-card border border-border bg-surface p-4 shadow-md sm:left-8 lg:left-12">
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

      <div className="absolute top-20 left-[38%] w-72 rotate-2 rounded-tl-card border-t border-l border-border bg-surface shadow-lg">
        <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
          <p className="font-heading text-small font-medium text-ink">
            Answer sheet
          </p>
          <p className="text-micro text-ink-muted uppercase">21–40</p>
        </div>
        <ol className="px-2 py-2">
          {sheet.map(([n, mark]) => (
            <li
              key={n}
              className={cn(
                "flex items-center gap-1.5 rounded-chip px-1 py-1",
                n > 25 && "bg-surface-muted/60",
              )}
            >
              <span className="w-7 shrink-0 text-right font-mono text-small text-ink-muted tabular-nums">
                {n}
              </span>
              {["A", "B", "C", "D"].map((letter, i) => (
                <span
                  key={letter}
                  className={cn(
                    "grid size-7 place-items-center rounded-full border text-small font-medium",
                    i === mark
                      ? "border-accent bg-accent text-on-accent"
                      : "border-ink-subtle text-ink-muted",
                  )}
                >
                  {letter}
                </span>
              ))}
            </li>
          ))}
        </ol>
      </div>

      <span className="absolute top-2 right-4 z-10 flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 font-mono text-small font-medium text-bg tabular-nums sm:right-8">
        <Timer className="size-4" /> 01:24:07
      </span>
    </>
  );
}
