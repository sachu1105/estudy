import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { CalendarDay } from "@/features/plans/components/calendar-day";
import { addDays, toDay, weekdayOf } from "@/lib/plan-engine";
import { requireUser } from "@/server/auth/session";
import { progressService } from "@/server/services/progress";

export const metadata: Metadata = { title: "Calendar" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const index = y! * 12 + (m! - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Every study day of the month. Past days show what got done, never what didn't. */
export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const user = await requireUser();
  const query = await searchParams;
  const today = progressService.today(user);
  const month =
    typeof query.month === "string" && /^\d{4}-\d{2}$/.test(query.month)
      ? query.month
      : today.slice(0, 7);
  const view = await progressService.calendar(user, month);
  const title = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${view.first}T00:00:00Z`));
  // Monday-first grid: blanks before the 1st.
  const lead = (weekdayOf(toDay(view.first)) + 6) % 7;
  const count = toDay(view.last) - toDay(view.first) + 1;
  const dates = Array.from({ length: count }, (_, i) => addDays(view.first, i));

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Your plan's study time, day by day."
        actions={
          <nav aria-label="Months" className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon">
              <Link
                href={`/calendar?month=${shiftMonth(month, -1)}`}
                aria-label="Previous month"
              >
                <ChevronLeft aria-hidden />
              </Link>
            </Button>
            <span className="min-w-36 text-center font-heading text-h3 font-medium">
              {title}
            </span>
            <Button asChild variant="ghost" size="icon">
              <Link
                href={`/calendar?month=${shiftMonth(month, 1)}`}
                aria-label="Next month"
              >
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          </nav>
        }
      />
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
              />
            </li>
          ))}
        </ol>
      </div>
      {view.days.size === 0 ? (
        <p className="mt-4 text-body text-ink-muted">
          No study days this month.{" "}
          <Link
            href="/pods"
            className="font-medium text-accent-ink hover:underline"
          >
            Make a plan from an exam pod
          </Link>{" "}
          and they show up here.
        </p>
      ) : null}
    </>
  );
}
