import { examKinds } from "@/lib/site";

// Kinds of exam as bold wordmarks, like a logo strip. Names only; real user numbers get
// added once they exist, never invented.
const marks = [...examKinds, "Any syllabus you bring"];
// Each half of the track must be wider than the widest screen.
const half = [...marks, ...marks, ...marks];

function Track({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-12 pr-12 md:gap-16 md:pr-16"
    >
      {half.map((mark, i) => (
        <li
          key={`${mark}-${i}`}
          className="font-heading text-[20px] leading-[1.4] font-semibold tracking-[-0.02em] whitespace-nowrap text-ink-muted/70 md:text-[24px] dark:text-ink/80"
        >
          {mark}
        </li>
      ))}
    </ul>
  );
}

/**
 * The kinds of exam it works for, drifting past as wordmarks. Pauses on hover; still for
 * reduced motion. Screen readers get the list once.
 */
export function ExamStrip() {
  return (
    <section
      aria-label="Works for any competitive exam"
      className="py-10 md:py-14"
    >
      <p className="mb-6 px-4 text-center text-small text-ink-muted">
        For every competitive exam: bring its syllabus
      </p>
      <div className="group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)] py-2">
        <div
          className="flex w-max group-hover:[animation-play-state:paused] motion-safe:animate-marquee"
          style={{ animationDuration: "90s" }}
        >
          <Track />
          <Track hidden />
        </div>
      </div>
    </section>
  );
}
