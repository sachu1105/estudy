import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { addDays } from "@/lib/plan-engine";
import { formatDay, formatMinutes } from "@/lib/plans/format";

import { groupTasks } from "../group-tasks";
import { taskTitle } from "../task-text";
import { AddTaskButton } from "./add-task-button";
import { PlanTaskRow, type RowTask } from "./plan-task-row";

type DayTask = RowTask & { subjectId: string | null; topicId: string | null };

/**
 * A day of the plan, folded to one line that names its topics. Today opens by itself;
 * the rest open on a tap. Inside, tasks sit under their topic, so a day
 * reads as "these topics", not as twenty near-identical rows. Rest days say so; nothing
 * is ever shown as overdue (rule 7).
 */
export function PlanDay({
  date,
  today,
  phase,
  plannedMinutes,
  tasks,
  subjectNames,
  topicNames,
  editing = null,
}: {
  date: string;
  today: string;
  phase: "LEARN" | "REVIEW";
  plannedMinutes: number;
  tasks: DayTask[];
  subjectNames: Map<string, string>;
  topicNames: Map<string, string>;
  /** On an active plan, from today on: hand edits and tasks of the user's own. */
  editing?: { syllabusId: string; end: string } | null;
}) {
  const near =
    date === today ? "Today" : date === addDays(today, 1) ? "Tomorrow" : null;
  const label = near ?? formatDay(date, false);
  const canEdit = editing !== null && date >= today;
  const subjectOf = (t: DayTask) =>
    t.type === "FULL_MOCK"
      ? "Every subject"
      : t.type === "CUSTOM"
        ? "Your task"
        : (t.subjectId && subjectNames.get(t.subjectId)) || "Subject";
  const groups = groupTasks(
    tasks.map((t) => {
      const topicName = (t.topicId && topicNames.get(t.topicId)) || null;
      return {
        ...t,
        title: taskTitle(t, topicName ?? "Topic", subjectOf(t)),
        topicName,
        subject: subjectOf(t),
        done: false,
      };
    }),
  );
  const preview =
    groups.length === 0
      ? "Rest, or read ahead in a pod"
      : groups.length <= 3
        ? groups.map((g) => g.title).join(", ")
        : `${groups
            .slice(0, 2)
            .map((g) => g.title)
            .join(", ")} and ${groups.length - 2} more`;

  return (
    <section aria-label={label}>
      <details
        open={date === today}
        className="group rounded-card border border-border bg-surface"
      >
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-card px-4 py-3 transition-colors duration-[120ms] hover:bg-surface-muted/60 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-baseline gap-2">
              <span className="font-heading text-h3 font-medium">{label}</span>
              {near ? (
                <span className="text-small text-ink-muted">
                  {formatDay(date, false)}
                </span>
              ) : null}
            </span>
            <span className="truncate text-small text-ink-muted group-open:hidden">
              {preview}
            </span>
          </span>
          {phase === "REVIEW" ? <Badge>Review</Badge> : null}
          <span className="shrink-0 font-mono text-small text-ink-muted tabular-nums">
            {plannedMinutes ? formatMinutes(plannedMinutes) : "Rest day"}
          </span>
          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 text-ink-subtle transition-transform duration-[200ms] group-open:rotate-180"
          />
        </summary>

        <div className="border-t border-border">
          {groups.length === 0 ? (
            <p className="px-4 py-3 text-small text-ink-muted">
              Nothing planned. Rest, or read ahead in a pod.
            </p>
          ) : (
            groups.map((g) => (
              <div
                key={g.key}
                className="border-b border-border py-1 last:border-b-0"
              >
                {g.topicId && g.tasks.length > 1 ? (
                  <p className="flex items-baseline justify-between gap-3 px-4 pt-2">
                    <span className="truncate text-small font-medium text-ink">
                      {g.title}
                    </span>
                    <span className="shrink-0 truncate text-small text-ink-muted">
                      {g.subject}
                    </span>
                  </p>
                ) : null}
                <ol>
                  {g.tasks.map((t) => (
                    <PlanTaskRow
                      key={t.id}
                      task={t}
                      topic={t.topicName ?? "Topic"}
                      subject={t.subject}
                      show={
                        !g.topicId
                          ? "title"
                          : g.tasks.length > 1
                            ? "step"
                            : "topic"
                      }
                      editing={
                        canEdit && editing
                          ? { date, today, end: editing.end }
                          : null
                      }
                    />
                  ))}
                </ol>
              </div>
            ))
          )}
          {canEdit && editing ? (
            <div className="border-t border-border px-2 py-1">
              <AddTaskButton
                syllabusId={editing.syllabusId}
                date={date}
                dayLabel={near ? near.toLowerCase() : label}
              />
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
