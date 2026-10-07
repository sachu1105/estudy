import { describe, expect, it } from "vitest";

import { weekKey, weekStart } from "./rank-keys";

describe("weekly board keys", () => {
  it("starts weeks on Monday", () => {
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sunday -> Monday before
    expect(weekStart("2026-10-05")).toBe("2026-10-05");
    expect(weekKey("2026-10-07")).toBe("rank:global:w:2026-10-05");
  });
});
