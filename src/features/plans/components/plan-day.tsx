import { Badge } from "@/components/ui/badge";
import { addDays } from "@/lib/plan-engine";
import { formatDay, formatMinutes } from "@/lib/plans/format";

import { PlanTaskRow, type RowTask } from "./plan-task-row";

/** A day of the plan. Rest days say so; nothing is ever shown as overdue (rule 7). */
export function PlanDay({
  date,
  today,
  phase,
  plannedMinutes,
  tasks,
  subjectNames,
  topicNames,
}: {
  date: string;
  today: string;
  phase: "LEARN" | "REVIEW";
  plannedMinutes: number;
  tasks: (RowTask & { subjectId: string | null; topicId: string | null })[];
  subjectNames: Map<string, string>;
  topicNames: Map<string, string>;
}) {
  const label =
    date === today
      ? "Today"
      : date === addDays(today, 1)
        ? "Tomorrow"
        : formatDay(date, false);
  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-h3">
          {label}
          {label === "Today" || label === "Tomorrow" ? (
            <span className="ml-2 text-small font-normal text-ink-muted">
              {formatDay(date, false)}
            </span>
          ) : null}
        </h3>
        <span className="flex items-center gap-2 text-small text-ink-muted">
          {phase === "REVIEW" ? <Badge>Review</Badge> : null}
          <span className="font-mono tabular-nums">
            {plannedMinutes ? formatMinutes(plannedMinutes) : "Rest day"}
          </span>
        </span>
      </div>
      {tasks.length > 0 ? (
        <ol className="divide-y divide-border rounded-card border border-border bg-surface">
          {tasks.map((t) => (
            <PlanTaskRow
              key={t.id}
              task={t}
              topic={(t.topicId && topicNames.get(t.topicId)) || "Topic"}
              subject={
                (t.subjectId && subjectNames.get(t.subjectId)) || "Subject"
              }
            />
          ))}
        </ol>
      ) : (
        <p className="rounded-card border border-dashed border-border p-4 text-small text-ink-muted">
          Nothing planned. Rest, or read ahead in a pod.
        </p>
      )}
    </section>
  );
}
