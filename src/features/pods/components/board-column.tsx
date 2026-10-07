"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { ChevronDown } from "lucide-react";

import { stageHints, stageLabels, type PodStage } from "@/lib/pods/stages";
import { cn } from "@/lib/utils/cn";

import { BoardCard, type BoardPod } from "./board-card";

/**
 * One column of the exam board. Empty columns still take a drop. On a phone the columns
 * stack, so each folds to its heading; from lg they sit side by side, always open.
 */
export function BoardColumn({
  stage,
  pods,
  onMove,
  onShift,
  open,
  onToggle,
}: {
  stage: PodStage;
  pods: BoardPod[];
  onMove: (podId: string, stage: PodStage) => void;
  onShift: (podId: string, delta: -1 | 1) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const headingId = `board-${stage}`;
  return (
    <section
      // The whole column takes a drop, so a folded one on a phone still does.
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface-muted/60 p-2 transition-colors duration-[120ms]",
        isOver && "border-accent bg-accent-soft/40",
      )}
    >
      <div className="relative flex min-h-11 flex-col justify-center px-2 py-1">
        <div className="flex items-center gap-2">
          <h3 id={headingId} className="text-h3">
            {/* The whole heading row is the toggle on a phone. */}
            <button
              type="button"
              aria-expanded={open}
              onClick={onToggle}
              className="after:absolute after:inset-0 after:rounded-card lg:hidden"
            >
              {stageLabels[stage]}
            </button>
            <span className="hidden lg:inline">{stageLabels[stage]}</span>
          </h3>
          <span className="rounded-full bg-surface px-2 font-mono text-small text-ink-muted tabular-nums">
            {pods.length}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "ml-auto size-4 text-ink-subtle transition-transform duration-[200ms] lg:hidden",
              open && "rotate-180",
            )}
          />
        </div>
        <p
          className={cn(
            "text-small text-ink-muted",
            !open && "hidden lg:block",
          )}
        >
          {stageHints[stage]}
        </p>
      </div>
      <SortableContext
        id={stage}
        items={pods.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          className={cn(
            "min-h-14 flex-col gap-2",
            open ? "flex" : "hidden lg:flex",
          )}
        >
          {pods.map((pod, i) => (
            <li key={pod.id}>
              <BoardCard
                pod={pod}
                stage={stage}
                first={i === 0}
                last={i === pods.length - 1}
                onMove={(to) => onMove(pod.id, to)}
                onShift={(delta) => onShift(pod.id, delta)}
              />
            </li>
          ))}
          {pods.length === 0 ? (
            <li className="grid min-h-14 place-items-center rounded-control border border-dashed border-border px-3 text-center text-small text-ink-muted">
              Drop a subject here
            </li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  );
}
