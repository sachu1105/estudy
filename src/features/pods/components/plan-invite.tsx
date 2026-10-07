import { CalendarClock, Gauge, Layers } from "lucide-react";

import { StartPlanButton } from "@/features/plans/components/start-plan-button";

const steps = [
  {
    icon: CalendarClock,
    text: "Your exam date and the time you have each day",
  },
  { icon: Gauge, text: "How well you know each subject, 1 to 5" },
  { icon: Layers, text: "How hard to push each one: light, steady or intense" },
];

/** The Plan tab before there is a plan: what it's built from, and the way in. */
export function PlanInvite({
  syllabusId,
  draft,
}: {
  syllabusId: string;
  /** Setup was started; everything entered is saved. */
  draft: boolean;
}) {
  return (
    <section
      aria-labelledby="plan-invite"
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 md:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="plan-invite" className="text-h2">
          {draft ? "Finish setting up your plan" : "Make a day-by-day plan"}
        </h2>
        <p className="text-body text-ink-muted">
          {draft
            ? "Everything you entered is saved. Pick up where you left off."
            : "Built from these subjects, in your board's order. Four short steps, and you can change any of it later."}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {steps.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-body">
            <span className="grid size-8 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="pt-1">{text}</span>
          </li>
        ))}
      </ul>
      <div>
        <StartPlanButton
          syllabusId={syllabusId}
          label={draft ? "Continue setting up" : "Create study plan"}
        />
      </div>
    </section>
  );
}
