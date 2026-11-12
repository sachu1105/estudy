import { describe, expect, it } from "vitest";

import { fullyKeyed, sellerShare, storeCut } from "./store";

describe("store rules", () => {
  it("takes studypods' share in whole paise", () => {
    expect(storeCut(14900, 20)).toBe(2980);
    expect(sellerShare(14900, 20)).toBe(11920);
    expect(storeCut(1000, 0)).toBe(0);
    // ₹9.99 at 15%: 149.85 paise rounds to 150.
    expect(storeCut(999, 15)).toBe(150);
  });

  it("needs an answer, or a cancellation, for every question", () => {
    expect(fullyKeyed([1, 2, -1, 8], 4)).toBe(true);
    expect(fullyKeyed([1, 0, 4, 8], 4)).toBe(false);
    expect(fullyKeyed([1, 2], 4)).toBe(false);
    // A longer stored key only counts up to the paper's questions.
    expect(fullyKeyed([1, 2, 0], 2)).toBe(true);
  });
});
