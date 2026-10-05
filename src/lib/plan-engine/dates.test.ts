import { describe, expect, it } from "vitest";

import { addDays, fromDay, isValidIsoDate, toDay, weekdayOf } from "./dates";

describe("dates", () => {
  it("round-trips across leap years and centuries", () => {
    for (let day = toDay("1999-12-25"); day < toDay("2101-03-05"); day += 37) {
      expect(toDay(fromDay(day))).toBe(day);
    }
    expect(fromDay(0)).toBe("1970-01-01");
    expect(toDay("2028-02-29") - toDay("2028-02-28")).toBe(1);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("knows weekdays", () => {
    expect(weekdayOf(toDay("2026-10-05"))).toBe(1); // Monday
    expect(weekdayOf(toDay("2026-10-04"))).toBe(0); // Sunday
    expect(weekdayOf(toDay("1969-12-31"))).toBe(3); // negative day numbers too
  });

  it("rejects impossible dates", () => {
    expect(isValidIsoDate("2026-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("05-10-2026")).toBe(false);
    expect(isValidIsoDate("2026-10-05")).toBe(true);
  });
});
