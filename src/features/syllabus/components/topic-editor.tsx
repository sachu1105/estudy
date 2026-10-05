"use client";

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Reorder, useDragControls } from "motion/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { EditableTopic } from "@/lib/syllabus/tree";

import type { TopicPatch } from "../tree-reducer";
import { LevelSelect } from "./level-select";

type TopicEditorProps = {
  topic: EditableTopic;
  index: number;
  count: number;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onChange: (patch: TopicPatch) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
};

/** One editable topic. Drag by the handle (touch too), or use the menu to move it. */
export function TopicEditor({
  topic,
  index,
  count,
  selected,
  onSelect,
  onChange,
  onMove,
  onDelete,
}: TopicEditorProps) {
  const controls = useDragControls();
  const label = topic.name || "topic";
  return (
    <Reorder.Item
      value={topic}
      dragListener={false}
      dragControls={controls}
      className="flex flex-col gap-3 rounded-control border border-border bg-surface p-3"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Drag ${label} to reorder`}
          onPointerDown={(e) => controls.start(e)}
          className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-chip text-ink-muted hover:bg-surface-muted active:cursor-grabbing md:size-9"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center md:size-9">
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelect(v === true)}
            aria-label={`Select ${label} to merge`}
          />
        </label>
        <Input
          value={topic.name}
          aria-label="Topic name"
          aria-invalid={!topic.name.trim() || undefined}
          maxLength={200}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-11 min-w-0 flex-1 md:h-9"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`More for ${label}`}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={index === 0}
              onSelect={() => onMove(-1)}
            >
              <ArrowUp aria-hidden /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === count - 1}
              onSelect={() => onMove(1)}
            >
              <ArrowDown aria-hidden /> Move down
            </DropdownMenuItem>
            <DropdownMenuItem disabled={count <= 1} onSelect={onDelete}>
              <Trash2 aria-hidden /> Delete topic
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <LevelSelect
          kind="weight"
          value={topic.weight}
          topicName={topic.name}
          onChange={(weight) => onChange({ weight })}
        />
        <LevelSelect
          kind="difficulty"
          value={topic.difficulty}
          topicName={topic.name}
          onChange={(difficulty) => onChange({ difficulty })}
        />
        <label className="col-span-2 flex min-h-11 cursor-pointer items-center justify-between gap-3 sm:col-span-1 sm:min-h-9 sm:justify-start">
          <span className="text-small text-ink-muted">Foundation topic</span>
          <Switch
            checked={topic.foundational}
            onCheckedChange={(foundational) => onChange({ foundational })}
            aria-label={`${label} is a foundation topic`}
          />
        </label>
      </div>
    </Reorder.Item>
  );
}
