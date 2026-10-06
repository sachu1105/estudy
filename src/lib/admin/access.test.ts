import { describe, expect, it } from "vitest";

import { adminNav, canAdmin } from "./access";

describe("admin access", () => {
  it("keeps moderators to moderation and admins away from roles and billing", () => {
    expect(adminNav("MODERATOR").map((a) => a.area)).toEqual([
      "dashboard",
      "catalogue",
      "questions",
    ]);
    expect(canAdmin("ADMIN", "users")).toBe(true);
    expect(canAdmin("ADMIN", "plans")).toBe(false);
    expect(canAdmin("ADMIN", "roles")).toBe(false);
    expect(canAdmin("SUPER_ADMIN", "roles")).toBe(true);
    expect(adminNav("USER")).toEqual([]);
  });
});
