"use client";

import { ChevronRight, Paperclip } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

import { setTopicDoneAction } from "../actions";

type Topic = { id: string; name: string; done: boolean; items: number };
type Filter = "all" | "todo" | "done";

/**
 * The pod's topics with a tick each, numbered in syllabus order. A filter narrows a long
 * syllabus to what is left (or done). Optimistic: the tick shows at once and rolls back if
 * saving fails (friction rules).
 */
export function TopicChecklist({
  podId,
  topics,
  action,
}: {
  podId: string;
  topics: Topic[];
  /** Sits beside the filter, e.g. "Edit topics". */
  action?: ReactNode;
}) {
  const [, start] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
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

  const done = shown.filter((t) => t.done).length;
  const count = (label: string, n: number) => (
    <>
      {label}
      <span className="font-mono text-ink-muted tabular-nums">{n}</span>
    </>
  );
  // Numbers follow the syllabus, so a filtered list keeps each topic's own number.
  const visible = shown
    .map((topic, index) => ({ topic, number: index + 1 }))
    .filter(({ topic }) =>
      filter === "all" ? true : filter === "done" ? topic.done : !topic.done,
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={filter}
          onValueChange={setFilter}
          ariaLabel="Show topics"
          options={[
            { value: "all", label: count("All", shown.length) },
            { value: "todo", label: count("To do", shown.length - done) },
            { value: "done", label: count("Done", done) },
          ]}
        />
        {action}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-card border border-border px-4 py-6 text-center text-body text-ink-muted">
          {filter === "done"
            ? "Nothing ticked yet. Tick a topic once you've covered it."
            : "Every topic is done. Revise from the Tests tab."}
        </p>
      ) : (
        <ol className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {visible.map(({ topic, number }) => (
            <li key={topic.id} className="group flex items-center gap-1 pr-2">
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
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-control px-2 py-2 transition-colors duration-[120ms] hover:bg-surface-muted/60"
              >
                <span
                  aria-hidden
                  className="w-6 shrink-0 font-mono text-small text-ink-muted tabular-nums"
                >
                  {String(number).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-body break-words",
                    topic.done &&
                      "text-ink-muted line-through decoration-ink-subtle",
                  )}
                >
                  {topic.name}
                </span>
                {topic.items > 0 ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-chip bg-accent-soft px-1.5 py-0.5 text-small text-accent-ink"
                    aria-label={`${topic.items} item${topic.items === 1 ? "" : "s"} of material`}
                  >
                    <Paperclip className="size-3.5" aria-hidden />
                    <span className="font-mono tabular-nums">
                      {topic.items}
                    </span>
                  </span>
                ) : null}
                <ChevronRight
                  className="size-4 shrink-0 text-ink-muted transition-transform duration-[120ms] group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
