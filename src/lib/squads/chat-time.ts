// Times and days for chat, built from numeric date parts so the server and the browser
// write exactly the same text (no locale differences, no hydration mismatch).

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parts(at: Date, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(at))
    if (p.type !== "literal") out[p.type] = Number(p.value);
  return out as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  };
}

/** "4:05 pm" in the person's time zone. */
export function clockTime(at: Date, timeZone: string) {
  const { hour, minute } = parts(at, timeZone);
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

/** The calendar day in the person's time zone, as "2026-10-07". */
export function dayKey(at: Date, timeZone: string) {
  const { year, month, day } = parts(at, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "Today", "Yesterday", or "7 Oct" (with the year when it isn't this year). */
export function dayLabel(at: Date, now: Date, timeZone: string) {
  const key = dayKey(at, timeZone);
  if (key === dayKey(now, timeZone)) return "Today";
  if (key === dayKey(new Date(now.getTime() - 86_400_000), timeZone))
    return "Yesterday";
  const { year, month, day } = parts(at, timeZone);
  const thisYear = parts(now, timeZone).year;
  return `${day} ${MONTHS[month - 1]}${year === thisYear ? "" : ` ${year}`}`;
}

/** A message joins the one above when the same person sent it within five minutes. */
export function continues(
  prev: { authorId: string; at: string } | undefined,
  next: { authorId: string; at: string },
  timeZone: string,
) {
  if (!prev || prev.authorId !== next.authorId) return false;
  const a = new Date(prev.at);
  const b = new Date(next.at);
  return (
    b.getTime() - a.getTime() < 5 * 60_000 &&
    dayKey(a, timeZone) === dayKey(b, timeZone)
  );
}
