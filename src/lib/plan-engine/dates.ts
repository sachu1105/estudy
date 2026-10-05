// Calendar dates as integer day numbers (days since 1970-01-01), with no Date objects and no
// timezones. The engine never reads a clock: `today` arrives as a "YYYY-MM-DD" string.
// Algorithms from Howard Hinnant's "chrono-compatible low-level date algorithms".

export type IsoDate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysFromCivil(y: number, m: number, d: number) {
  const year = m <= 2 ? y - 1 : y;
  const era = Math.floor(year / 400);
  const yoe = year - era * 400;
  const mp = (m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** "2026-10-05" -> day number. Throws on malformed or impossible dates. */
export function toDay(iso: IsoDate): number {
  const match = ISO.exec(iso);
  if (!match) throw new Error(`Invalid date: ${iso}`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const day = daysFromCivil(y, m, d);
  if (fromDay(day) !== iso) throw new Error(`Invalid date: ${iso}`);
  return day;
}

/** Day number -> "YYYY-MM-DD". */
export function fromDay(day: number): IsoDate {
  const z = day + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe -
      Math.floor(doe / 1460) +
      Math.floor(doe / 36524) -
      Math.floor(doe / 146096)) /
      365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function isValidIsoDate(iso: string) {
  try {
    toDay(iso);
    return true;
  } catch {
    return false;
  }
}

/** 0 = Sunday ... 6 = Saturday. 1970-01-01 was a Thursday. */
export function weekdayOf(day: number) {
  return (((day + 4) % 7) + 7) % 7;
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromDay(toDay(iso) + days);
}
