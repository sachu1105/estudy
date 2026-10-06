import { CalendarClock, Gauge, Layers, ListChecks } from "lucide-react";

const steps = [
  {
    icon: CalendarClock,
    text: "Your exam date and the time you have each day",
  },
  { icon: Gauge, text: "How well you know each subject, 1 to 5" },
  { icon: Layers, text: "How hard to push each one: light, steady or intense" },
];

/**
 * Where the study plan for an exam lives. The plan is built from these subject pods;
 * until it can be built, this says what it will ask for instead of offering a dead button.
 */
export function PlanCard() {
  return (
    <section
      aria-labelledby="plan-card"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
          <ListChecks className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="plan-card" className="text-h3">
            Study plan
          </h2>
          <p className="text-body text-ink-muted">
            A day-by-day plan made from the subjects below. Ticked topics and
            test scores change next week&apos;s plan. Coming soon.
          </p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-2 border-t border-border pt-4 lg:grid-cols-3 lg:gap-4">
        {steps.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-body">
            <Icon className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
