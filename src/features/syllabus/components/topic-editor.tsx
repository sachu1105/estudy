"use client";

import {
  ArrowDown,
  ArrowUp,
  Circle,
  MoreHorizontal,
  Sprout,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GrowText } from "@/components/ui/grow-text";
import { Rating } from "@/components/ui/rating";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { EditableTopic } from "@/lib/syllabus/tree";
import { cn } from "@/lib/utils/cn";

import { LEVELS } from "../levels";
import type { TopicPatch } from "../tree-reducer";

/** Shared with the column headings in `TopicsEditor`, so rows line up under them. */
export const TOPIC_COLUMNS =
  "md:grid md:grid-cols-[2.75rem_minmax(0,1fr)_8rem_8rem_7.5rem_2.75rem] md:items-center";

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

/**
 * One topic as one row. The name reads as text until you edit it. From md the two
 * scales sit inline under shared headings; on a phone they fold into a small summary
 * that opens a sheet with big, thumb-sized stars.
 */
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
  const label = topic.name || "topic";
  return (
    <li
      className={cn(
        "flex items-start gap-1 py-1 pr-1 pl-0.5 md:gap-2",
        TOPIC_COLUMNS,
      )}
    >
      <label className="grid size-11 shrink-0 cursor-pointer place-items-center md:size-auto">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(v === true)}
          aria-label={`Select ${label} to merge`}
        />
      </label>
      {/* Name, and on a phone the scales under it, so the name gets the row. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <GrowText
          value={topic.name}
          onValueChange={(name) => onChange({ name })}
          aria-label="Topic name"
          aria-invalid={!topic.name.trim() || undefined}
          maxLength={200}
          className={cn(
            "min-h-9 w-full rounded-control border border-transparent bg-transparent px-2 py-1.5 text-[16px] leading-6 text-ink md:text-body",
            "transition-colors duration-[120ms] hover:border-border focus:border-accent focus:bg-surface focus:outline-none",
            "aria-invalid:border-danger",
          )}
        />
        {/* Phones: the values at a glance; tap for the sheet. */}
        <Sheet>
          <SheetTrigger
            aria-label={`Weight ${topic.weight}, difficulty ${topic.difficulty}${topic.foundational ? ", foundation" : ""}. Change for ${label}`}
            className="relative -mt-1 flex h-8 items-center gap-2 self-start rounded-control px-2 font-mono text-small text-ink-muted tabular-nums after:absolute after:inset-x-0 after:-inset-y-1.5 hover:bg-surface-muted md:hidden"
          >
            <span className="flex items-center gap-0.5">
              <Star className="size-3.5 fill-current text-accent" aria-hidden />
              {topic.weight}
            </span>
            <span className="flex items-center gap-0.5">
              <Circle className="size-3 fill-current text-accent" aria-hidden />
              {topic.difficulty}
            </span>
            {topic.foundational ? (
              <Sprout className="size-3.5 text-accent-ink" aria-hidden />
            ) : null}
          </SheetTrigger>
          <SheetContent side="bottom" className="gap-5">
            <div className="flex flex-col gap-1 pr-8">
              <SheetTitle className="text-h3">{label}</SheetTitle>
              <SheetDescription className="text-small">
                Study time comes from these. Change them only if they look
                wrong.
              </SheetDescription>
            </div>
            {(["weight", "difficulty"] as const).map((kind) => (
              <div key={kind} className="flex flex-col gap-1">
                <span className="text-small text-ink-muted">
                  {LEVELS[kind].label} ·{" "}
                  <span className="text-ink">
                    {LEVELS[kind].words[topic[kind] - 1]}
                  </span>
                </span>
                <Rating
                  size="lg"
                  className="-ml-2"
                  value={topic[kind]}
                  onChange={(v) => onChange({ [kind]: v })}
                  label={`${LEVELS[kind].label} of ${label}`}
                  words={LEVELS[kind].words}
                  icon={LEVELS[kind].icon}
                />
              </div>
            ))}
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
              <span className="flex flex-col">
                <span className="text-body">Foundation topic</span>
                <span className="text-small text-ink-muted">
                  New to PSC? These come first.
                </span>
              </span>
              <Switch
                checked={topic.foundational}
                onCheckedChange={(foundational) => onChange({ foundational })}
                aria-label={`${label} is a foundation topic`}
              />
            </label>
          </SheetContent>
        </Sheet>
      </div>

      {/* md and up: inline. */}
      <Rating
        className="hidden md:inline-flex"
        value={topic.weight}
        onChange={(weight) => onChange({ weight })}
        label={`Weight of ${label}`}
        words={LEVELS.weight.words}
        icon={LEVELS.weight.icon}
      />
      <Rating
        className="hidden md:inline-flex"
        value={topic.difficulty}
        onChange={(difficulty) => onChange({ difficulty })}
        label={`Difficulty of ${label}`}
        words={LEVELS.difficulty.words}
        icon={LEVELS.difficulty.icon}
      />
      <button
        type="button"
        aria-pressed={topic.foundational}
        aria-label={`${label} is a foundation topic`}
        onClick={() => onChange({ foundational: !topic.foundational })}
        className={cn(
          "hidden h-8 items-center gap-1.5 justify-self-start rounded-chip px-2.5 text-small font-medium transition-colors duration-[120ms] md:inline-flex",
          topic.foundational
            ? "bg-accent-soft text-accent-ink"
            : "text-ink-muted hover:bg-surface-muted hover:text-ink",
        )}
      >
        <Sprout className="size-3.5" aria-hidden />
        Basic
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:size-9"
            aria-label={`More for ${label}`}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
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
    </li>
  );
}
