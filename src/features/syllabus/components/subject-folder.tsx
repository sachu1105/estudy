"use client";

import { ClipboardCheck, FolderOpen, LineChart, Pencil } from "lucide-react";
import Link from "next/link";
import { useReducer, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

/** One subject's folder: its topics now; materials, tests and progress fill in later. */
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
    <Tabs defaultValue="topics">
      <TabsList className="overflow-x-auto">
        <TabsTrigger value="topics">Topics</TabsTrigger>
        <TabsTrigger value="materials">Materials</TabsTrigger>
        <TabsTrigger value="tests">Tests</TabsTrigger>
        <TabsTrigger value="progress">Progress</TabsTrigger>
      </TabsList>

      <TabsContent value="topics" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body text-ink-muted">
            {subject.topics.length} topics. Study time comes from each
            topic&apos;s weight and difficulty; change them only if they look
            wrong.
          </p>
          <div className="flex items-center gap-3">
            <SaveIndicator state={save.state} error={save.error} />
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
      </TabsContent>

      <TabsContent value="materials">
        <EmptyState
          icon={FolderOpen}
          title="Your notes and files go here"
          description="Soon you can keep notes, links, PDFs and photos of your notebook in this folder, one per topic too."
        />
      </TabsContent>

      <TabsContent value="tests">
        <EmptyState
          icon={ClipboardCheck}
          title="Mock tests for this subject"
          description="Once your plan starts, every finished topic unlocks a short check test, and a section mock when the subject is done."
        />
      </TabsContent>

      <TabsContent value="progress">
        <EmptyState
          icon={LineChart}
          title="No plan yet"
          description={
            confirmed
              ? "Create a study plan and each topic here shows studied, revised and tested."
              : "Confirm the syllabus, then create a plan to track every topic here."
          }
          action={
            confirmed ? (
              <Button asChild variant="primary">
                <Link href={`/onboarding?syllabus=${versionId}`}>
                  Create study plan
                </Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href={`/syllabus/${versionId}`}>Back to subjects</Link>
              </Button>
            )
          }
        />
      </TabsContent>
    </Tabs>
  );
}
