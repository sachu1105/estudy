"use client";

import { Boxes, Pencil } from "lucide-react";
import Link from "next/link";
import { useReducer, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { editableTreeSchema, type EditableTree } from "@/lib/syllabus/tree";

import { saveDraftAction } from "../actions";
import { treeReducer } from "../tree-reducer";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "./save-indicator";
import { TopicsEditor } from "./topics-editor";

type SubjectFolderProps = {
  versionId: string;
  subjectId: string;
  initialTree: EditableTree;
  confirmed: boolean;
};

/**
 * A subject's topic list and its editor. Once the syllabus is confirmed the subject's
 * pod is its home (material, tests, progress); this page stays the place to fix topics.
 */
export function SubjectFolder({
  versionId,
  subjectId,
  initialTree,
  confirmed,
}: SubjectFolderProps) {
  const [tree, dispatch] = useReducer(treeReducer, initialTree);
  const [editing, setEditing] = useState(false);
  const save = useAutosave(
    tree,
    async (value) => {
      const result = await saveDraftAction({ versionId, tree: value });
      return result.ok ? null : result.error;
    },
    { valid: editableTreeSchema.safeParse(tree).success },
  );
  const subject = tree.subjects.find((s) => s.id === subjectId);
  if (!subject) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          {subject.topics.length} topics. Study time comes from each
          topic&apos;s weight and difficulty; change them only if they look
          wrong.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <SaveIndicator state={save.state} error={save.error} />
          {confirmed ? (
            <Button asChild variant="secondary">
              <Link href={`/pods/subject/${subjectId}`}>
                <Boxes aria-hidden /> Open pod
              </Link>
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setEditing((on) => !on)}>
            <Pencil aria-hidden /> {editing ? "Done editing" : "Edit topics"}
          </Button>
        </div>
      </div>
      {editing ? (
        <TopicsEditor subject={subject} dispatch={dispatch} />
      ) : (
        <ol className="divide-y divide-border rounded-card border border-border bg-surface">
          {subject.topics.map((topic, i) => (
            <li key={topic.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 shrink-0 font-mono text-small text-ink-muted tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-body break-words">
                {topic.name}
              </span>
              {topic.foundational ? (
                <Badge tone="accent">Foundation</Badge>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
