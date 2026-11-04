"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";

import type { TodayTask } from "./today-tasks";

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
    <div className="flex items-center gap-3 rounded-control py-1 pr-1 pl-3 transition-colors duration-[120ms] hover:bg-surface-muted">
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
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center"
      >
        <span
          className={cn(
            "truncate text-body transition-colors duration-[200ms]",
            task.done ? "text-ink-muted line-through" : "text-ink",
          )}
        >
          {task.topicName ?? task.title}
        </span>
        <span className="truncate text-small text-ink-muted">{task.step}</span>
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
  meta,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  meta: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="flex min-h-13 w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-[120ms] hover:bg-surface-muted"
    >
      <ChevronRight
        aria-hidden
        className={cn(
          "size-4 shrink-0 text-ink-subtle transition-transform duration-[200ms]",
          open && "rotate-90",
        )}
      />
      <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
        {title}
      </span>
      <span className="shrink-0 text-small text-ink-muted tabular-nums">
        {meta}
      </span>
    </button>
  );
}
