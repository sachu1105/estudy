"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import Link from "next/link";

import { PodMark } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PodCover } from "@/lib/pods/covers";
import { POD_STAGES, stageLabels, type PodStage } from "@/lib/pods/stages";
import { cn } from "@/lib/utils/cn";

import { StageIcon } from "./stage-icon";

export type BoardPod = {
  id: string;
  name: string;
  topics: number;
  topicsDone: number;
  items: number;
  cover: PodCover;
};

/**
 * A subject pod on the exam board. Drag the card itself (long-press on a phone); there
 * is no handle. The menu does the same with a tap or the keyboard: up, down, or to
 * another column. `dense` is the one-line card a crowded column uses: the name and
 * "done/total" only, so a 17-subject syllabus stays short.
 */
export function BoardCard({
  pod,
  stage,
  first,
  last,
  onMove,
  onShift,
  dense = false,
}: {
  pod: BoardPod;
  stage: PodStage;
  dense?: boolean;
  first: boolean;
  last: boolean;
  onMove: (stage: PodStage) => void;
  /** Up or down within its column. */
  onShift: (delta: -1 | 1) => void;
}) {
  const { setNodeRef, listeners, transform, transition, isDragging } =
    useSortable({ id: pod.id });
  // Pointer drags only: Enter on the card's link must open the pod, not pick it up.
  // Keyboard users move cards from the menu.
  const pointer = { ...listeners };
  delete pointer.onKeyDown;
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
        "group relative flex cursor-grab touch-manipulation items-center gap-2.5 rounded-control border border-border bg-surface pr-1 pl-2 shadow-sm transition-[translate,rotate,box-shadow] duration-[120ms] select-none [-webkit-touch-callout:none] hover:-translate-y-px hover:shadow-md active:cursor-grabbing [@media(hover:hover)]:pr-3",
        dense ? "min-h-11 py-1" : "min-h-16 py-2",
        isDragging && "z-10 rotate-[1.5deg] shadow-lg",
      )}
    >
      <PodMark
        cover={pod.cover}
        name={pod.name}
        done={stage === "DONE"}
        className={dense ? "size-7" : "size-9"}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* The link covers the card, so the whole card opens the pod. */}
        <Link
          href={`/pods/${pod.id}`}
          draggable={false}
          className={cn(
            "font-heading text-body font-medium text-ink after:absolute after:inset-0 after:rounded-control hover:text-accent-ink",
            dense ? "truncate" : "line-clamp-2 break-words",
          )}
        >
          {pod.name}
        </Link>
        <span
          className={cn(
            "truncate text-small text-ink-muted",
            dense && "sr-only",
          )}
        >
          {pod.topicsDone} of {pod.topics} topic{pod.topics === 1 ? "" : "s"}
          {pod.items > 0
            ? ` · ${pod.items} item${pod.items === 1 ? "" : "s"}`
            : null}
        </span>
        {/* Only once something is done: a row of empty bars is just noise. */}
        {pod.topicsDone > 0 && !dense ? (
          <span
            aria-hidden
            className="mt-1 h-1 overflow-hidden rounded-full bg-surface-muted"
          >
            <span
              className={cn(
                "block h-full rounded-full",
                percent >= 1 ? "bg-success" : "bg-accent",
              )}
              style={{ width: `${percent * 100}%` }}
            />
          </span>
        ) : null}
      </div>
      {dense ? (
        <span
          aria-hidden
          className={cn(
            "shrink-0 font-mono text-small tabular-nums",
            pod.topics > 0 && pod.topicsDone >= pod.topics
              ? "text-success"
              : "text-ink-muted",
          )}
        >
          {pod.topicsDone}/{pod.topics}
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            // Where hovering exists it floats over the card's corner, hidden until the
            // card is hovered or focused, so names get the full width. On touch it
            // stays in the row, always visible.
            className="relative z-10 shrink-0 self-start group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 md:size-9 [@media(hover:hover)]:absolute [@media(hover:hover)]:top-1 [@media(hover:hover)]:right-1 [@media(hover:hover)]:bg-surface [@media(hover:hover)]:opacity-0"
            aria-label={`Move ${pod.name}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={first} onSelect={() => onShift(-1)}>
            <ArrowUp aria-hidden /> Move up
          </DropdownMenuItem>
          <DropdownMenuItem disabled={last} onSelect={() => onShift(1)}>
            <ArrowDown aria-hidden /> Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {POD_STAGES.filter((s) => s !== stage).map((s) => (
            <DropdownMenuItem key={s} onSelect={() => onMove(s)}>
              <StageIcon stage={s} /> {stageLabels[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}
