"use client";

import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useId, useRef, useState, useTransition } from "react";

import { toast } from "@/components/ui/toast";
import {
  POD_STAGES,
  stageLabels,
  type Board,
  type PodStage,
} from "@/lib/pods/stages";

import { arrangeBoardAction } from "../actions";
import type { BoardPod } from "./board-card";
import { BoardColumn } from "./board-column";

const isStage = (id: unknown): id is PodStage =>
  POD_STAGES.includes(id as PodStage);

/**
 * The exam's subjects as a board: drag a pod between columns or up and down. Every move
 * saves the whole board at once and rolls back if saving fails.
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
  const before = useRef(initialBoard);
  const [, start] = useTransition();
  const byId = new Map(pods.map((p) => [p.id, p]));
  const name = (id: unknown) => byId.get(String(id))?.name ?? "Subject";
  const stageOf = (b: Board, id: unknown) =>
    isStage(id) ? id : POD_STAGES.find((s) => b[s].includes(String(id)));

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
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

  const moveTo = (podId: string, to: PodStage) => {
    const next = Object.fromEntries(
      POD_STAGES.map((s) => [s, board[s].filter((id) => id !== podId)]),
    ) as Board;
    next[to] = [...next[to], podId];
    save(next, board);
    toast.success(`${name(podId)} moved to ${stageLabels[to].toLowerCase()}`);
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={() => (before.current = board)}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setBoard(before.current)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${name(active.id)} is over ${isStage(over.id) ? stageLabels[over.id] : name(over.id)}.`
              : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${name(active.id)} dropped.`
              : `${name(active.id)} put back.`,
          onDragCancel: ({ active }) => `${name(active.id)} put back.`,
        },
      }}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:items-start">
        {POD_STAGES.map((stage) => (
          <BoardColumn
            key={stage}
            stage={stage}
            pods={board[stage].flatMap((id) => byId.get(id) ?? [])}
            onMove={moveTo}
          />
        ))}
      </div>
    </DndContext>
  );
}
