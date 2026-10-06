import { Check } from "lucide-react";
import Link from "next/link";

import { formatMinutes } from "@/lib/plans/format";
import { cn } from "@/lib/utils/cn";

/** A minutes bar is full at this many planned minutes. */
const FULL_DAY = 240;

/**
 * One day on the calendar. A day ahead shows its planned time and opens that week of the
 * plan; a past day shows only what got done (rule 7: nothing missed is ever shown).
 */
export function CalendarDay({
  date,
  today,
  planned,
  done,
}: {
  date: string;
  today: string;
  planned: { planId: string; minutes: number; tasks: number } | undefined;
  done: number;
}) {
  const past = date < today;
  const isToday = date === today;
  const ahead = planned && !past ? planned : null;
  const label = [
    new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`)),
    ahead
      ? `${formatMinutes(ahead.minutes)} planned, ${ahead.tasks} tasks`
      : null,
    done > 0 ? `${done} done` : null,
  ]
    .filter(Boolean)
    .join(": ");

  const body = (
    <>
      <span
        className={cn(
          "text-small md:text-body",
          isToday && "font-semibold text-accent-ink",
        )}
      >
        {Number(date.slice(8))}
      </span>
      {ahead && ahead.minutes > 0 ? (
        <>
          <span
            aria-hidden
            className="mt-auto h-1.5 w-full rounded-full bg-accent-soft md:hidden"
          >
            <span
              className="block h-full rounded-full bg-accent"
              style={{
                width: `${Math.min(100, (ahead.minutes / FULL_DAY) * 100)}%`,
              }}
            />
          </span>
          <span className="mt-auto hidden font-mono text-small text-ink-muted tabular-nums md:block">
            {formatMinutes(ahead.minutes)}
          </span>
        </>
      ) : null}
      {done > 0 ? (
        <span className="mt-auto flex items-center gap-0.5 text-small text-success">
          <Check className="size-3.5" aria-hidden />
          <span className="hidden md:inline">{done}</span>
        </span>
      ) : null}
    </>
  );
  const cell = cn(
    "flex min-h-14 flex-col items-start gap-1 rounded-control p-1.5 md:min-h-20 md:p-2",
    isToday && "ring-2 ring-accent",
    ahead && "bg-surface-muted/60 hover:bg-surface-muted",
  );
  return ahead ? (
    <Link
      href={`/plan/${ahead.planId}?from=${date}#days`}
      aria-label={label}
      className={cell}
    >
      {body}
    </Link>
  ) : (
    <div aria-label={label} className={cell}>
      {body}
    </div>
  );
}
