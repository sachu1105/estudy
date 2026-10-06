"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toast";

import { setTopicDoneAction } from "../actions";

type Topic = { id: string; name: string; done: boolean; items: number };

/**
 * The pod's topics with a tick each. Optimistic: the tick shows at once and rolls back
 * if saving fails (friction rules).
 */
export function TopicChecklist({
  podId,
  topics,
}: {
  podId: string;
  topics: Topic[];
}) {
  const [, start] = useTransition();
  const [shown, setShown] = useOptimistic(
    topics,
    (state, change: { id: string; done: boolean }) =>
      state.map((t) => (t.id === change.id ? { ...t, done: change.done } : t)),
  );

  const toggle = (topic: Topic, done: boolean) =>
    start(async () => {
      setShown({ id: topic.id, done });
      const result = await setTopicDoneAction({
        podId,
        topicId: topic.id,
        done,
      });
      if (!result.ok) toast.error(result.error);
    });

  return (
    <ol className="divide-y divide-border rounded-card border border-border bg-surface">
      {shown.map((topic) => (
        <li key={topic.id} className="flex items-center gap-1 pr-2">
          <label className="grid size-11 shrink-0 cursor-pointer place-items-center pl-2">
            <Checkbox
              tone="success"
              checked={topic.done}
              onCheckedChange={(v) => toggle(topic, v === true)}
              aria-label={`${topic.name} done`}
            />
          </label>
          <Link
            href={`/pods/${podId}/topics/${topic.id}`}
            className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-control px-2 py-2 hover:bg-surface-muted"
          >
            <span
              className={
                topic.done
                  ? "min-w-0 flex-1 text-body break-words text-ink-muted line-through decoration-ink-subtle"
                  : "min-w-0 flex-1 text-body break-words"
              }
            >
              {topic.name}
            </span>
            {topic.items > 0 ? (
              <span className="shrink-0 text-small text-ink-muted">
                {topic.items} item{topic.items === 1 ? "" : "s"}
              </span>
            ) : null}
            <ChevronRight
              className="size-4 shrink-0 text-ink-muted"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}
