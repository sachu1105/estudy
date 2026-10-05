// The only place allowed to read the system time (CLAUDE.md rule 12).
// Services and the plan engine receive a Clock, or a `today` string derived from one.

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export interface FixedClock extends Clock {
  set(at: Date | string): void;
  advance(ms: number): void;
}

/** A controllable clock for tests and fixtures. */
export function fixedClock(at: Date | string): FixedClock {
  let current = new Date(at).getTime();
  return {
    now: () => new Date(current),
    set: (next) => {
      current = new Date(next).getTime();
    },
    advance: (ms) => {
      current += ms;
    },
  };
}

/** Calendar date ("YYYY-MM-DD") of an instant in a timezone. */
export function toLocalDate(
  instant: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** "Today" for a user, in their timezone. */
export function today(
  clock: Clock,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return toLocalDate(clock.now(), timeZone);
}
