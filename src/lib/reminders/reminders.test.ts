import { describe, expect, it } from "vitest";

import {
  inQuietHours,
  minutesOf,
  remindersDue,
  STREAK_HOUR_MIN,
  timeOf,
  type Facts,
  type Prefs,
} from "./reminders";

const prefs: Prefs = {
  sessionReminder: true,
  streakAtRisk: true,
  weeklySummary: true,
  byEmail: true,
  byPush: true,
  windowStartMin: 19 * 60,
  quietFromMin: 22 * 60,
  quietToMin: 7 * 60,
};

const facts: Facts = {
  nowMin: 19 * 60,
  weekday: 3,
  studiedToday: false,
  streak: 4,
  weeklyReady: false,
  sentToday: [],
};

describe("reminders", () => {
  it("sends the session reminder at the start of the chosen window", () => {
    expect(remindersDue(prefs, facts)).toEqual(["SESSION"]);
    // Only within the window: an hour late is too late to be useful.
    expect(remindersDue(prefs, { ...facts, nowMin: 19 * 60 + 29 })).toEqual([
      "SESSION",
    ]);
    expect(remindersDue(prefs, { ...facts, nowMin: 19 * 60 + 31 })).toEqual([]);
    expect(remindersDue(prefs, { ...facts, nowMin: 18 * 60 })).toEqual([]);
  });

  it("stays quiet when the person has already studied", () => {
    expect(remindersDue(prefs, { ...facts, studiedToday: true })).toEqual([]);
    expect(
      remindersDue(prefs, {
        ...facts,
        nowMin: STREAK_HOUR_MIN,
        studiedToday: true,
      }),
    ).toEqual([]);
  });

  it("warns about the streak in the evening, once, and only if there is one", () => {
    const evening = { ...facts, nowMin: STREAK_HOUR_MIN };
    expect(remindersDue(prefs, evening)).toEqual(["STREAK"]);
    expect(remindersDue(prefs, { ...evening, streak: 0 })).toEqual([]);
    expect(remindersDue(prefs, { ...evening, sentToday: ["STREAK"] })).toEqual(
      [],
    );
  });

  it("announces the weekly summary on Monday, with the session reminder", () => {
    const monday = { ...facts, weekday: 1, weeklyReady: true };
    expect(remindersDue(prefs, monday)).toEqual(["WEEKLY", "SESSION"]);
    expect(remindersDue(prefs, { ...monday, weekday: 2 })).toEqual(["SESSION"]);
  });

  it("holds everything back during quiet hours, including over midnight", () => {
    expect(inQuietHours(23 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(inQuietHours(2 * 60, 22 * 60, 7 * 60)).toBe(true);
    expect(inQuietHours(9 * 60, 22 * 60, 7 * 60)).toBe(false);
    expect(inQuietHours(13 * 60, 12 * 60, 14 * 60)).toBe(true);
    expect(inQuietHours(9 * 60, 9 * 60, 9 * 60)).toBe(false);
    const late = { ...prefs, windowStartMin: 23 * 60 };
    expect(remindersDue(late, { ...facts, nowMin: 23 * 60 })).toEqual([]);
  });

  it("sends nothing when every switch is off", () => {
    expect(
      remindersDue({ ...prefs, byEmail: false, byPush: false }, facts),
    ).toEqual([]);
    expect(remindersDue({ ...prefs, sessionReminder: false }, facts)).toEqual(
      [],
    );
  });

  it("reads and writes times", () => {
    expect(minutesOf("19:30")).toBe(19 * 60 + 30);
    expect(minutesOf("24:00")).toBeNull();
    expect(minutesOf("bad")).toBeNull();
    expect(timeOf(19 * 60 + 5)).toBe("19:05");
  });
});
