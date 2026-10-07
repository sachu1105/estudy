"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";
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

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: transition,
      }}
      {...pointer}
      className={cn(
        "relative flex touch-manipulation items-center gap-1 rounded-control border border-border bg-surface py-1 pr-1 pl-0.5 shadow-sm transition-shadow duration-[120ms] select-none [-webkit-touch-callout:none] hover:shadow-md",
        isDragging && "z-10 opacity-60 shadow-lg",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        onKeyDown={onKeyDown as KeyboardEventHandler | undefined}
        aria-label={`Drag ${pod.name}`}
        className="relative z-10 grid h-11 w-7 shrink-0 cursor-grab place-items-center rounded-control text-ink-subtle hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-1.5">
        {/* The link covers the card, so the whole card opens the pod. */}
        <Link
          href={`/pods/${pod.id}`}
          draggable={false}
          className="line-clamp-2 font-heading text-body font-medium break-words text-ink after:absolute after:inset-0 after:rounded-control hover:text-accent-ink"
        >
          {pod.name}
        </Link>
        <span className="truncate text-small text-ink-muted">
          {pod.topicsDone} of {pod.topics} topic{pod.topics === 1 ? "" : "s"}
          {pod.items > 0
            ? ` · ${pod.items} item${pod.items === 1 ? "" : "s"}`
            : null}
        </span>
        {pod.topics > 0 ? (
          <span
            aria-hidden
            className="h-1 overflow-hidden rounded-full bg-surface-muted"
          >
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${percent * 100}%` }}
            />
          </span>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10 shrink-0 self-start md:size-9"
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
    </article>
  );
}
