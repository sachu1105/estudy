import { examKinds } from "@/lib/site";

import { Band } from "./frame";

// Kinds of exam as bold wordmarks, like a logo strip. Names only; real user numbers get
// added once they exist, never invented.
const marks = [...examKinds, "Any syllabus you bring"];
// Each half of the track must be wider than the widest screen.
const half = [...marks, ...marks, ...marks];

function Track({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0">
      {half.map((mark, i) => (
        <li
          key={`${mark}-${i}`}
          className="flex items-center border-r border-border px-8 py-6 font-heading text-[20px] leading-[1.4] font-semibold tracking-[-0.02em] whitespace-nowrap text-ink-muted/70 md:px-12 md:py-8 md:text-[24px] dark:text-ink/80"
        >
          {mark}
        </li>
      ))}
    </ul>
  );
}

/**
 * The sheet's first band: a label cell, then the kinds of exam it works for drifting past
 * in ruled cells. Pauses on hover; still for reduced motion. Screen readers get the list
 * once.
 */
export function ExamStrip() {
  return (
    <Band
      first
      aria-label="Works for any competitive exam"
      inner="flex flex-col md:flex-row"
    >
      <p className="border-b border-border px-4 py-4 font-mono text-small tracking-[0.06em] text-ink-muted uppercase md:flex md:w-60 md:shrink-0 md:items-center md:border-r md:border-b-0 md:px-8">
        For every competitive exam
      </p>
      <div className="group flex min-w-0 flex-1 overflow-hidden mask-[linear-gradient(90deg,black_80%,transparent)]">
        <div
          className="flex w-max group-hover:[animation-play-state:paused] motion-safe:animate-marquee"
          style={{ animationDuration: "90s" }}
        >
          <Track />
          <Track hidden />
        </div>
      </div>
    </Band>
  );
}
