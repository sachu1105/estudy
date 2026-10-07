const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** "just now", "5 min ago", "3 h ago", then a date. `now` is passed in (rule 12). */
export function timeAgo(at: Date, now: Date, timeZone = "Asia/Kolkata") {
  const ms = now.getTime() - at.getTime();
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} min ago`;
  if (ms < 24 * HOUR) return `${Math.floor(ms / HOUR)} h ago`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(at);
}
