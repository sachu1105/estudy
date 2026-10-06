import Link from "next/link";

import type { TaskReason } from "@/lib/plan-engine";
import { formatDay, formatMinutes } from "@/lib/plans/format";

import { taskTitle, whyThis, type TaskLike } from "../task-text";

type Task = TaskLike & {
  id: string;
  planId: string;
  date: string;
  minutes: number;
  reason: unknown;
};

/** "In your plan" on a topic page: when it comes up next, and why (rule 14). */
export function TopicPlan({
  tasks,
  topic,
  subject,
}: {
  tasks: Task[];
  topic: string;
  subject: string;
}) {
  return (
    <section aria-labelledby="topic-plan" className="mb-8 flex flex-col gap-3">
      <h2 id="topic-plan" className="text-h3">
        In your plan
      </h2>
      {tasks.length === 0 ? (
        <p className="text-body text-ink-muted">
          Nothing planned for it from today: it&apos;s done, left out, or
          there&apos;s no plan yet.
        </p>
      ) : (
        <ol className="divide-y divide-border rounded-card border border-border bg-surface">
          {tasks.map((t) => (
            <li key={t.id} className="flex flex-col gap-1 px-3 py-3">
              <div className="flex items-baseline gap-3">
                <span className="w-24 shrink-0 text-small text-ink-muted">
                  {formatDay(t.date, false)}
                </span>
                <Link
                  href={`/plan/${t.planId}?from=${t.date}#days`}
                  className="min-w-0 flex-1 text-body break-words hover:text-accent-ink"
                >
                  {taskTitle(t, topic, subject)}
                </Link>
                <span className="shrink-0 font-mono text-small text-ink-muted tabular-nums">
                  {formatMinutes(t.minutes)}
                </span>
              </div>
              <details className="ml-27">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-small font-medium text-accent-ink md:min-h-0">
                  Why this?
                </summary>
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-small text-ink-muted">
                  {whyThis(t.reason as TaskReason, subject).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
