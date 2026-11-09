"use client";

import { Camera, FileText, NotebookPen, type LucideIcon } from "lucide-react";
import { useRef, type ReactNode, type Ref } from "react";

import { AnimatedBeam } from "@/components/ui/animated-beam";
import { cn } from "@/lib/utils/cn";

import { SceneTick } from "./hover";
import { PodCard } from "./pod-card";

// Sample content, not data. Magic UI's animated beam: material on the left, topics on the
// right, each a small node joined to the pod in the middle. A beam sweeps the width of its
// container, so each side gets its own half of the canvas: the left beams run material ->
// pod, then the right ones pod -> topic. Hovered, nothing moves; the lines take the accent
// colour. The 600px canvas is centred and clipped by the cell, so on a phone only the pod
// and the lines into it show.

const rows = [
  { y: 52, curvature: -60, endYOffset: -28 },
  { y: 144, curvature: 0, endYOffset: 0 },
  { y: 236, curvature: 60, endYOffset: 28 },
];

const material: { icon: LucideIcon; label: string }[] = [
  { icon: NotebookPen, label: "Preamble notes" },
  { icon: FileText, label: "rights.pdf" },
  { icon: Camera, label: "Notebook page" },
];

const topics = [
  { label: "Preamble", done: true },
  { label: "Fundamental rights", done: true },
  { label: "Fundamental duties", done: false },
];

export function PodsScene() {
  const leftHalf = useRef<HTMLDivElement>(null);
  const rightHalf = useRef<HTMLDivElement>(null);
  const pod = useRef<HTMLDivElement>(null);
  const left = [
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
  ];
  const right = [
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
  ];

  const beam = {
    toRef: pod,
    duration: 4,
    pathColor: "currentColor",
    pathOpacity: 0.5,
    gradientStartColor: "var(--accent)",
    gradientStopColor: "var(--accent)",
    className:
      "text-ink-subtle transition-colors duration-500 ease-out group-hover/feature:text-accent",
  };

  return (
    <div className="absolute top-1/2 left-1/2 h-72 w-[600px] -translate-x-1/2 -translate-y-1/2">
      <div ref={leftHalf} className="absolute inset-y-0 left-0 w-1/2">
        {rows.map((row, i) => (
          <AnimatedBeam
            key={i}
            {...beam}
            containerRef={leftHalf}
            fromRef={left[i]!}
            curvature={row.curvature}
            endYOffset={row.endYOffset}
          />
        ))}
      </div>
      <div ref={rightHalf} className="absolute inset-y-0 right-0 w-1/2">
        {rows.map((row, i) => (
          <AnimatedBeam
            key={i}
            {...beam}
            containerRef={rightHalf}
            fromRef={right[i]!}
            curvature={row.curvature}
            endYOffset={row.endYOffset}
            delay={0.8}
          />
        ))}
      </div>

      {material.map((m, i) => (
        <Node
          key={m.label}
          ref={left[i]}
          label={m.label}
          side="left"
          y={rows[i]!.y}
        >
          <m.icon className="size-5 text-accent-ink" />
        </Node>
      ))}

      <PodCard ref={pod} />

      {topics.map((t, i) => (
        <Node
          key={t.label}
          ref={right[i]}
          label={t.label}
          side="right"
          y={rows[i]!.y}
        >
          <SceneTick
            done={t.done}
            className="size-5 rounded-[6px]"
            iconClassName="size-3.5"
          />
        </Node>
      ))}
    </div>
  );
}

/** A round node on the canvas, centred on `y`, with its label under it. */
function Node({
  ref,
  label,
  side,
  y,
  children,
}: {
  ref?: Ref<HTMLSpanElement>;
  label: string;
  side: "left" | "right";
  y: number;
  children: ReactNode;
}) {
  return (
    <span
      ref={ref}
      className={cn(
        "absolute grid size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface shadow-sm",
        side === "left" ? "left-9" : "right-9",
      )}
      style={{ top: y }}
    >
      {children}
      <span className="absolute top-full left-1/2 mt-1.5 -translate-x-1/2 text-small whitespace-nowrap text-ink-muted">
        {label}
      </span>
    </span>
  );
}
