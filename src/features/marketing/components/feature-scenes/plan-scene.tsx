import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

// Sample content, not data. The week's tasks as a staircase of rows that run off the
// cell's right edge; the front one is open on "Why this?".

const days = [
  { day: "Mon", title: "Rivers of India", minutes: "30m", done: true },
  { day: "Tue", title: "Percentages", minutes: "39m", done: true },
  { day: "Wed", title: "Fundamental rights", minutes: "45m", done: false },
];

const row =
  "absolute -right-10 rounded-l-card border-y border-l border-border bg-surface shadow-sm";

/** Each step back sits one step further right: a narrower step on a phone. */
function stepLeft(stepsBack: number) {
  return `calc(${stepsBack} * var(--step) + var(--gutter))`;
}

export function PlanScene() {
  return (
    <div className="absolute inset-0 [--gutter:16px] [--step:20px] sm:[--gutter:32px] sm:[--step:40px] lg:[--gutter:48px]">
      {days.map((d, i) => (
        <div
          key={d.day}
          className={cn(row, "flex h-14 items-center")}
          style={{ top: 16 + i * 60, left: stepLeft(days.length - i) }}
        >
          <Tab {...d} />
        </div>
      ))}

      <div
        className={cn(row, "flex flex-col shadow-md")}
        style={{ top: 16 + days.length * 60, left: stepLeft(0) }}
      >
        <div className="flex h-14 items-center border-b border-border">
          <Tab day="Thu" title="Constitution revision" minutes="20m" />
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="max-w-80 rounded-control border border-accent/30 bg-accent-soft p-3 text-small text-accent-ink">
            <p className="font-medium">Why this?</p>
            <p className="mt-1 font-mono">
              Second revision, 7 days after you finished the topic
            </p>
          </div>
          <div className="flex gap-2">
            <span className="h-3 w-24 rounded-full bg-surface-muted" />
            <span className="h-3 w-24 rounded-full bg-surface-muted" />
            <span className="h-3 w-16 rounded-full bg-surface-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({
  day,
  title,
  minutes,
  done = false,
}: {
  day: string;
  title: string;
  minutes: string;
  done?: boolean;
}) {
  return (
    <span className="flex h-full items-center gap-3 border-r border-border px-4">
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-[6px] border",
          done ? "border-success bg-success text-white" : "border-edge",
        )}
      >
        {done ? <Check className="size-3.5" /> : null}
      </span>
      <span className="font-mono text-small text-ink-muted uppercase">
        {day}
      </span>
      <span className="text-body whitespace-nowrap text-ink">{title}</span>
      <span className="font-mono text-small text-ink-muted tabular-nums">
        {minutes}
      </span>
    </span>
  );
}
