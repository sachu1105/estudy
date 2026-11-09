import { describe, expect, it } from "vitest";

import { keyOut, laterResults, resultsOut } from "./release";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-11-09T10:00:00Z");

describe("paper release", () => {
  it("shows the score and key straight after a hand-in by default", () => {
    const r = { resultsAt: null, keyHidden: false };
    expect(resultsOut(r, NOW)).toBe(true);
    expect(keyOut(r, NOW)).toBe(true);
  });

  it("holds the score and key until the results time", () => {
    const r = { resultsAt: at("2026-11-09T12:00:00Z"), keyHidden: false };
    expect(resultsOut(r, NOW)).toBe(false);
    expect(keyOut(r, NOW)).toBe(false);
    expect(resultsOut(r, at("2026-11-09T12:00:00Z"))).toBe(true);
    expect(keyOut(r, at("2026-11-09T12:00:00Z"))).toBe(true);
  });

  it("never shows a hidden key, even once results are out", () => {
    const r = { resultsAt: at("2026-11-09T08:00:00Z"), keyHidden: true };
    expect(resultsOut(r, NOW)).toBe(true);
    expect(keyOut(r, NOW)).toBe(false);
    expect(keyOut({ resultsAt: null, keyHidden: true }, NOW)).toBe(false);
  });

  it("takes the later of two results times, null meaning right away", () => {
    const early = at("2026-11-09T11:00:00Z");
    const late = at("2026-11-10T11:00:00Z");
    expect(laterResults(null, null)).toBeNull();
    expect(laterResults(early, null)).toBe(early);
    expect(laterResults(null, late)).toBe(late);
    expect(laterResults(early, late)).toBe(late);
    expect(laterResults(late, early)).toBe(late);
  });
});
