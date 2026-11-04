import { describe, expect, it } from "vitest";

import { handleSchema, starterHandle } from "@/lib/profile/profile";

import { otherOf, pairOf, sideOf } from "./pair";

describe("pairOf", () => {
  it("stores a pair the same way whoever starts", () => {
    expect(pairOf("b", "a")).toEqual(pairOf("a", "b"));
    expect(pairOf("b", "a")).toEqual({ userAId: "a", userBId: "b" });
    expect(otherOf(pairOf("a", "b"), "a")).toBe("b");
    expect(sideOf(pairOf("a", "b"), "b")).toBe("B");
  });
});

describe("starterHandle", () => {
  it("makes a valid username from any name", () => {
    for (const name of [
      "Anjali N",
      "അനു",
      "A",
      "Very Long Name For A Student Here",
    ]) {
      const handle = starterHandle(name, "a1b2c3");
      expect(handleSchema.safeParse(handle).success, handle).toBe(true);
    }
    expect(starterHandle("Anjali N", "a1b2c3")).toBe("anjali_n_a1b2c3");
    expect(starterHandle("അനു", "a1b2c3")).toBe("study_a1b2c3");
  });
});
