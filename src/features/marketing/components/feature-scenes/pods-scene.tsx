import { Camera, Check, FileText, Link2, NotebookPen } from "lucide-react";

import { PodCover } from "@/components/blocks/pod-cover";
import { cn } from "@/lib/utils/cn";

// Sample content, not data. A pod in the middle of a 600px canvas: material flows in from
// the left, topics get ticked off on the right. The canvas is centred and clipped by the
// cell, so on a phone only the pod and the lines into it show.

const chip =
  "absolute flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-small whitespace-nowrap text-ink shadow-sm";
// The side chips show only where the cell holds the whole canvas: a full-width row from
// sm, and the wide column of the grid from xl.
const side = "hidden sm:flex md:hidden xl:flex";

const material = [
  { icon: NotebookPen, label: "Preamble notes", top: 40 },
  { icon: FileText, label: "rights.pdf", top: 128 },
  { icon: Camera, label: "Notebook page", top: 216 },
];

const topics = [
  { label: "Preamble", done: true, top: 40 },
  { label: "Fundamental rights", done: true, top: 128 },
  { label: "Fundamental duties", done: false, top: 216 },
];

// Left lines run into the pod's left edge (x 196), right lines out of its right edge
// (x 404). Drawn in flow order, so the dashes travel material -> pod -> topic.
const inbound = [
  "M0 56 C110 56 120 112 196 112",
  "M0 144 L196 144",
  "M0 232 C110 232 120 176 196 176",
];
const outbound = [
  "M404 112 C480 112 490 56 600 56",
  "M404 144 L600 144",
  "M404 176 C480 176 490 232 600 232",
];
const faint = [
  "M0 8 C130 8 140 100 196 100",
  "M0 280 C130 280 140 188 196 188",
  "M404 100 C460 100 470 8 600 8",
  "M404 188 C460 188 470 280 600 280",
];

export function PodsScene() {
  return (
    <div className="absolute top-1/2 left-1/2 h-72 w-[600px] -translate-x-1/2 -translate-y-1/2">
      <svg
        viewBox="0 0 600 288"
        className="absolute inset-0 size-full text-ink-subtle"
        fill="none"
      >
        {faint.map((d) => (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeDasharray="4 4"
          />
        ))}
        {[...inbound, ...outbound].map((d) => (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            strokeOpacity={0.8}
            strokeDasharray="4 4"
            className="motion-safe:animate-dash-flow"
          />
        ))}
        <circle cx="150" cy="144" r="3" className="fill-accent" />
        <circle cx="422" cy="144" r="3" className="fill-accent" />
      </svg>

      {material.map((m) => (
        <span
          key={m.label}
          className={cn(chip, side, "left-2")}
          style={{ top: m.top }}
        >
          <m.icon className="size-4 shrink-0 text-accent-ink" />
          {m.label}
        </span>
      ))}

      <PodCard />

      {topics.map((t) => (
        <span
          key={t.label}
          className={cn(chip, side, "right-2")}
          style={{ top: t.top }}
        >
          <span
            className={cn(
              "grid size-4 shrink-0 place-items-center rounded-[5px] border",
              t.done ? "border-success bg-success text-white" : "border-edge",
            )}
          >
            {t.done ? <Check className="size-3" /> : null}
          </span>
          {t.label}
        </span>
      ))}
    </div>
  );
}

function PodCard() {
  const counts = [
    { icon: NotebookPen, n: 3 },
    { icon: FileText, n: 2 },
    { icon: Link2, n: 1 },
  ];
  return (
    <div className="absolute top-12 left-[196px] w-52">
      <span className="absolute -top-3.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-small font-medium whitespace-nowrap text-bg">
        <Link2 className="size-3.5" /> Mapped to 3 topics
      </span>
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-md">
        <PodCover
          cover={{ kind: "gradient", preset: "blurple" }}
          className="h-14"
        />
        <div className="p-3">
          <p className="truncate font-heading text-body font-medium text-ink">
            Indian Constitution
          </p>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <span className="block h-full w-2/5 rounded-full bg-accent" />
          </span>
          <p className="mt-1.5 flex justify-between text-small text-ink-muted">
            <span>12 of 30 topics</span>
            <span className="font-mono tabular-nums">40%</span>
          </p>
          <div className="mt-3 flex gap-1.5">
            {counts.map((c, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-chip bg-surface-muted px-2 py-1 font-mono text-small text-ink-muted"
              >
                <c.icon className="size-3.5" /> {c.n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
