import { BookOpen, GraduationCap } from "lucide-react";

import { exams } from "@/lib/site";

// What the marquee carries: the exams, and the subjects their syllabuses share. Names
// only; real user numbers get added once they exist, never invented.
const SUBJECTS = [
  "Kerala renaissance",
  "Indian Constitution",
  "Simple arithmetic",
  "General English",
  "Geography of Kerala",
  "Current affairs",
  "Basic science",
  "Malayalam",
];

const items = exams.flatMap((exam, i) => [
  { label: exam, exam: true },
  { label: SUBJECTS[(i * 2) % SUBJECTS.length]!, exam: false },
  { label: SUBJECTS[(i * 2 + 1) % SUBJECTS.length]!, exam: false },
]);
// Each half of the track must be wider than the widest screen.
const half = [...items, ...items];

function Track({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 gap-3 pr-3">
      {half.map((item, i) => (
        <li
          key={`${item.label}-${i}`}
          className={
            item.exam
              ? "flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-small font-medium whitespace-nowrap text-accent-ink"
              : "flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-small whitespace-nowrap text-ink-muted"
          }
        >
          {item.exam ? (
            <GraduationCap className="size-4" aria-hidden />
          ) : (
            <BookOpen className="size-4 text-ink-subtle" aria-hidden />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * The exams it's built for, drifting past with the subjects their syllabuses share.
 * Pauses on hover; still for reduced motion. Screen readers get the list once.
 */
export function ExamStrip() {
  return (
    <section
      aria-label="Built for these exams"
      className="border-y border-border bg-surface/60 py-6"
    >
      <p className="mb-4 text-center text-micro text-ink-muted uppercase">
        Built for Kerala PSC
      </p>
      <div className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max group-hover:[animation-play-state:paused] motion-safe:animate-marquee">
          <Track />
          <Track hidden />
        </div>
      </div>
    </section>
  );
}
