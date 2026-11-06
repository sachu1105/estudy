import { describe, expect, it } from "vitest";

import { examStatus, released, resultsAtFor, sittingEndsAt } from "./exam";
import { frac } from "./fraction";
import { rankList } from "./rank";

const at = (iso: string) => new Date(iso);
const window = {
  opensAt: at("2026-11-07T10:00:00Z"),
  closesAt: at("2026-11-07T12:00:00Z"),
  resultsAt: at("2026-11-07T13:00:00Z"),
};

describe("exam window", () => {
  it("is upcoming, open, then closed", () => {
    expect(examStatus(window, at("2026-11-07T09:59:59Z"))).toBe("upcoming");
    expect(examStatus(window, at("2026-11-07T10:00:00Z"))).toBe("open");
    expect(examStatus(window, at("2026-11-07T12:00:00Z"))).toBe("closed");
    expect(
      examStatus({ ...window, closesAt: null }, at("2030-01-01T00:00:00Z")),
    ).toBe("open");
  });

  it("releases results at their time, or at once with none", () => {
    expect(released(window, at("2026-11-07T12:59:59Z"))).toBe(false);
    expect(released(window, at("2026-11-07T13:00:00Z"))).toBe(true);
    expect(released({ ...window, resultsAt: null }, window.opensAt)).toBe(true);
  });

  it("gives a late starter until the close, never past it", () => {
    const close = at("2026-11-07T12:00:00Z");
    expect(sittingEndsAt(at("2026-11-07T10:00:00Z"), 75, close)).toEqual(
      at("2026-11-07T11:15:00Z"),
    );
    expect(sittingEndsAt(at("2026-11-07T11:30:00Z"), 75, close)).toEqual(close);
    expect(sittingEndsAt(at("2026-11-07T11:30:00Z"), null, close)).toEqual(
      close,
    );
    expect(sittingEndsAt(at("2026-11-07T11:30:00Z"), null, null)).toBeNull();
  });

  it("turns the sharer's choice into a results time", () => {
    const close = at("2026-11-07T12:00:00Z");
    expect(resultsAtFor("now", close, null)).toEqual({ resultsAt: null });
    expect(resultsAtFor("close", close, null)).toEqual({ resultsAt: close });
    expect(resultsAtFor("close", null, null)).toBeNull();
    expect(resultsAtFor("at", null, close)).toEqual({ resultsAt: close });
    expect(resultsAtFor("at", null, null)).toBeNull();
  });
});

describe("rank list", () => {
  it("ranks by score, ties share a rank, and lists ties by register number", () => {
    const ranked = rankList([
      { registerNo: 1003, score: frac(184, 3) },
      { registerNo: 1001, score: frac(50) },
      { registerNo: 1004, score: frac(70) },
      { registerNo: 1002, score: frac(184, 3) },
    ]);
    expect(ranked.map((r) => [r.rank, r.registerNo])).toEqual([
      [1, 1004],
      [2, 1002],
      [2, 1003],
      [4, 1001],
    ]);
    expect(rankList([])).toEqual([]);
  });
});
