import { describe, expect, it } from "vitest";

import { groupBySubject } from "./group-subjects";

describe("groupBySubject", () => {
  it("orders subjects by their first task and keeps tasks in plan order", () => {
    const groups = groupBySubject([
      { id: "a", subject: "Geography", minutes: 10 },
      { id: "b", subject: "History", minutes: 20 },
      { id: "c", subject: "Geography", minutes: 15 },
    ]);
    expect(groups.map((g) => g.subject)).toEqual(["Geography", "History"]);
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(["a", "c"]);
    expect(groups[0]!.minutes).toBe(25);
    expect(groups[1]!.minutes).toBe(20);
  });

  it("returns nothing for an empty day", () => {
    expect(groupBySubject([])).toEqual([]);
  });
});
