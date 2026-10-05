import type {
  EditableSubject,
  EditableTopic,
  EditableTree,
} from "@/lib/syllabus/tree";

// Every edit on the review screen. Pure: new ids arrive in the action, so the same actions
// always give the same tree (and the reducer is easy to test).

export type TopicPatch = Partial<
  Pick<EditableTopic, "name" | "weight" | "difficulty" | "foundational">
>;

export type TreeAction =
  | { type: "renameSubject"; subjectId: string; name: string }
  | { type: "addSubject"; subjectId: string; topicId: string }
  | { type: "deleteSubject"; subjectId: string }
  | { type: "moveSubject"; subjectId: string; delta: -1 | 1 }
  | { type: "reorderSubjects"; ids: string[] }
  | { type: "addTopic"; subjectId: string; topicId: string }
  | {
      type: "updateTopic";
      subjectId: string;
      topicId: string;
      patch: TopicPatch;
    }
  | { type: "deleteTopic"; subjectId: string; topicId: string }
  | { type: "moveTopic"; subjectId: string; topicId: string; delta: -1 | 1 }
  | { type: "reorderTopics"; subjectId: string; ids: string[] }
  | { type: "mergeTopics"; subjectId: string; topicIds: string[] };

const NEW_TOPIC = {
  name: "New topic",
  weight: 3,
  difficulty: 3,
  foundational: false,
};

function move<T>(items: T[], index: number, delta: number) {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Puts items in the order of `ids`; anything not listed keeps its place at the end. */
function reorder<T extends { id: string }>(items: T[], ids: string[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const listed = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  const rest = items.filter((item) => !ids.includes(item.id));
  return [...listed, ...rest];
}

/** One topic from several: names joined, the higher weight and difficulty, foundational if any. */
export function mergeTopicList(topics: EditableTopic[]): EditableTopic {
  const name = topics
    .map((t) => t.name)
    .join(", ")
    .slice(0, 200);
  return {
    id: topics[0].id,
    name,
    weight: Math.max(...topics.map((t) => t.weight)),
    difficulty: Math.max(...topics.map((t) => t.difficulty)),
    foundational: topics.some((t) => t.foundational),
  };
}

function mapSubject(
  tree: EditableTree,
  subjectId: string,
  update: (subject: EditableSubject) => EditableSubject,
): EditableTree {
  return {
    subjects: tree.subjects.map((s) => (s.id === subjectId ? update(s) : s)),
  };
}

export function treeReducer(
  tree: EditableTree,
  action: TreeAction,
): EditableTree {
  switch (action.type) {
    case "renameSubject":
      return mapSubject(tree, action.subjectId, (s) => ({
        ...s,
        name: action.name,
      }));
    case "addSubject":
      return {
        subjects: [
          ...tree.subjects,
          {
            id: action.subjectId,
            name: "New subject",
            topics: [{ id: action.topicId, ...NEW_TOPIC }],
          },
        ],
      };
    case "deleteSubject":
      return {
        subjects: tree.subjects.filter((s) => s.id !== action.subjectId),
      };
    case "moveSubject":
      return {
        subjects: move(
          tree.subjects,
          tree.subjects.findIndex((s) => s.id === action.subjectId),
          action.delta,
        ),
      };
    case "reorderSubjects":
      return { subjects: reorder(tree.subjects, action.ids) };
    case "addTopic":
      return mapSubject(tree, action.subjectId, (s) => ({
        ...s,
        topics: [...s.topics, { id: action.topicId, ...NEW_TOPIC }],
      }));
    case "updateTopic":
      return mapSubject(tree, action.subjectId, (s) => ({
        ...s,
        topics: s.topics.map((t) =>
          t.id === action.topicId ? { ...t, ...action.patch } : t,
        ),
      }));
    case "deleteTopic":
      // A subject keeps at least one topic; delete the subject instead.
      return mapSubject(tree, action.subjectId, (s) =>
        s.topics.length <= 1
          ? s
          : { ...s, topics: s.topics.filter((t) => t.id !== action.topicId) },
      );
    case "moveTopic":
      return mapSubject(tree, action.subjectId, (s) => ({
        ...s,
        topics: move(
          s.topics,
          s.topics.findIndex((t) => t.id === action.topicId),
          action.delta,
        ),
      }));
    case "reorderTopics":
      return mapSubject(tree, action.subjectId, (s) => ({
        ...s,
        topics: reorder(s.topics, action.ids),
      }));
    case "mergeTopics":
      return mapSubject(tree, action.subjectId, (s) => {
        const chosen = s.topics.filter((t) => action.topicIds.includes(t.id));
        if (chosen.length < 2) return s;
        const merged = mergeTopicList(chosen);
        return {
          ...s,
          topics: s.topics.flatMap((t) =>
            t.id === merged.id
              ? [merged]
              : action.topicIds.includes(t.id)
                ? []
                : [t],
          ),
        };
      });
  }
}

export function topicCount(tree: EditableTree) {
  return tree.subjects.reduce((n, s) => n + s.topics.length, 0);
}
