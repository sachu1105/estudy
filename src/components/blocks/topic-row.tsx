"use client";

import { Clock } from "lucide-react";
import { useId, type ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";

export type TopicRowProps = {
  title: string;
  subject: string;
  minutes: number;
  done: boolean;
  onDoneChange: (done: boolean) => void;
  /** Small buttons at the end of the row, e.g. start or open. */
  actions?: ReactNode;
  className?: string;
};

export function TopicRow({
  title,
  subject,
  minutes,
  done,
  onDoneChange,
  actions,
  className,
}: TopicRowProps) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors duration-[120ms] hover:bg-surface-muted",
        className,
      )}
    >
      <Checkbox
        id={id}
        tone="success"
        checked={done}
        onCheckedChange={(value) => onDoneChange(value === true)}
        aria-label={
          done ? `Mark ${title} as not done` : `Mark ${title} as done`
        }
      />
      <label
        htmlFor={id}
        className="flex min-w-0 flex-1 cursor-pointer flex-col"
      >
        <span
          className={cn(
            "line-clamp-2 text-body font-medium break-words transition-colors duration-[200ms]",
            done ? "text-ink-muted line-through" : "text-ink",
          )}
        >
          {title}
        </span>
        <span className="truncate text-small text-ink-muted">{subject}</span>
      </label>
      <span className="flex shrink-0 items-center gap-1 font-mono text-small text-ink-muted tabular-nums">
        <Clock className="hidden size-3.5 sm:block" aria-hidden />
        {minutes}m
      </span>
      {actions}
    </div>
  );
}
