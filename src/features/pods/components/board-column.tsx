"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { stageHints, stageLabels, type PodStage } from "@/lib/pods/stages";
import { cn } from "@/lib/utils/cn";

import { BoardCard, type BoardPod } from "./board-card";

/** One column of the exam board. Empty columns still take a drop. */
export function BoardColumn({
  stage,
  pods,
  onMove,
}: {
  stage: PodStage;
  pods: BoardPod[];
  onMove: (podId: string, stage: PodStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const headingId = `board-${stage}`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface-muted/60 p-3 transition-colors duration-[120ms]",
        isOver && "border-accent bg-accent-soft/40",
      )}
    >
      <div className="flex flex-col px-1">
        <div className="flex items-center justify-between gap-2">
          <h3 id={headingId} className="text-h3">
            {stageLabels[stage]}
          </h3>
          <span className="font-mono text-small text-ink-muted tabular-nums">
            {pods.length}
          </span>
        </div>
        <p className="text-small text-ink-muted">{stageHints[stage]}</p>
      </div>
      <SortableContext
        id={stage}
        items={pods.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul ref={setNodeRef} className="flex min-h-16 flex-col gap-3">
          {pods.map((pod) => (
            <li key={pod.id}>
              <BoardCard
                pod={pod}
                stage={stage}
                onMove={(to) => onMove(pod.id, to)}
              />
            </li>
          ))}
          {pods.length === 0 ? (
            <li className="grid min-h-16 place-items-center rounded-control border border-dashed border-border px-3 text-center text-small text-ink-muted">
              Drop a subject here
            </li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  );
}
