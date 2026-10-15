"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { ChevronDown, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { stageHints, stageLabels, type PodStage } from "@/lib/pods/stages";
import { cn } from "@/lib/utils/cn";

import { BoardCard, type BoardPod } from "./board-card";
import { StageIcon } from "./stage-icon";

/**
 * One column of the exam board. Empty columns still take a drop. On a phone the columns
 * stack, so each folds to its heading; from lg they sit side by side, always open.
 * Studying is the lane the plan works from, so it alone carries a tint of the accent.
 * A crowded column switches to one-line cards and, side by side on a wide screen,
 * scrolls inside itself, so a long syllabus keeps the board one screen tall.
 */

/** More subjects than this in one column and its cards go to one line. */
const DENSE_FROM = 6;

export function BoardColumn({
  stage,
  pods,
  onMove,
  onShift,
  open,
  onToggle,
  quickStart,
}: {
  stage: PodStage;
  pods: BoardPod[];
  onMove: (podId: string, stage: PodStage) => void;
  onShift: (podId: string, delta: -1 | 1) => void;
  open: boolean;
  onToggle: () => void;
  /** Offered while this column is empty: moves the first few to-study subjects in. */
  quickStart?: { count: number; run: () => void };
}) {
  const dense = pods.length > DENSE_FROM;
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const headingId = `board-${stage}`;
  const focus = stage === "STUDYING";
  return (
    <section
      // The whole column takes a drop, so a folded one on a phone still does.
      ref={setNodeRef}
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-card border p-2 transition-colors duration-[120ms]",
        focus
          ? "border-accent/25 bg-accent-soft/60"
          : "border-transparent bg-surface-muted/70",
        isOver && "border-accent bg-accent-soft/40",
      )}
    >
      <div className="relative flex min-h-11 flex-col justify-center px-2 py-1">
        <div className="flex items-center gap-2">
          <StageIcon stage={stage} />
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
          <span
            className={cn(
              "rounded-full bg-surface px-2 font-mono text-small tabular-nums",
              focus ? "text-accent-ink" : "text-ink-muted",
            )}
          >
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
            "pl-6 text-small text-ink-muted",
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
            "min-h-14 flex-col",
            dense
              ? // The padding keeps the cards' shadow and hover lift inside the scroll box.
                "gap-1.5 lg:-m-1 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto lg:overscroll-contain lg:p-1"
              : "gap-2",
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
                dense={dense}
              />
            </li>
          ))}
          {pods.length === 0 && quickStart ? (
            <li className="flex flex-col items-center gap-2 rounded-control border border-dashed border-border px-3 py-4 text-center text-small text-ink-muted">
              Most people study two or three subjects at a time. Drag them here,
              or
              <Button variant="secondary" size="sm" onClick={quickStart.run}>
                <Play aria-hidden /> Start the top {quickStart.count}
              </Button>
            </li>
          ) : pods.length === 0 ? (
            <li className="grid min-h-14 place-items-center rounded-control border border-dashed border-border px-3 text-center text-small text-ink-muted">
              Drop a subject here
            </li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  );
}
