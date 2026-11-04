"use client";

import { ClipboardCheck, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { toast } from "@/components/ui/toast";
import { startTaskTestAction } from "@/features/tests/actions";

import type { TodayTask } from "./today-tasks";

/** Opens a task's test in the player, or reports why it couldn't. */
function useOpenTest() {
  const router = useRouter();
  const [opening, start] = useTransition();
  const open = (id: string) =>
    start(async () => {
      const result = await startTaskTestAction({ id });
      if (!result.ok) return void toast.error(result.error);
      router.push(`/test/${result.testId}`);
    });
  return { opening, open };
}

/**
 * The way into a task: study and revision open a timed session, tests open the player.
 * `className` and `children` let each caller keep its own look.
 */
export function StartTask({
  task,
  className,
  children,
}: {
  task: TodayTask;
  className: string;
  children?: ReactNode;
}) {
  const { opening, open } = useOpenTest();
  if (task.test)
    return (
      <button
        type="button"
        className={className}
        disabled={opening}
        aria-label={`Start ${task.title}`}
        onClick={() => open(task.id)}
      >
        {children ?? <ClipboardCheck className="size-4" aria-hidden />}
      </button>
    );
  if (!task.timed) return null;
  return (
    <Link
      href={`/study/${task.id}`}
      className={className}
      aria-label={`Start ${task.title}`}
    >
      {children ?? (
        <Play className="size-3.5 translate-x-px fill-current" aria-hidden />
      )}
    </Link>
  );
}
