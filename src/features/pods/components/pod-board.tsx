"use client";

import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useId, useRef, useState, useTransition } from "react";

import { toast } from "@/components/ui/toast";
import {
  POD_STAGES,
  stageLabels,
  type Board,
  type PodStage,
} from "@/lib/pods/stages";

import { arrangeBoardAction } from "../actions";
import { BoardCardPreview, type BoardPod } from "./board-card";
import { BoardColumn } from "./board-column";
import {
  belowFinger,
  boardCollisions,
  BoardLaneTabs,
  laneId,
  onTrack,
  tabStage,
  useLanes,
} from "./board-lanes";

const isStage = (id: unknown): id is PodStage =>
  POD_STAGES.includes(id as PodStage);

/**
 * The exam's subjects as a board: drag a pod between columns or up and down, or on a
 * phone onto a column's tab. Every move saves the whole board at once and rolls back if
 * saving fails.
 */
export function PodBoard({
  syllabusId,
  pods,
  initialBoard,
}: {
  syllabusId: string;
  pods: BoardPod[];
  initialBoard: Board;
}) {
  const dndId = useId();
  const [board, setBoard] = useState(initialBoard);
  // On a phone, open on the column being worked on: Studying, else the first with pods.
  const { lane, track, slideTo, onScroll } = useLanes(
    initialBoard.STUDYING.length > 0
      ? "STUDYING"
      : (POD_STAGES.find((s) => initialBoard[s].length > 0) ?? "TO_STUDY"),
  );
  const before = useRef(initialBoard);
  const [dragged, setDragged] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [, start] = useTransition();
  const byId = new Map(pods.map((p) => [p.id, p]));
  const name = (id: unknown) => byId.get(String(id))?.name ?? "Subject";
  const overName = (id: unknown) => {
    const stage = isStage(id) ? id : tabStage(id);
    return stage ? stageLabels[stage] : name(id);
  };
  const stageOf = (b: Board, id: unknown) =>
    isStage(id) ? id : POD_STAGES.find((s) => b[s].includes(String(id)));

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  );

  const save = (next: Board, previous: Board) => {
    setBoard(next);
    if (JSON.stringify(next) === JSON.stringify(previous)) return;
    start(async () => {
      const result = await arrangeBoardAction({ syllabusId, board: next });
      if (result.ok) return;
      setBoard(previous);
      toast.error(result.error);
    });
  };

  // Crossing into another column moves the card there while it's still in the air.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setBoard((b) => {
      const from = stageOf(b, active.id);
      const to = stageOf(b, over.id);
      if (!from || !to || from === to) return b;
      const target = b[to].indexOf(String(over.id));
      const at = target < 0 ? b[to].length : target;
      return {
        ...b,
        [from]: b[from].filter((id) => id !== active.id),
        [to]: [...b[to].slice(0, at), String(active.id), ...b[to].slice(at)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragged(null);
    // Dropped on a tab: the card goes there, and the track follows it.
    const toTab = tabStage(over?.id);
    if (toTab) {
      moveTo(String(active.id), toTab, before.current);
      return slideTo(toTab);
    }
    let next = board;
    const stage = stageOf(board, active.id);
    if (over && stage && stageOf(board, over.id) === stage) {
      const from = board[stage].indexOf(String(active.id));
      const to = isStage(over.id)
        ? board[stage].length - 1
        : board[stage].indexOf(String(over.id));
      if (from !== to)
        next = { ...board, [stage]: arrayMove(board[stage], from, to) };
    }
    save(next, before.current);
  };

  // To the end of a column: from a card's menu, or dropped on a tab (which rolls back to
  // the board as it was when the drag began).
  const moveTo = (podId: string, to: PodStage, previous = board) => {
    const next = Object.fromEntries(
      POD_STAGES.map((s) => [s, board[s].filter((id) => id !== podId)]),
    ) as Board;
    next[to] = [...next[to], podId];
    save(next, previous);
    toast.success(`${name(podId)} moved to ${stageLabels[to].toLowerCase()}`);
  };

  const shift = (podId: string, delta: -1 | 1) => {
    const stage = stageOf(board, podId);
    if (!stage) return;
    const from = board[stage].indexOf(podId);
    const to = from + delta;
    if (to < 0 || to >= board[stage].length) return;
    save({ ...board, [stage]: arrayMove(board[stage], from, to) }, board);
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      // Never sideways: on a phone that would slide the track to another column mid-drag.
      autoScroll={{ threshold: { x: 0, y: 0.2 } }}
      collisionDetection={boardCollisions}
      // The tab strip is sticky, so it stays put while the page scrolls under a drag.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={({ active }) => {
        before.current = board;
        setDragged(String(active.id));
        setCompact(onTrack());
      }}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setDragged(null);
        setBoard(before.current);
      }}
      accessibility={{
        // Focusing the card's link after a drop would make the browser jump the track
        // to wherever the card landed; the track slides there itself when it should.
        restoreFocus: false,
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${name(active.id)} is over ${overName(over.id)}.`
              : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${name(active.id)} dropped.`
              : `${name(active.id)} put back.`,
          onDragCancel: ({ active }) => `${name(active.id)} put back.`,
        },
      }}
    >
      <div className="flex flex-col gap-3">
        <BoardLaneTabs
          active={lane}
          counts={
            Object.fromEntries(
              POD_STAGES.map((s) => [s, board[s].length]),
            ) as Record<PodStage, number>
          }
          onSelect={slideTo}
          dragging={(dragged && stageOf(board, dragged)) || null}
        />
        <div
          ref={track}
          onScroll={onScroll}
          className="relative flex snap-x snap-mandatory [scrollbar-width:none] items-start gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain lg:grid lg:grid-cols-4 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {POD_STAGES.map((stage) => (
            <div
              key={stage}
              id={laneId(stage)}
              className="w-full shrink-0 snap-start snap-always lg:w-auto"
            >
              <BoardColumn
                stage={stage}
                pods={board[stage].flatMap((id) => byId.get(id) ?? [])}
                onMove={moveTo}
                onShift={shift}
              />
            </div>
          ))}
        </div>
      </div>
      <DragOverlay
        modifiers={compact ? [belowFinger] : []}
        // A chip flying back to a full-size card's spot would look wrong; it just goes.
        dropAnimation={compact ? null : undefined}
      >
        {dragged && byId.get(dragged) ? (
          <BoardCardPreview
            pod={byId.get(dragged)!}
            stage={stageOf(board, dragged) ?? "TO_STUDY"}
            compact={compact}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
