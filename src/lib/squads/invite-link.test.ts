import { describe, expect, it } from "vitest";

import { inviteCodeOf } from "./invite-link";

describe("inviteCodeOf", () => {
  it("reads the code from a squad invite link", () => {
    expect(inviteCodeOf("http://localhost:3000/groups/join/AX2RW67F")).toBe(
      "AX2RW67F",
    );
    expect(inviteCodeOf("https://studypods.in/groups/join/ab12cd/")).toBe(
      "ab12cd",
    );
  });

  it("ignores every other link", () => {
    expect(inviteCodeOf("https://studypods.in/groups/abc")).toBeNull();
    expect(inviteCodeOf("https://studypods.in/groups/join/AB")).toBeNull();
    expect(inviteCodeOf("https://x.in/groups/join/AX2RW67F?next=1")).toBe(
      "AX2RW67F",
    );
    expect(inviteCodeOf("not a url")).toBeNull();
  });
});
