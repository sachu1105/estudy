"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  GripVertical,
  ListChecks,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import type { KeyboardEventHandler } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { POD_STAGES, stageLabels, type PodStage } from "@/lib/pods/stages";
import { cn } from "@/lib/utils/cn";

export type BoardPod = {
  id: string;
  name: string;
  topics: number;
  topicsDone: number;
  items: number;
};

const DOTS = 10;

/**
 * A subject pod on the exam board. Drag the card (long-press on a phone), or use the
 * handle with the keyboard, or the menu's "Move to".
 */
export function BoardCard({
  pod,
  stage,
  onMove,
}: {
  pod: BoardPod;
  stage: PodStage;
  onMove: (stage: PodStage) => void;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pod.id });
  // Mouse and touch drag the whole card; the keyboard drags from the handle.
  const { onKeyDown, ...pointer } = listeners ?? {};
  const percent = pod.topics ? pod.topicsDone / pod.topics : 0;
  const filled = Math.round(percent * DOTS);

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: transition,
      }}
      {...pointer}
      className={cn(
        "relative flex touch-manipulation flex-col gap-3 rounded-card border border-border bg-surface p-3 shadow-sm select-none [-webkit-touch-callout:none]",
        isDragging && "z-10 opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          onKeyDown={onKeyDown as KeyboardEventHandler | undefined}
          aria-label={`Drag ${pod.name}`}
          className="-ml-1 grid size-11 shrink-0 cursor-grab place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink active:cursor-grabbing md:size-8"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <Link
          href={`/pods/${pod.id}`}
          draggable={false}
          className="min-h-11 min-w-0 flex-1 py-2 font-heading text-body font-medium break-words hover:text-accent-ink md:min-h-8 md:py-1"
        >
          {pod.name}
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:size-8"
              aria-label={`Move ${pod.name}`}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Move to</DropdownMenuLabel>
            {POD_STAGES.filter((s) => s !== stage).map((s) => (
              <DropdownMenuItem key={s} onSelect={() => onMove(s)}>
                {stageLabels[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {pod.topics > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-small text-ink-muted">
            <span>Topics</span>
            <span className="font-mono tabular-nums">
              {Math.round(percent * 100)}%
            </span>
          </div>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: DOTS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full",
                  i < filled ? "bg-accent" : "bg-surface-muted",
                )}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 text-small text-ink-muted">
        <span className="inline-flex items-center gap-1 rounded-chip border border-border px-2 py-0.5">
          <ListChecks className="size-3.5" aria-hidden />
          {pod.topicsDone} of {pod.topics} topic{pod.topics === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-chip border border-border px-2 py-0.5">
          <FileText className="size-3.5" aria-hidden />
          {pod.items}
          <span className="sr-only"> items of material</span>
        </span>
      </div>
    </article>
  );
}
