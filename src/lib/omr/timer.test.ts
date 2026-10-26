import { describe, expect, it } from "vitest";

import { clock, elapsedAt, face, start, viewAt } from "./timer";

const at = (s: number) => new Date(Date.UTC(2026, 9, 26, 4, 30, s));

describe("omr timer", () => {
  it("counts from the start and never stops", () => {
    const t = start(at(0), 75);
    expect(t.limitSec).toBe(4500);
    expect(elapsedAt(t, at(40))).toBe(40);
    expect(viewAt(t, at(59))).toEqual({
      on: true,
      limitSec: 4500,
      elapsedSec: 59,
      running: true,
    });
    expect(start(at(0), null).limitSec).toBeNull();
  });

  it("shows time left, then time over; with no limit, time used", () => {
    expect(face(4500, 0).text).toBe("1:15:00");
    expect(face(4500, 4500 - 61)).toEqual({ text: "01:01", over: false });
    expect(face(60, 75)).toEqual({ text: "+00:15", over: true });
    expect(face(null, 125)).toEqual({ text: "02:05", over: false });
    expect(clock(3600)).toBe("1:00:00");
  });
});
