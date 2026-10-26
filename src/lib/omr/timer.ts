// The answer sheet's timer, as in the exam hall: started before the first answer, never
// paused, only reset. Pure: `now` is passed in (rule 12). Time runs on the server's
// clock, so a reload or a closed tab doesn't lose it.

export type TimerState = {
  on: boolean;
  /** Seconds to count down from; null counts up with no limit. */
  limitSec: number | null;
  /** Seconds banked by earlier runs, before the current one. */
  elapsedSec: number;
  /** When the clock started; null when it is off. */
  runningSince: Date | null;
};

/** Kerala PSC's OMR papers: 100 questions in 75 minutes. */
export const DEFAULT_LIMIT_MIN = 75;
export const LIMIT_CHOICES_MIN = [30, 60, 75, 90, 120] as const;
export const MAX_LIMIT_MIN = 300;

export const OFF: TimerState = {
  on: false,
  limitSec: null,
  elapsedSec: 0,
  runningSince: null,
};

export function elapsedAt(state: TimerState, now: Date) {
  const run = state.runningSince
    ? Math.max(
        0,
        Math.floor((now.getTime() - state.runningSince.getTime()) / 1000),
      )
    : 0;
  return state.elapsedSec + run;
}

/** The timer as the browser gets it: seconds used as of `now`, on the server's clock. */
export type TimerView = {
  on: boolean;
  limitSec: number | null;
  elapsedSec: number;
  running: boolean;
};

export function viewAt(state: TimerState, now: Date): TimerView {
  return {
    on: state.on,
    limitSec: state.limitSec,
    elapsedSec: elapsedAt(state, now),
    running: state.on && state.runningSince !== null,
  };
}

export function start(now: Date, limitMin: number | null): TimerState {
  return {
    on: true,
    limitSec: limitMin === null ? null : Math.round(limitMin * 60),
    elapsedSec: 0,
    runningSince: now,
  };
}

/** What the clock face shows: time left (or over) with a limit, time used without. */
export function face(limitSec: number | null, elapsedSec: number) {
  if (limitSec === null) return { text: clock(elapsedSec), over: false };
  const left = limitSec - elapsedSec;
  return left >= 0
    ? { text: clock(left), over: false }
    : { text: `+${clock(-left)}`, over: true };
}

/** 75:00, or 1:15:00 past an hour. */
export function clock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
