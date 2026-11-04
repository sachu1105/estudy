"use client";

import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  PenLine,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";

import type { TaskKind, TodayTask } from "./today-tasks";

const KIND_ICON: Record<TaskKind, LucideIcon> = {
  study: BookOpen,
  revise: RotateCcw,
  test: ClipboardCheck,
  own: PenLine,
};

/** What kind of step a task is, as a small neutral chip: the icon reads before the words. */
function StepChip({ kind, step }: { kind: TaskKind; step: string }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className="inline-flex max-w-full items-center gap-1 self-start rounded-chip bg-surface-muted px-1.5 py-0.5 text-small text-ink-muted">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{step}</span>
    </span>
  );
}

/** One task: tick, topic, the step within it, minutes, and the way in. */
export function TaskRow({
  task,
  action,
  onDoneChange,
}: {
  task: TodayTask;
  action?: ReactNode;
  onDoneChange: (id: string, done: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-control py-1.5 pr-1.5 pl-3 transition-colors duration-[120ms] hover:bg-surface-muted/60">
      <Checkbox
        id={`task-${task.id}`}
        tone="success"
        checked={task.done}
        onCheckedChange={(value) => onDoneChange(task.id, value === true)}
        aria-label={
          task.done
            ? `Mark ${task.title} as not done`
            : `Mark ${task.title} as done`
        }
      />
      <label
        htmlFor={`task-${task.id}`}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-1"
      >
        <span
          className={cn(
            "truncate text-body transition-colors duration-[200ms]",
            task.done ? "text-ink-muted line-through" : "text-ink",
          )}
        >
          {task.topicName ?? task.title}
        </span>
        <StepChip kind={task.kind} step={task.step} />
      </label>
      <span
        className={cn(
          "shrink-0 font-mono text-small text-ink-muted tabular-nums",
          (task.done || !action) && "mr-3",
        )}
      >
        {task.minutes}m
      </span>
      {task.done ? null : action}
    </div>
  );
}

/** A section's one-line header: opens and closes what is under it. */
export function SectionToggle({
  open,
  onToggle,
  title,
  lead,
  meta,
  progress = null,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  /** A small tile before the title: the subject pod's cover, or an icon. */
  lead: ReactNode;
  meta: ReactNode;
  /** 0-100 once some of the section is done today; a thin bar under the title. */
  progress?: number | null;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-surface-muted/60"
    >
      {lead}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-body font-medium text-ink">{title}</span>
        {progress !== null ? (
          <span className="h-1 w-full max-w-32 overflow-hidden rounded-full bg-surface-muted">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-[300ms]"
              style={{ width: `${progress}%` }}
            />
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-small text-ink-muted tabular-nums">
        {meta}
      </span>
      <ChevronRight
        aria-hidden
        className={cn(
          "size-4 shrink-0 text-ink-muted transition-transform duration-[200ms]",
          open && "rotate-90",
        )}
      />
    </button>
  );
}
