import {
  BookOpen,
  ClipboardCheck,
  FileCheck2,
  NotebookPen,
  RotateCcw,
  Star,
  type LucideIcon,
} from "lucide-react";

import type { TaskReason } from "@/lib/plan-engine";
import { formatMinutes } from "@/lib/plans/format";

import { taskTitle, whyThis, type TaskLike } from "../task-text";
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

/** One task: what, how long, and a "Why this?" that opens in place. */
export function PlanTaskRow({
  task,
  topic,
  subject,
  editing = null,
}: {
  task: RowTask;
  topic: string;
  subject: string;
  editing?: RowEditing;
}) {
  const title = taskTitle(task, topic, subject);
  const Icon = ICONS[task.type];
  const why = whyThis(task.reason as TaskReason, subject);
  return (
    <li className="flex flex-col gap-1 px-3 py-3">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-body break-words">{title}</span>
          <span className="text-small text-ink-muted">
            {task.type === "FULL_MOCK"
              ? "Every subject"
              : task.type === "CUSTOM"
                ? "Your task"
                : subject}{" "}
            · {task.window.toLowerCase()}
            {task.pinned ? " · placed by you" : ""}
          </span>
        </div>
        <span className="shrink-0 pt-0.5 font-mono text-small text-ink-muted tabular-nums">
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
      {why.length > 0 ? (
        <details className="group ml-12">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-small font-medium text-accent-ink md:min-h-0">
            Why this?
          </summary>
          <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-small text-ink-muted">
            {why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}
