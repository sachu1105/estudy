import { formatDay, formatMinutes } from "@/lib/plans/format";

/**
 * Minutes per day, 30 days: single-colour bars, no gridlines (milestone 12). Screen
 * readers get a summary and the numbers as a table.
 */
export function MinutesChart({
  days,
}: {
  days: { day: string; minutes: number }[];
}) {
  const max = Math.max(60, ...days.map((d) => d.minutes));
  const total = days.reduce((n, d) => n + d.minutes, 0);
  const studied = days.filter((d) => d.minutes > 0).length;
  return (
    <figure className="flex flex-col gap-3">
      <div
        className="flex h-32 items-end gap-[3px]"
        role="img"
        aria-label={`${formatMinutes(total)} over the last 30 days, on ${studied} days.`}
      >
        {days.map((d) => (
          <span
            key={d.day}
            title={`${formatDay(d.day, false)}: ${formatMinutes(d.minutes)}`}
            className="min-w-0 flex-1 rounded-t-[3px] bg-accent"
            style={{
              height: `${Math.max(d.minutes > 0 ? 4 : 1, (d.minutes / max) * 100)}%`,
              opacity: d.minutes > 0 ? 1 : 0.15,
            }}
          />
        ))}
      </div>
      <figcaption className="flex justify-between text-small text-ink-muted">
        <span>{formatDay(days[0]!.day, false)}</span>
        <span>
          {formatMinutes(total)} in all, {studied} of 30 days
        </span>
        <span>Today</span>
      </figcaption>
      <table className="sr-only">
        <caption>Minutes studied per day</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{formatDay(d.day, false)}</th>
              <td>{d.minutes} minutes</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
