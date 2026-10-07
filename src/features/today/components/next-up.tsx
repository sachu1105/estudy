"use client";

import { Clock, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { startTaskTestAction } from "@/features/tests/actions";

import type { TodayTask } from "./today-tasks";

/**
 * The one thing to do now. Today's only filled accent button lives here, so opening
 * the app answers "what next?" before the list is read at all.
 */
export function NextUp({ task }: { task: TodayTask }) {
  const router = useRouter();
  const [opening, start] = useTransition();
  const openTest = () =>
    start(async () => {
      const result = await startTaskTestAction({ id: task.id });
      if (!result.ok) return void toast.error(result.error);
      router.push(`/test/${result.testId}`);
    });

  return (
    <Card className="flex flex-col gap-4 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-micro text-accent-ink uppercase">Next up</span>
        <h2 className="text-h2 text-ink">{task.topicName ?? task.title}</h2>
        <p className="flex flex-wrap items-center gap-x-2 text-small text-ink-muted">
          <span>{task.subject}</span>
          <span aria-hidden>·</span>
          <span>{task.step}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {task.timed ? (
          <Button asChild variant="primary" aria-label="Start next task">
            <Link href={`/study/${task.id}`}>
              <Play aria-hidden />
              Start
            </Link>
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={openTest}
            disabled={opening}
            aria-label={`Start ${task.title}`}
          >
            <Play aria-hidden />
            Start
          </Button>
        )}
        <span className="flex items-center gap-1.5 font-mono text-small text-ink-muted tabular-nums">
          <Clock className="size-3.5" aria-hidden />
          {task.minutes} min
        </span>
      </div>
    </Card>
  );
}
