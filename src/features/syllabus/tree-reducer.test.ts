import { describe, expect, it } from "vitest";

import { sequentialIds } from "@/lib/ids";
import { editableTreeSchema, type EditableTree } from "@/lib/syllabus/tree";

import { treeReducer, type TreeAction } from "./tree-reducer";

const ids = sequentialIds();
const topic = (
  name: string,
  weight = 3,
  difficulty = 3,
  foundational = false,
) => ({
  id: ids.next(),
  name,
  weight,
  difficulty,
  foundational,
});

function start(): EditableTree {
  return {
    subjects: [
      {
        id: ids.next(),
        name: "Indian Constitution",
        topics: [
          topic("Preamble", 2, 1, true),
          topic("Fundamental rights", 4, 3),
          topic("DPSP"),
        ],
      },
      { id: ids.next(), name: "Kerala geography", topics: [topic("Rivers")] },
    ],
  };
}

const apply = (tree: EditableTree, ...actions: TreeAction[]) =>
  actions.reduce(treeReducer, tree);
const names = (tree: EditableTree, i = 0) =>
  tree.subjects[i].topics.map((t) => t.name);

describe("treeReducer", () => {
  it("renames, adds and deletes, keeping the tree valid", () => {
    const tree = start();
    const [constitution] = tree.subjects;
    const next = apply(
      tree,
      {
        type: "renameSubject",
        subjectId: constitution.id,
        name: "Constitution",
      },
      { type: "addTopic", subjectId: constitution.id, topicId: ids.next() },
      {
        type: "deleteTopic",
        subjectId: constitution.id,
        topicId: constitution.topics[2].id,
      },
      { type: "addSubject", subjectId: ids.next(), topicId: ids.next() },
    );
    expect(next.subjects[0].name).toBe("Constitution");
    expect(names(next)).toEqual([
      "Preamble",
      "Fundamental rights",
      "New topic",
    ]);
    expect(next.subjects.map((s) => s.name)).toEqual([
      "Constitution",
      "Kerala geography",
      "New subject",
    ]);
    expect(editableTreeSchema.safeParse(next).success).toBe(true);
  });

  it("never deletes a subject's last topic", () => {
    const tree = start();
    const geography = tree.subjects[1];
    const next = treeReducer(tree, {
      type: "deleteTopic",
      subjectId: geography.id,
      topicId: geography.topics[0].id,
    });
    expect(next.subjects[1].topics).toHaveLength(1);
  });

  it("moves with buttons and reorders by drag, ignoring moves past the ends", () => {
    const tree = start();
    const [c] = tree.subjects;
    const [preamble, rights, dpsp] = c.topics;
    expect(
      names(
        apply(tree, {
          type: "moveTopic",
          subjectId: c.id,
          topicId: preamble.id,
          delta: 1,
        }),
      ),
    ).toEqual(["Fundamental rights", "Preamble", "DPSP"]);
    expect(
      names(
        apply(tree, {
          type: "moveTopic",
          subjectId: c.id,
          topicId: preamble.id,
          delta: -1,
        }),
      ),
    ).toEqual(["Preamble", "Fundamental rights", "DPSP"]);
    expect(
      names(
        apply(tree, {
          type: "reorderTopics",
          subjectId: c.id,
          ids: [dpsp.id, preamble.id, rights.id],
        }),
      ),
    ).toEqual(["DPSP", "Preamble", "Fundamental rights"]);
    const swapped = apply(tree, {
      type: "moveSubject",
      subjectId: c.id,
      delta: 1,
    });
    expect(swapped.subjects[0].name).toBe("Kerala geography");
  });

  it("merges topics into the first one with the higher weight and difficulty", () => {
    const tree = start();
    const [c] = tree.subjects;
    const [preamble, rights, dpsp] = c.topics;
    const next = treeReducer(tree, {
      type: "mergeTopics",
      subjectId: c.id,
      topicIds: [preamble.id, dpsp.id],
    });
    expect(next.subjects[0].topics).toEqual([
      {
        id: preamble.id,
        name: "Preamble, DPSP",
        weight: 3,
        difficulty: 3,
        foundational: true,
      },
      rights,
    ]);
  });

  it("edits weight, difficulty and the foundational flag", () => {
    const tree = start();
    const [c] = tree.subjects;
    const next = treeReducer(tree, {
      type: "updateTopic",
      subjectId: c.id,
      topicId: c.topics[1].id,
      patch: { weight: 5, foundational: true },
    });
    expect(next.subjects[0].topics[1]).toMatchObject({
      weight: 5,
      difficulty: 3,
      foundational: true,
    });
    expect(tree.subjects[0].topics[1].weight).toBe(4); // the original is untouched
  });
});
