import { Check, FileText, Flame, Snowflake } from "lucide-react";

import { cn } from "@/lib/utils/cn";

// Tiny, static UI fragments for the feature tiles. Decorative: hidden from assistive tech,
// since each tile's title and sentence already say the same thing.

const frame = "rounded-control border border-border bg-bg p-3 text-small";

export function UploadFragment() {
  return (
    <div aria-hidden className={cn(frame, "flex flex-col gap-2")}>
      <span className="flex items-center gap-2 font-medium text-ink">
        <FileText className="size-4 text-accent" /> LDC_syllabus.pdf
      </span>
      <div className="ml-2 flex flex-col gap-1 border-l border-border pl-3 text-ink-muted">
        <span>Indian Constitution · 14 topics</span>
        <span>Kerala geography · 9 topics</span>
        <span>Quantitative aptitude · 12 topics</span>
      </div>
    </div>
  );
}

export function IntensityFragment() {
  return (
    <div
      aria-hidden
      className="inline-flex rounded-control bg-surface-muted p-1 text-small font-medium"
    >
      {["Light", "Steady", "Intense"].map((label) => (
        <span
          key={label}
          className={cn(
            "rounded-[9px] px-3 py-1.5",
            label === "Steady"
              ? "bg-surface text-ink shadow-sm dark:bg-border"
              : "text-ink-muted",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function BeginnerFragment() {
  return (
    <div
      aria-hidden
      className={cn(frame, "flex items-center justify-between gap-3")}
    >
      <span className="text-ink">I&apos;m new to PSC</span>
      <span className="flex h-6 w-10 items-center rounded-full bg-accent p-0.5">
        <span className="size-5 translate-x-4 rounded-full bg-white shadow-sm" />
      </span>
    </div>
  );
}

export function MockFragment() {
  return (
    <div aria-hidden className={cn(frame, "flex flex-col gap-1.5")}>
      <span className="text-ink-muted">
        Which article abolishes untouchability?
      </span>
      <span className="flex items-center gap-2 rounded-chip border border-success bg-success-soft px-2 py-1 text-ink">
        <Check className="size-3.5 text-success" /> Article 17
      </span>
    </div>
  );
}

export function StreakFragment() {
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-2">
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-streak-soft pr-3 pl-2 text-streak-ink">
        <Flame className="size-4 fill-current text-streak" />
        <span className="font-mono text-small font-medium">21</span>
      </span>
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-muted px-3 text-small text-ink-muted">
        <Snowflake className="size-3.5" /> Freeze ready
      </span>
    </div>
  );
}

export function ReplanFragment() {
  return (
    <p aria-hidden className={cn(frame, "text-ink-muted")}>
      You studied <span className="font-medium text-ink">6 h</span> of 14. Next
      week is rebuilt from today, on track for{" "}
      <span className="font-medium text-ink">84%</span> coverage.
    </p>
  );
}

const people = ["AN", "RM", "FS", "JK"];

export function GroupsFragment() {
  return (
    <div aria-hidden className="flex items-center">
      {people.map((initials, index) => (
        <span
          key={initials}
          className={cn(
            "grid size-9 place-items-center rounded-full border-2 border-surface bg-surface-muted font-heading text-micro font-medium text-ink-muted",
            index > 0 && "-ml-2.5",
          )}
        >
          {initials}
        </span>
      ))}
      <span className="ml-3 text-small text-ink-muted">+14 studying LDC</span>
    </div>
  );
}

export function RankFragment() {
  return (
    <ol aria-hidden className="flex flex-col gap-1 text-small">
      {[
        ["#1", "Anjali", "2,840"],
        ["#2", "Rahul", "2,615"],
        ["#3", "You", "2,402"],
      ].map(([rank, name, xp]) => (
        <li
          key={rank}
          className={cn(
            "flex items-center gap-3 rounded-chip px-2 py-1",
            name === "You"
              ? "bg-accent-soft text-accent-ink"
              : "text-ink-muted",
          )}
        >
          <span className="w-6 font-mono">{rank}</span>
          <span className="flex-1">{name}</span>
          <span className="font-mono tabular-nums">{xp} XP</span>
        </li>
      ))}
    </ol>
  );
}
