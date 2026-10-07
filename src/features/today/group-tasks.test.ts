import { describe, expect, it } from "vitest";

import { groupTasks, type GroupableTask } from "./group-tasks";

const task = (
  over: Partial<GroupableTask> & { id: string },
): GroupableTask => ({
  title: "Study Earth Structure",
  topicId: "t1",
  topicName: "Earth Structure",
  subject: "Geography",
  minutes: 15,
  done: false,
  ...over,
});

describe("groupTasks", () => {
  it("gathers a topic's tasks into one group, in plan order", () => {
    const groups = groupTasks([
      task({ id: "a" }),
      task({ id: "b", title: "Check test: Earth Structure", minutes: 10 }),
      task({ id: "c", topicId: "t2", topicName: "Preamble", minutes: 25 }),
    ]);
    expect(groups.map((g) => g.title)).toEqual(["Earth Structure", "Preamble"]);
    expect(groups[0]!.tasks.map((t) => t.id)).toEqual(["a", "b"]);
    expect(groups[0]!.minutes).toBe(25);
    expect(groups[0]!.left).toBe(2);
  });

  it("counts only what is left, and keeps done tasks in the group", () => {
    const [group] = groupTasks([
      task({ id: "a", done: true }),
      task({ id: "b", minutes: 10 }),
    ]);
    expect(group!.total).toBe(2);
    expect(group!.left).toBe(1);
    expect(group!.minutes).toBe(10);
  });

  it("keeps topic-less tasks apart from each other", () => {
    const groups = groupTasks([
      task({
        id: "a",
        topicId: null,
        topicName: null,
        title: "Full mock test",
      }),
      task({
        id: "b",
        topicId: null,
        topicName: null,
        title: "Full mock test",
      }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.title).toBe("Full mock test");
  });
});
