import { Clock, Flame, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const tasks = [
  {
    title: "Fundamental rights",
    subject: "Indian Constitution",
    minutes: 45,
    tickDelay: "700ms",
  },
  {
    title: "Rivers of Kerala",
    subject: "Kerala geography",
    minutes: 30,
    tickDelay: "1300ms",
  },
  {
    title: "Percentages",
    subject: "Quantitative aptitude",
    minutes: 25,
    tickDelay: null,
  },
];

const RING = { size: 56, stroke: 6, value: 64 };
const radius = (RING.size - RING.stroke) / 2;
const circumference = 2 * Math.PI * radius;

/**
 * The Today card in the hero, drawn with the same tokens and shapes as the app. It is a
 * server component with CSS-only animations (no client JS on the landing page): two ticks
 * draw in once and the coverage ring fills. Reduced motion jumps straight to the end state.
 */
export function HeroPreview() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] opacity-70"
      />
      <div
        role="img"
        aria-label="Preview of the Today screen: a 13 day streak, three tasks with two done, and 64% syllabus coverage"
        className="rounded-card border border-border bg-surface p-4 shadow-lg sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-micro text-ink-muted uppercase">
              Today · day 12 of 90
            </p>
            <p className="font-heading text-h3 font-medium">Your plan</p>
          </div>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-streak-soft pr-3 pl-2 text-streak-ink">
            <Flame className="size-4 fill-current text-streak" aria-hidden />
            <span className="font-mono text-small font-medium tabular-nums">
              13
            </span>
          </span>
        </div>

        <ul aria-hidden className="flex flex-col">
          {tasks.map((task) => (
            <li
              key={task.title}
              className="flex items-center gap-3 rounded-control px-3 py-2.5"
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px] border-ink-subtle",
                  task.tickDelay && "hero-tick-box",
                )}
                style={
                  task.tickDelay
                    ? { animationDelay: task.tickDelay }
                    : undefined
                }
              >
                {task.tickDelay ? (
                  <svg viewBox="0 0 16 16" className="size-3.5 text-on-accent">
                    <path
                      d="M3.5 8.5 6.5 11.5 12.5 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.25}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      className="hero-tick"
                      style={{ animationDelay: task.tickDelay }}
                    />
                  </svg>
                ) : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "truncate text-body font-medium text-ink",
                    task.tickDelay && "hero-tick-text",
                  )}
                  style={
                    task.tickDelay
                      ? { animationDelay: task.tickDelay }
                      : undefined
                  }
                >
                  {task.title}
                </span>
                <span className="truncate text-small text-ink-muted">
                  {task.subject}
                </span>
              </span>
              <span className="flex items-center gap-1 font-mono text-small text-ink-muted tabular-nums">
                <Clock className="size-3.5" />
                {task.minutes}m
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-4 rounded-control bg-surface-muted p-3">
          <div
            aria-hidden
            className="relative grid shrink-0 place-items-center"
            style={{ width: RING.size, height: RING.size }}
          >
            <svg width={RING.size} height={RING.size} className="-rotate-90">
              <circle
                cx={RING.size / 2}
                cy={RING.size / 2}
                r={radius}
                fill="none"
                strokeWidth={RING.stroke}
                className="stroke-surface"
              />
              <circle
                cx={RING.size / 2}
                cy={RING.size / 2}
                r={radius}
                fill="none"
                strokeWidth={RING.stroke}
                strokeLinecap="round"
                strokeDasharray={circumference}
                className="hero-ring stroke-accent"
                style={
                  {
                    "--ring-from": circumference,
                    strokeDashoffset: circumference * (1 - RING.value / 100),
                  } as React.CSSProperties
                }
              />
            </svg>
            <span className="absolute font-mono text-small font-medium tabular-nums">
              {RING.value}%
            </span>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <span className="text-small text-ink-muted">Syllabus coverage</span>
            <Badge tone="accent">
              <Sparkles aria-hidden /> Check test unlocked
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
