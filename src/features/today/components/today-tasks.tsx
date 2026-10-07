"use client";

import {
  ChevronRight,
  ClipboardCheck,
  FolderOpen,
  Play,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";
import { startTaskTestAction } from "@/features/tests/actions";
import { cn } from "@/lib/utils/cn";

import { groupTasks, type TaskGroup } from "@/features/plans/group-tasks";
import { setTaskDoneAction } from "../actions";

export type TodayTask = {
  id: string;
  /** Full title, used for labels: "Study Earth Structure (part 1 of 2)". */
  title: string;
  /** The same task inside its topic: "Study · part 1 of 2". */
  step: string;
  subject: string;
  minutes: number;
  done: boolean;
  topicId: string | null;
  topicName: string | null;
  /** Study and revision run as a timed session. */
  timed: boolean;
  /** Check tests and mocks open the test player. */
  test: boolean;
};

const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-colors duration-[120ms] hover:bg-surface-muted hover:text-ink md:size-9";

/**
 * Today's work, by topic. Each group opens to its steps; the topic you are on is
 * open already. A tick shows at once and rolls back if saving fails.
 */
export function TodayTasks({ tasks }: { tasks: TodayTask[] }) {
  const router = useRouter();
  const reduceMotion = useReducedMotionConfig();
  const [, start] = useTransition();
  const [opening, startOpening] = useTransition();
  const [shown, setShown] = useOptimistic(
    tasks,
    (state, change: { id: string; done: boolean }) =>
      state.map((t) => (t.id === change.id ? { ...t, done: change.done } : t)),
  );

  const groups = groupTasks(shown.filter((t) => !t.done));
  const done = shown.filter((t) => t.done);
  // The topic you are working through is open; the rest wait until you ask.
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const isOpen = (group: TaskGroup<TodayTask>, index: number) =>
    opened[group.key] ?? (index === 0 && !closed[group.key]);

  const toggleDone = (id: string, isDone: boolean) =>
    start(async () => {
      setShown({ id, done: isDone });
      const result = await setTaskDoneAction({ taskId: id, done: isDone });
      if (!result.ok) toast.error(result.error);
    });

  const openTest = (id: string) =>
    startOpening(async () => {
      const result = await startTaskTestAction({ id });
      if (!result.ok) return void toast.error(result.error);
      router.push(`/test/${result.testId}`);
    });

  const actionFor = (task: TodayTask): ReactNode =>
    task.test ? (
      <button
        type="button"
        className={iconButton}
        disabled={opening}
        aria-label={`Start ${task.title}`}
        onClick={() => openTest(task.id)}
      >
        <ClipboardCheck className="size-4" aria-hidden />
      </button>
    ) : task.timed ? (
      <Link
        href={`/study/${task.id}`}
        className={iconButton}
        aria-label={`Start ${task.title}`}
      >
        <Play className="size-4" aria-hidden />
      </Link>
    ) : null;

  const transition = {
    duration: reduceMotion ? 0 : 0.2,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:block lg:columns-2 lg:gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {groups.map((group, index) => {
            const open = isOpen(group, index);
            return (
              <motion.div
                key={group.key}
                layout={!reduceMotion}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={transition}
                className="break-inside-avoid lg:mb-3"
              >
                <Card className="overflow-hidden">
                  <div className="flex items-center pr-1">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => {
                        setOpened((o) => ({ ...o, [group.key]: !open }));
                        setClosed((c) => ({ ...c, [group.key]: true }));
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-control px-3 py-3 text-left transition-colors duration-[120ms] hover:bg-surface-muted"
                    >
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 text-ink-subtle transition-transform duration-[200ms]",
                          open && "rotate-90",
                        )}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body font-medium text-ink">
                          {group.title}
                        </span>
                        <span className="truncate text-small text-ink-muted">
                          {group.subject} · {group.left} left
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-small text-ink-muted tabular-nums">
                        {group.minutes}m
                      </span>
                    </button>
                    {group.topicId ? (
                      <Link
                        href={`/pods/topic/${group.topicId}`}
                        className={iconButton}
                        aria-label={`Open the pod for ${group.title}`}
                      >
                        <FolderOpen className="size-4" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                  {open ? (
                    <div className="border-t border-border p-1.5">
                      {group.tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          label={task.step}
                          task={task}
                          action={actionFor(task)}
                          onDoneChange={toggleDone}
                        />
                      ))}
                    </div>
                  ) : null}
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {done.length > 0 ? (
        <motion.section
          layout={!reduceMotion}
          transition={transition}
          aria-label="Done"
          className="flex flex-col gap-1"
        >
          <h3 className="px-1 text-micro text-ink-muted uppercase">
            Done · {done.length}
          </h3>
          <Card className="p-1.5">
            {done.map((task) => (
              <TaskRow
                key={task.id}
                label={task.topicName ?? task.title}
                sub={task.step}
                task={task}
                onDoneChange={toggleDone}
              />
            ))}
          </Card>
        </motion.section>
      ) : null}
    </div>
  );
}

function TaskRow({
  task,
  label,
  sub,
  action,
  onDoneChange,
}: {
  task: TodayTask;
  label: string;
  sub?: string;
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
          {label}
        </span>
        {sub ? (
          <span className="truncate text-small text-ink-muted">{sub}</span>
        ) : null}
      </label>
      <span
        className={cn(
          "shrink-0 font-mono text-small text-ink-muted tabular-nums",
          task.done && "mr-3",
        )}
      >
        {task.minutes}m
      </span>
      {task.done ? null : action}
    </div>
  );
}
