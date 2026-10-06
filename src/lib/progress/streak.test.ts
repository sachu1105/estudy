import { describe, expect, it } from "vitest";

import { computeStreak } from "./streak";

// 2026-10-07 is a Wednesday.
const TODAY = "2026-10-07";

describe("streak", () => {
  it("counts back from today, and an open today doesn't break it", () => {
    expect(
      computeStreak(["2026-10-05", "2026-10-06", "2026-10-07"], TODAY),
    ).toMatchObject({ current: 3, todayDone: true, frozen: [] });
    expect(computeStreak(["2026-10-05", "2026-10-06"], TODAY)).toMatchObject({
      current: 2,
      todayDone: false,
    });
  });

  it("covers one missed day a week with a freeze", () => {
    // Monday 5th missed; Sunday 4th, Saturday 3rd active.
    const result = computeStreak(
      ["2026-10-03", "2026-10-04", "2026-10-06", "2026-10-07"],
      TODAY,
    );
    expect(result).toMatchObject({
      current: 4,
      frozen: ["2026-10-05"],
      freezeLeft: false,
    });
  });

  it("ends the run at a second missed day in the same week", () => {
    // Mon 5th and Tue 6th both missed: one freeze can't cover both.
    expect(computeStreak(["2026-10-04", "2026-10-07"], TODAY)).toMatchObject({
      current: 1,
      frozen: [],
    });
  });

  it("gives each week its own freeze", () => {
    // Sun 4th (week of Sep 28) and Mon 5th (week of Oct 5) missed.
    const result = computeStreak(
      ["2026-10-02", "2026-10-03", "2026-10-06", "2026-10-07"],
      TODAY,
    );
    expect(result.current).toBe(4);
    expect(result.frozen).toEqual(["2026-10-05", "2026-10-04"]);
  });

  it("never lets freezes stand in for a streak of nothing", () => {
    expect(computeStreak([], TODAY)).toMatchObject({
      current: 0,
      frozen: [],
      freezeLeft: true,
    });
    expect(computeStreak(["2026-10-07"], TODAY)).toMatchObject({
      current: 1,
      frozen: [],
    });
  });
});
