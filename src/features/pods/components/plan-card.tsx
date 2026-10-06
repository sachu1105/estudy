import { CalendarClock, Gauge, Layers, ListChecks } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StartPlanButton } from "@/features/plans/components/start-plan-button";
import { formatDay } from "@/lib/plans/format";

const steps = [
  {
    icon: CalendarClock,
    text: "Your exam date and the time you have each day",
  },
  { icon: Gauge, text: "How well you know each subject, 1 to 5" },
  { icon: Layers, text: "How hard to push each one: light, steady or intense" },
];

export type ExamPlanState =
  | { kind: "none" }
  | { kind: "draft" }
  | { kind: "active"; planId: string; endDate: string; plannedMinutes: number };

/** The exam's study plan: open it, finish setting it up, or start one. */
export function PlanCard({
  syllabusId,
  state,
}: {
  syllabusId: string;
  state: ExamPlanState;
}) {
  return (
    <section
      aria-labelledby="plan-card"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
          <ListChecks className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id="plan-card" className="text-h3">
            Study plan
          </h2>
          <p className="text-body text-ink-muted">
            {state.kind === "active"
              ? `Runs until ${formatDay(state.endDate)}, ${Math.round(state.plannedMinutes / 60)} hours in all. Ticked topics and test scores change next week's plan.`
              : state.kind === "draft"
                ? "You started setting up a plan. Everything you entered is saved."
                : "A day-by-day plan made from the subjects below, in your board's order."}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {state.kind === "active" ? (
            <>
              <Button asChild variant="primary" className="flex-1 sm:flex-none">
                <Link href={`/plan/${state.planId}`}>Open plan</Link>
              </Button>
              <StartPlanButton
                syllabusId={syllabusId}
                label="Change"
                variant="secondary"
              />
            </>
          ) : (
            <StartPlanButton
              syllabusId={syllabusId}
              label={
                state.kind === "draft"
                  ? "Continue setting up"
                  : "Create study plan"
              }
            />
          )}
        </div>
      </div>
      {state.kind === "none" ? (
        <ul className="grid grid-cols-1 gap-2 border-t border-border pt-4 lg:grid-cols-3 lg:gap-4">
          {steps.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-body">
              <Icon
                className="mt-1 size-4 shrink-0 text-ink-muted"
                aria-hidden
              />
              {text}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
