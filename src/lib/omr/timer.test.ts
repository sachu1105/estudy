import { describe, expect, it } from "vitest";

import { OFF, clock, elapsedAt, face, pause, resume, start } from "./timer";

const at = (s: number) => new Date(Date.UTC(2026, 9, 26, 4, 30, s));

describe("omr timer", () => {
  it("counts from the start, stops while paused, and picks up again", () => {
    let t = start(at(0), 75);
    expect(t.limitSec).toBe(4500);
    expect(elapsedAt(t, at(40))).toBe(40);
    t = pause(t, at(40));
    expect(elapsedAt(t, at(59))).toBe(40);
    expect(pause(t, at(59))).toBe(t);
    t = resume(t, at(50));
    expect(elapsedAt(t, at(55))).toBe(45);
    expect(resume(t, at(57))).toBe(t);
    expect(pause(OFF, at(1))).toBe(OFF);
  });

  it("shows time left, then time over; with no limit, time used", () => {
    expect(face(4500, 0).text).toBe("1:15:00");
    expect(face(4500, 4500 - 61)).toEqual({ text: "01:01", over: false });
    expect(face(60, 75)).toEqual({ text: "+00:15", over: true });
    expect(face(null, 125)).toEqual({ text: "02:05", over: false });
    expect(clock(3600)).toBe("1:00:00");
  });
});
