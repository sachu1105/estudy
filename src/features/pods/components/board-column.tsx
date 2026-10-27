"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { stageHints, stageLabels, type PodStage } from "@/lib/pods/stages";
import { cn } from "@/lib/utils/cn";

import { BoardCard, type BoardPod } from "./board-card";
import { StageIcon } from "./stage-icon";

/**
 * One column of the exam board. Empty columns still take a drop. Under lg the columns
 * slide past one at a time and the tabs above them carry the name and count, so the
 * column shows only its hint; from lg they sit side by side with full headings.
 * Studying is the lane the plan works from, so it alone carries a tint of the accent.
 */
export function BoardColumn({
  stage,
  pods,
  onMove,
  onShift,
}: {
  stage: PodStage;
  pods: BoardPod[];
  onMove: (podId: string, stage: PodStage) => void;
  onShift: (podId: string, delta: -1 | 1) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const headingId = `board-${stage}`;
  const focus = stage === "STUDYING";
  return (
    <section
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
      <div className="flex flex-col justify-center px-2 py-1 lg:min-h-11">
        {/* Hidden under lg, where the tab says it; it still names the column. */}
        <div className="hidden items-center gap-2 lg:flex">
          <StageIcon stage={stage} />
          <h3 id={headingId} className="text-h3">
            {stageLabels[stage]}
          </h3>
          <span
            className={cn(
              "rounded-full bg-surface px-2 font-mono text-small tabular-nums",
              focus ? "text-accent-ink" : "text-ink-muted",
            )}
          >
            {pods.length}
          </span>
        </div>
        <p className="text-small text-ink-muted lg:pl-6">{stageHints[stage]}</p>
      </div>
      <SortableContext
        id={stage}
        items={pods.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex min-h-14 flex-col gap-2">
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
              {/* On a phone a subject comes in by its tab or its menu. */}
              <span className="lg:hidden">
                No subjects here. Drag one onto this tab, or use its menu.
              </span>
              <span className="hidden lg:inline">Drop a subject here</span>
            </li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  );
}
