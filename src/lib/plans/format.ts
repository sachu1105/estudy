/** "Sat, 9 Jan 2027" for a calendar day. The day is a date, not an instant: read it in UTC. */
export function formatDay(iso: string, withYear = true) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** 90 -> "1 h 30 min", 60 -> "1 h", 25 -> "25 min". */
export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
