import {
  Check,
  FileText,
  Flame,
  Hash,
  Lock,
  Megaphone,
  MessageCircle,
  NotebookPen,
  Trophy,
  X,
} from "lucide-react";

import { PodCover } from "@/components/blocks/pod-cover";
import { cn } from "@/lib/utils/cn";

// Small, decorative pictures for the feature cards. Sample content, not data. Each one
// is drawn to sit in a 160px-tall card well, so the cards line up across the rail.

const chip =
  "flex items-center gap-2 rounded-chip border border-border bg-surface px-2.5 py-1.5 text-small";

/** A subject pod: its cover, its topics, and the material mapped to them. */
export function PodFragment() {
  const items = [
    { icon: NotebookPen, label: "Notes · Preamble", tone: "text-accent-ink" },
    { icon: FileText, label: "Fundamental rights.pdf", tone: "text-ink-muted" },
  ];
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <PodCover
        cover={{ kind: "gradient", preset: "blurple" }}
        className="h-8"
      />
      <div className="p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-heading text-small font-medium text-ink">
            Indian Constitution
          </p>
          <p className="shrink-0 font-mono text-micro text-ink-muted tabular-nums">
            12/30
          </p>
        </div>
        <ul className="mt-1.5 flex flex-col gap-1.5">
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
    <div className="flex flex-col items-start gap-3">
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
      <p className="text-micro text-ink-muted">
        One freeze a week, on the house
      </p>
    </div>
  );
}

/** A squad's channel list: the same shape as the app's sidebar. */
export function SquadFragment() {
  const channels = [
    { icon: Hash, label: "general", active: true },
    { icon: Megaphone, label: "announcements", active: false },
    { icon: FileText, label: "material", active: false },
    { icon: MessageCircle, label: "doubts", active: false },
  ];
  return (
    <ul className="flex flex-col gap-1">
      {channels.map((c) => (
        <li
          key={c.label}
          className={cn(
            "flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-small",
            c.active ? "bg-accent-soft text-accent-ink" : "text-ink-muted",
          )}
        >
          <c.icon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** This week's top of a squad, by XP. */
export function RankFragment() {
  const top = [
    ["1", "Anjali N", "1,240"],
    ["2", "Rahul M", "1,105"],
    ["3", "Fathima S", "980"],
  ];
  return (
    <div className="flex flex-col gap-1.5">
      {top.map(([rank, name, xp], i) => (
        <div
          key={rank}
          className={cn(
            chip,
            "gap-3",
            i === 0 && "border-accent/30 bg-accent-soft",
          )}
        >
          {i === 0 ? (
            <Trophy className="size-4 shrink-0 text-accent-ink" aria-hidden />
          ) : (
            <span className="w-4 shrink-0 text-center font-mono text-ink-muted">
              {rank}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-ink">{name}</span>
          <span className="shrink-0 font-mono text-ink-muted tabular-nums">
            {xp}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Mock tests written from your own notes: a paid feature, locked during launch. */
export function MaterialFragment() {
  return (
    <div className="flex flex-col gap-2">
      <div className={chip}>
        <NotebookPen className="size-4 shrink-0 text-accent-ink" aria-hidden />
        <span className="truncate text-ink">Your notes, 14 pages</span>
      </div>
      <span className="text-center text-ink-subtle" aria-hidden>
        ↓
      </span>
      <div className={chip}>
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
