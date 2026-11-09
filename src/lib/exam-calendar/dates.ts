// Dates as programmes print them (dd/mm/yyyy), as the app keeps them (yyyy-mm-dd).

const DMY = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/g;

/** "05/07/2024" -> "2024-07-05", or null when it isn't a real date. */
export function isoFromDmy(day: string, month: string, year: string) {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || y < 2000 || y > 2100) return null;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > last) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Every dd/mm/yyyy date in some text, in order, as ISO dates. */
export function datesIn(text: string): string[] {
  const found: string[] = [];
  for (const [, d, m, y] of text.matchAll(DMY)) {
    const iso = isoFromDmy(d!, m!, y!);
    if (iso) found.push(iso);
  }
  return found;
}

/** The text without its dd/mm/yyyy dates. */
export const withoutDates = (text: string) => text.replace(DMY, " ");

const MONTHS = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

/** "JANUARY", "2027" -> "2027-01-01". */
export function monthStart(name: string, year: string) {
  const i = MONTHS.indexOf(name.toUpperCase());
  return i === -1 ? null : `${year}-${String(i + 1).padStart(2, "0")}-01`;
}

/** Days from one ISO date to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}
