import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { addDays, toDay, weekdayOf } from "@/lib/plan-engine";

import { CalendarDay } from "./calendar-day";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const index = y! * 12 + (m! - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * A month of the plan, Monday first. Days ahead show planned time and open their week;
 * past days show only what got done, never what didn't (rule 7).
 */
export function PlanMonth({
  month,
  planHref,
  view,
}: {
  month: string;
  /** The exam's Plan tab. */
  planHref: string;
  view: {
    today: string;
    first: string;
    last: string;
    days: Map<string, { planId: string; minutes: number; tasks: number }>;
    done: Map<string, number>;
  };
}) {
  const title = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${view.first}T00:00:00Z`));
  const lead = (weekdayOf(toDay(view.first)) + 6) % 7;
  const count = toDay(view.last) - toDay(view.first) + 1;
  const dates = Array.from({ length: count }, (_, i) => addDays(view.first, i));
  const monthHref = (m: string) => `${planHref}?view=month&month=${m}`;

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <nav
        aria-label="Months"
        className="flex items-center justify-between gap-2"
      >
        <Button asChild variant="ghost" size="icon">
          <Link
            href={monthHref(shiftMonth(month, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <h2 className="text-h3">{title}</h2>
        <Button asChild variant="ghost" size="icon">
          <Link href={monthHref(shiftMonth(month, 1))} aria-label="Next month">
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </nav>
      <div className="rounded-card border border-border bg-surface p-2 md:p-4">
        <ol className="grid grid-cols-7 gap-1 md:gap-2" aria-label={title}>
          {WEEKDAYS.map((d) => (
            <li
              key={d}
              aria-hidden
              className="pb-1 text-center text-small text-ink-muted"
            >
              {d}
            </li>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <li key={`blank-${i}`} aria-hidden />
          ))}
          {dates.map((date) => (
            <li key={date}>
              <CalendarDay
                date={date}
                today={view.today}
                planned={view.days.get(date)}
                done={view.done.get(date) ?? 0}
                planHref={planHref}
              />
            </li>
          ))}
        </ol>
      </div>
      {view.days.size === 0 ? (
        <p className="text-small text-ink-muted">
          No study days planned this month.
        </p>
      ) : null}
    </section>
  );
}
