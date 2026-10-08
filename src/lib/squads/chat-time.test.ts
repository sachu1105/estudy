import { describe, expect, it } from "vitest";

import { clockTime, continues, dayKey, dayLabel } from "./chat-time";

const IST = "Asia/Kolkata";

describe("chat times", () => {
  it("writes the clock time in the person's zone", () => {
    expect(clockTime(new Date("2026-10-07T10:35:00Z"), IST)).toBe("4:05 pm");
    expect(clockTime(new Date("2026-10-06T18:45:00Z"), IST)).toBe("12:15 am");
  });

  it("takes the day from the person's zone, not UTC", () => {
    expect(dayKey(new Date("2026-10-06T19:00:00Z"), IST)).toBe("2026-10-07");
  });

  it("names today, yesterday, and other days", () => {
    const now = new Date("2026-10-07T10:00:00Z");
    expect(dayLabel(new Date("2026-10-07T01:00:00Z"), now, IST)).toBe("Today");
    expect(dayLabel(new Date("2026-10-06T10:00:00Z"), now, IST)).toBe(
      "Yesterday",
    );
    expect(dayLabel(new Date("2026-09-30T10:00:00Z"), now, IST)).toBe("30 Sep");
    expect(dayLabel(new Date("2025-12-31T10:00:00Z"), now, IST)).toBe(
      "31 Dec 2025",
    );
  });

  it("groups one person's messages within five minutes on the same day", () => {
    const a = { authorId: "a", at: "2026-10-07T10:00:00Z" };
    expect(
      continues(a, { authorId: "a", at: "2026-10-07T10:04:00Z" }, IST),
    ).toBe(true);
    expect(
      continues(a, { authorId: "a", at: "2026-10-07T10:06:00Z" }, IST),
    ).toBe(false);
    expect(
      continues(a, { authorId: "b", at: "2026-10-07T10:01:00Z" }, IST),
    ).toBe(false);
    expect(continues(undefined, a, IST)).toBe(false);
  });
});
