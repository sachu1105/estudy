import { Check, FileText, Star, Users } from "lucide-react";

import { cn } from "@/lib/utils/cn";

// Small, decorative pictures of each step. Sample content, not data.

export function UploadVisual() {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2.5 rounded-control border border-border bg-surface p-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-chip bg-accent-soft text-accent-ink">
          <FileText className="size-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-small font-medium text-ink">
            ldc_syllabus.pdf
          </span>
          <span className="h-1 overflow-hidden rounded-full bg-surface-muted">
            <span className="block h-full w-full rounded-full bg-accent" />
          </span>
        </span>
      </div>
      <span className="flex items-center gap-1.5 self-start rounded-full bg-success-soft px-2.5 py-1 text-micro font-medium text-success-ink">
        <Check className="size-3" aria-hidden /> 17 subjects found
      </span>
    </div>
  );
}

export function RateVisual() {
  const rows: [string, number][] = [
    ["Constitution", 4],
    ["Arithmetic", 2],
    ["English", 3],
  ];
  return (
    <ul className="flex w-full flex-col gap-1.5">
      {rows.map(([name, stars]) => (
        <li
          key={name}
          className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface px-2.5 py-2"
        >
          <span className="truncate text-small text-ink">{name}</span>
          <span className="flex shrink-0 gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-3",
                  i < stars ? "fill-streak text-streak" : "text-border",
                )}
                aria-hidden
              />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PlanVisual() {
  const tasks: [string, string, boolean][] = [
    ["Fundamental rights", "45m", true],
    ["Rivers of Kerala", "30m", false],
    ["Percentages", "25m", false],
  ];
  return (
    <ul className="flex w-full flex-col gap-1.5">
      {tasks.map(([title, minutes, done]) => (
        <li
          key={title}
          className="flex items-center gap-2.5 rounded-control border border-border bg-surface px-2.5 py-2"
        >
          <span
            className={cn(
              "grid size-4 shrink-0 place-items-center rounded-[5px] border",
              done ? "border-success bg-success text-white" : "border-border",
            )}
          >
            {done ? <Check className="size-3" aria-hidden /> : null}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-small",
              done ? "text-ink-muted line-through" : "text-ink",
            )}
          >
            {title}
          </span>
          <span className="font-mono text-micro text-ink-muted">{minutes}</span>
        </li>
      ))}
    </ul>
  );
}

export function SquadVisual() {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between rounded-control border border-border bg-surface px-3 py-2.5">
        <span className="text-small text-ink">Check test</span>
        <span className="flex items-center gap-1.5 font-mono text-small font-medium text-success-ink">
          <Check className="size-3.5" aria-hidden /> 4/5
        </span>
      </div>
      <div className="flex items-center justify-between rounded-control border border-accent/30 bg-accent-soft px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-small text-accent-ink">
          <Users className="size-3.5" aria-hidden /> Squad, this week
        </span>
        <span className="font-mono text-small font-medium text-accent-ink">
          #3
        </span>
      </div>
    </div>
  );
}
