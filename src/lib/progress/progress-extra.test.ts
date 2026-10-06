import { describe, expect, it } from "vitest";

import { levelOf } from "./level";
import { rankKey, weekStart } from "./rank-keys";
import { bestStreak } from "./streak";

describe("best streak", () => {
  it("finds the longest run, with a weekly freeze bridging one gap", () => {
    // Oct 1-3 (Thu-Sat), miss Sun 4 (freeze), Mon 5 - Tue 6, then a gap of 3, then 2 days.
    const days = [
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-05",
      "2026-10-06",
      "2026-10-10",
      "2026-10-11",
    ];
    expect(bestStreak(days)).toBe(5);
    expect(bestStreak([])).toBe(0);
  });
});

describe("levels", () => {
  it("costs 100, then 150, then 200 XP", () => {
    expect(levelOf(0)).toEqual({ level: 1, intoLevel: 0, levelSize: 100 });
    expect(levelOf(99).level).toBe(1);
    expect(levelOf(100)).toEqual({ level: 2, intoLevel: 0, levelSize: 150 });
    expect(levelOf(250)).toEqual({ level: 3, intoLevel: 0, levelSize: 200 });
  });
});

describe("rank keys", () => {
  it("starts weeks on Monday and keys boards by period and exam", () => {
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sunday -> Monday before
    expect(weekStart("2026-10-05")).toBe("2026-10-05");
    expect(rankKey("week", "2026-10-07")).toBe("rank:global:w:2026-10-05");
    expect(rankKey("month", "2026-10-07", "e1")).toBe("rank:exam:e1:m:2026-10");
    expect(rankKey("all", "2026-10-07")).toBe("rank:global:all");
  });
});
