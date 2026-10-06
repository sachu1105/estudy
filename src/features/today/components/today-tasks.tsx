"use client";

import { ClipboardCheck, FolderOpen, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { TaskList } from "@/components/blocks/task-list";
import { toast } from "@/components/ui/toast";

import { startTaskTestAction } from "@/features/tests/actions";

import { setTaskDoneAction } from "../actions";

export type TodayTask = {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  done: boolean;
  topicId: string | null;
  /** Study and revision run as a timed session. */
  timed: boolean;
  /** Check tests and mocks open the test player. */
  test: boolean;
};

const icon =
  "grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface hover:text-ink md:size-9";

/** Today's tasks. A tick shows at once and rolls back if saving fails. */
export function TodayTasks({ tasks }: { tasks: TodayTask[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [opening, startOpening] = useTransition();
  const openTest = (id: string) =>
    startOpening(async () => {
      const result = await startTaskTestAction({ id });
      if (!result.ok) return void toast.error(result.error);
      router.push(`/test/${result.testId}`);
    });
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
            {t.test && !t.done ? (
              <button
                type="button"
                className={icon}
                disabled={opening}
                aria-label={`Start ${t.title}`}
                onClick={() => openTest(t.id)}
              >
                <ClipboardCheck className="size-4" aria-hidden />
              </button>
            ) : null}
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
