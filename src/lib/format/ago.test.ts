import { describe, expect, it } from "vitest";

import { timeAgo } from "./ago";

const now = new Date("2026-10-12T10:00:00Z");
const before = (ms: number) => new Date(now.getTime() - ms);

describe("timeAgo", () => {
  it("reads naturally", () => {
    expect(timeAgo(before(10_000), now)).toBe("just now");
    expect(timeAgo(before(5 * 60_000), now)).toBe("5 min ago");
    expect(timeAgo(before(3 * 3_600_000), now)).toBe("3 h ago");
    expect(timeAgo(before(3 * 86_400_000), now)).toBe("9 Oct");
  });
});
