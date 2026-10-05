import { describe, expect, it } from "vitest";

import { fixedClock, toLocalDate, today } from "./clock";

describe("clock", () => {
  it("fixed clock returns the set instant and advances", () => {
    const clock = fixedClock("2026-10-05T10:00:00Z");
    expect(clock.now().toISOString()).toBe("2026-10-05T10:00:00.000Z");
    clock.advance(60_000);
    expect(clock.now().toISOString()).toBe("2026-10-05T10:01:00.000Z");
    clock.set("2027-01-01T00:00:00Z");
    expect(clock.now().toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("returns a copy so callers cannot mutate the clock", () => {
    const clock = fixedClock("2026-10-05T10:00:00Z");
    clock.now().setFullYear(1999);
    expect(clock.now().getUTCFullYear()).toBe(2026);
  });

  it("computes today in Asia/Kolkata by default", () => {
    // 20:00 UTC is 01:30 the next day in India.
    expect(today(fixedClock("2026-10-05T20:00:00Z"))).toBe("2026-10-06");
    expect(today(fixedClock("2026-10-05T18:29:00Z"))).toBe("2026-10-05");
  });

  it("respects an explicit timezone", () => {
    expect(toLocalDate(new Date("2026-10-05T20:00:00Z"), "UTC")).toBe(
      "2026-10-05",
    );
  });
});
