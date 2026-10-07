import {
  Camera,
  Check,
  FileText,
  Flame,
  Link2,
  Lock,
  NotebookPen,
  X,
} from "lucide-react";

import { PodCover } from "@/components/blocks/pod-cover";
import { cn } from "@/lib/utils/cn";

// Small, decorative pictures for the features bento. Sample content, not data.

const chip =
  "flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-small";

/** A subject pod: its cover, its topics, and the material mapped to them. */
export function PodFragment() {
  const items = [
    { icon: NotebookPen, label: "Notes · Preamble", tone: "text-accent-ink" },
    { icon: FileText, label: "Fundamental rights.pdf", tone: "text-ink-muted" },
    { icon: Link2, label: "prsindia.org · Articles", tone: "text-ink-muted" },
    { icon: Camera, label: "Notebook page, 2 photos", tone: "text-ink-muted" },
  ];
  return (
    <div className="relative isolate overflow-hidden rounded-[18px] border border-border bg-surface">
      <PodCover
        cover={{ kind: "gradient", preset: "blurple" }}
        className="absolute inset-x-0 top-0 -z-10 h-20"
      />
      <div className="mt-12 rounded-t-[16px] bg-surface p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-heading text-body font-medium text-ink">
            Indian Constitution
          </p>
          <p className="font-mono text-small text-ink-muted tabular-nums">
            12/30 topics
          </p>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.label} className={chip}>
              <item.icon
                className={cn("size-4 shrink-0", item.tone)}
                aria-hidden
              />
              <span className="truncate text-ink">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** "Why this?": the reason behind one task's minutes, open. */
export function WhyFragment() {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn(chip, "justify-between")}>
        <span className="text-ink">Percentages</span>
        <span className="font-mono text-ink-muted">39m</span>
      </div>
      <div className="rounded-control border border-accent/30 bg-accent-soft p-3 text-small text-accent-ink">
        <p className="font-medium">Why this?</p>
        <p className="mt-1 font-mono text-micro leading-5">
          30m × intense 1.3 × confidence 2 of 5
        </p>
      </div>
    </div>
  );
}

/** A question just answered: the pick, and the right one. */
export function TestFragment() {
  return (
    <ul className="flex flex-col gap-1.5">
      <li className={cn(chip, "border-success bg-success-soft")}>
        <Check className="size-4 shrink-0 text-success-ink" aria-hidden />
        <span className="text-success-ink">Article 21</span>
      </li>
      <li className={cn(chip, "border-danger/40 bg-danger-soft")}>
        <X className="size-4 shrink-0 text-danger-ink" aria-hidden />
        <span className="text-danger-ink line-through">Article 19</span>
      </li>
      <li className={chip}>
        <span className="size-4 shrink-0" />
        <span className="text-ink-muted">Article 32</span>
      </li>
    </ul>
  );
}

/** Next week, rebuilt from today: no backlog row anywhere. */
export function ReplanFragment() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-chip border py-2 text-micro",
              i === 0
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-border bg-surface text-ink-muted",
            )}
          >
            {d}
            <span
              className={cn(
                "h-6 w-1.5 rounded-full",
                i === 6 ? "bg-surface-muted" : "bg-accent/60",
              )}
            />
          </div>
        ))}
      </div>
      <p className="text-center text-micro text-ink-muted">
        Rebuilt every Sunday from where you are
      </p>
    </div>
  );
}

/** The week's streak, with Sunday's freeze. */
export function StreakFragment() {
  const week = [true, true, true, "freeze", true, true, false] as const;
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 rounded-full bg-streak-soft px-3 py-1.5 font-mono text-body font-medium text-streak-ink">
        <Flame className="size-4 text-streak" aria-hidden /> 13
      </span>
      <div className="flex gap-1.5">
        {week.map((day, i) => (
          <span
            key={i}
            className={cn(
              "size-3 rounded-full",
              day === true && "bg-streak",
              day === "freeze" && "border-2 border-streak bg-transparent",
              day === false && "bg-surface-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Mock tests written from your own notes: a paid feature, locked during launch. */
export function MaterialFragment() {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(chip, "min-w-0 flex-1")}>
        <NotebookPen className="size-4 shrink-0 text-accent-ink" aria-hidden />
        <span className="truncate text-ink">Your notes, 14 pages</span>
      </div>
      <span className="text-ink-subtle" aria-hidden>
        →
      </span>
      <div className={cn(chip, "min-w-0 flex-1")}>
        <Lock className="size-4 shrink-0 text-ink-muted" aria-hidden />
        <span className="truncate text-ink">25-question mock</span>
      </div>
    </div>
  );
}

/** Beginner mode: fundamentals first, shorter blocks, an explanation every time. */
export function BeginnerFragment() {
  return (
    <ul className="flex flex-wrap gap-2">
      {["Fundamentals first", "25-minute blocks", "Every answer explained"].map(
        (label) => (
          <li
            key={label}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-small text-ink"
          >
            {label}
          </li>
        ),
      )}
    </ul>
  );
}
