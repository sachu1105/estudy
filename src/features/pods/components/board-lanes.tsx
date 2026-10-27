"use client";

import {
  closestCorners,
  pointerWithin,
  useDroppable,
  type CollisionDetection,
  type Modifier,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from "react";

import { POD_STAGES, stageLabels, type PodStage } from "@/lib/pods/stages";
import { cn } from "@/lib/utils/cn";

import { StageIcon } from "./stage-icon";

/**
 * Under lg the board's columns sit side by side in a track that scrolls sideways, one
 * column to a screen: swipe between them, or tap a tab. The track's scroll position is
 * the only state, so a swipe and a tap can't disagree about which column is showing.
 */
export function useLanes(initial: PodStage) {
  const track = useRef<HTMLDivElement>(null);
  const [lane, setLane] = useState(initial);
  // Only the first value counts: a refreshed board mustn't pull the track back.
  const [start] = useState(initial);

  const slideTo = useCallback((stage: PodStage, smooth = true) => {
    const el = track.current;
    const panel = el?.children[POD_STAGES.indexOf(stage)] as
      HTMLElement | undefined;
    if (!el || !panel) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: panel.offsetLeft,
      behavior: smooth && !still ? "smooth" : "instant",
    });
  }, []);

  // Open on the column being worked on, without a slide. A no-op from lg, where the
  // track is a grid that doesn't scroll.
  useLayoutEffect(() => slideTo(start, false), [slideTo, start]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const [first, second] = Array.from(el.children) as HTMLElement[];
    if (!first || !second) return;
    const step = second.offsetLeft - first.offsetLeft;
    if (step <= 0) return;
    const at = Math.round(el.scrollLeft / step);
    setLane(POD_STAGES[Math.min(Math.max(at, 0), POD_STAGES.length - 1)]!);
  };

  return { lane, track, slideTo, onScroll };
}

export const laneId = (stage: PodStage) => `lane-${stage}`;

/** A tab's drop target id, and back. */
const tabId = (stage: PodStage) => `tab:${stage}`;
export const tabStage = (id: unknown) =>
  POD_STAGES.find((s) => tabId(s) === id);

/**
 * A tab takes a drop only with the pointer on it, so a card dragged up its own column
 * isn't snatched by the tab strip; everything else goes to the closest corners.
 */
export const boardCollisions: CollisionDetection = (args) => {
  const tabs = args.droppableContainers.filter((c) => tabStage(c.id));
  const onTab = pointerWithin({ ...args, droppableContainers: tabs });
  if (onTab.length > 0) return onTab;
  return closestCorners({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (c) => !tabStage(c.id),
    ),
  });
};

/** True while the board is a track with tabs (under lg), read when a drag starts. */
export const onTrack = () => !window.matchMedia("(min-width: 1024px)").matches;

/**
 * On the track the card in the air is a small chip just below the finger, so the tab
 * under the finger stays in sight. Only the drawing moves; drops still follow the finger.
 */
export const belowFinger: Modifier = ({
  activatorEvent,
  activeNodeRect,
  transform,
}) => {
  const at = activatorEvent && getEventCoordinates(activatorEvent);
  if (!at || !activeNodeRect) return transform;
  return {
    ...transform,
    x: transform.x + at.x - activeNodeRect.left - 20,
    y: transform.y + at.y - activeNodeRect.top + 28,
  };
};

/**
 * The tabs over the track: each column's count and name. Hidden from lg. On a phone the
 * other columns are off screen, so a card is dragged onto a tab to move it there. The
 * strip sticks under the top bar, in reach from anywhere down a long column.
 */
export function BoardLaneTabs({
  active,
  counts,
  onSelect,
  dragging,
}: {
  active: PodStage;
  counts: Record<PodStage, number>;
  onSelect: (stage: PodStage) => void;
  /** The column of the card being dragged, if any. */
  dragging: PodStage | null;
}) {
  // Arrow keys move between tabs, as in any tab list.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const at = POD_STAGES.indexOf(active) + delta;
    const next = POD_STAGES[(at + POD_STAGES.length) % POD_STAGES.length]!;
    onSelect(next);
    document.getElementById(`${laneId(next)}-tab`)?.focus();
  };

  return (
    // The page's own background behind the strip, so cards don't show round its corners.
    <div className="sticky top-16 z-20 -mt-1 bg-bg pt-1 md:top-0 lg:hidden">
      <div
        role="tablist"
        aria-label="Board columns"
        onKeyDown={onKeyDown}
        className="grid grid-cols-4 gap-1 rounded-control bg-surface-muted p-1"
      >
        {POD_STAGES.map((stage) => (
          <LaneTab
            key={stage}
            stage={stage}
            count={counts[stage]}
            selected={stage === active}
            onSelect={() => onSelect(stage)}
            dragging={dragging}
          />
        ))}
      </div>
    </div>
  );
}

function LaneTab({
  stage,
  count,
  selected,
  onSelect,
  dragging,
}: {
  stage: PodStage;
  count: number;
  selected: boolean;
  onSelect: () => void;
  dragging: PodStage | null;
}) {
  // A drop target only mid-drag, and never the card's own column.
  const target = dragging !== null && dragging !== stage;
  const { setNodeRef, isOver } = useDroppable({
    id: tabId(stage),
    disabled: !target,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      id={`${laneId(stage)}-tab`}
      aria-selected={selected}
      aria-controls={laneId(stage)}
      aria-label={`${stageLabels[stage]}, ${count}`}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cn(
        "flex min-h-14 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[9px] px-1 py-1.5",
        "transition-[background-color,color,box-shadow,outline-color] duration-[120ms] ease-out",
        selected
          ? "bg-surface text-ink shadow-sm dark:bg-border"
          : "text-ink-muted hover:text-ink",
        target &&
          "outline-1 -outline-offset-1 outline-accent/40 outline-dashed",
        isOver && "bg-accent-soft text-accent-ink outline-accent outline-solid",
      )}
    >
      <span className="flex items-center gap-1 font-mono text-body tabular-nums">
        <StageIcon stage={stage} className="size-3.5" />
        {count}
      </span>
      <span className="max-w-full truncate font-heading text-small font-medium">
        {stageLabels[stage]}
      </span>
    </button>
  );
}
