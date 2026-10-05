import type { EditableTree } from "@/lib/syllabus/tree";

type Row = {
  id: string;
  name: string;
  topics: {
    id: string;
    name: string;
    weight: number;
    difficulty: number;
    foundational: boolean;
  }[];
};

/** Database rows -> the tree the board and folders edit (drops ids of other tables). */
export function toEditableTree(subjects: Row[]): EditableTree {
  return {
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      topics: s.topics.map((t) => ({
        id: t.id,
        name: t.name,
        weight: t.weight,
        difficulty: t.difficulty,
        foundational: t.foundational,
      })),
    })),
  };
}
