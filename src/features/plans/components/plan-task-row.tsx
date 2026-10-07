"use client";

import {
  BookOpen,
  ClipboardCheck,
  FileCheck2,
  NotebookPen,
  RotateCcw,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useId, useState } from "react";

import type { TaskReason } from "@/lib/plan-engine";
import { formatMinutes } from "@/lib/plans/format";

import { taskStep, taskTitle, whyThis, type TaskLike } from "../task-text";
import { TaskMenu } from "./task-menu";

const ICONS: Record<TaskLike["type"], LucideIcon> = {
  STUDY: BookOpen,
  CHECK_TEST: ClipboardCheck,
  REVISION: RotateCcw,
  SECTION_MOCK: FileCheck2,
  FULL_MOCK: Star,
  CUSTOM: NotebookPen,
};

export type RowTask = TaskLike & {
  id: string;
  minutes: number;
  window: string;
  pinned: boolean;
  reason: unknown;
};

/** Set when the task can be changed: an active plan, today or later. */
export type RowEditing = { date: string; today: string; end: string } | null;

/**
 * One step of a topic on a plan day: what, when in the day, how long. "Why this?" opens
 * the engine's reason in place (rule 14) without giving every row a line of its own.
 */
export function PlanTaskRow({
  task,
  topic,
  subject,
  show = "title",
  editing = null,
}: {
  task: RowTask;
  topic: string;
  subject: string;
  /**
   * "title": the whole task ("Study Preamble"). "step": under its topic's heading, just
   * the step ("Check test"). "topic": a topic's only task, named by the topic with the
   * step beside it.
   */
  show?: "title" | "step" | "topic";
  editing?: RowEditing;
}) {
  const [open, setOpen] = useState(false);
  const whyId = useId();
  const title = taskTitle(task, topic, subject);
  const Icon = ICONS[task.type];
  const why = whyThis(task.reason as TaskReason, subject);
  return (
    <li className="flex flex-col px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body" title={title}>
            {show === "step"
              ? taskStep(task, subject)
              : show === "topic"
                ? topic
                : title}
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-small text-ink-muted">
            {show === "topic" ? (
              <>
                <span>{taskStep(task, subject)}</span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span>{task.window.toLowerCase()}</span>
            {task.pinned ? <span>· placed by you</span> : null}
            {why.length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={whyId}
                  onClick={() => setOpen((o) => !o)}
                  className="font-medium text-accent-ink hover:underline"
                >
                  Why this?
                </button>
              </>
            ) : null}
          </span>
        </div>
        <span className="shrink-0 font-mono text-small text-ink-muted tabular-nums">
          {formatMinutes(task.minutes)}
        </span>
        {editing && task.type !== "CHECK_TEST" ? (
          <TaskMenu
            taskId={task.id}
            title={title}
            date={editing.date}
            minutes={task.minutes}
            pinned={task.pinned}
            today={editing.today}
            end={editing.end}
          />
        ) : null}
      </div>
      {open ? (
        <ul
          id={whyId}
          className="mt-2 mb-1 ml-11 flex list-disc flex-col gap-1 rounded-control bg-surface-muted py-2 pr-3 pl-7 text-small text-ink-muted"
        >
          {why.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
