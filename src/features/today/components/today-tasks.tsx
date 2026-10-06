"use client";

import { FolderOpen, Play } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";

import { TaskList } from "@/components/blocks/task-list";
import { toast } from "@/components/ui/toast";

import { setTaskDoneAction } from "../actions";

export type TodayTask = {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  done: boolean;
  topicId: string | null;
  /** Study and revision run as a timed session; tests come with milestone 8. */
  timed: boolean;
};

const icon =
  "grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface hover:text-ink md:size-9";

/** Today's tasks. A tick shows at once and rolls back if saving fails. */
export function TodayTasks({ tasks }: { tasks: TodayTask[] }) {
  const [, start] = useTransition();
  const [shown, setShown] = useOptimistic(
    tasks,
    (state, change: { id: string; done: boolean }) =>
      state.map((t) => (t.id === change.id ? { ...t, done: change.done } : t)),
  );

  const toggle = (id: string, done: boolean) =>
    start(async () => {
      setShown({ id, done });
      const result = await setTaskDoneAction({ taskId: id, done });
      if (!result.ok) toast.error(result.error);
    });

  return (
    <TaskList
      onDoneChange={toggle}
      tasks={shown.map((t) => ({
        ...t,
        actions: (
          <span className="flex">
            {t.timed && !t.done ? (
              <Link
                href={`/study/${t.id}`}
                className={icon}
                aria-label={`Start ${t.title}`}
              >
                <Play className="size-4" aria-hidden />
              </Link>
            ) : null}
            {t.topicId ? (
              <Link
                href={`/pods/topic/${t.topicId}`}
                className={icon}
                aria-label={`Open the pod for ${t.title}`}
              >
                <FolderOpen className="size-4" aria-hidden />
              </Link>
            ) : null}
          </span>
        ),
      }))}
    />
  );
}
