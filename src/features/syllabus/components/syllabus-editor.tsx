"use client";

import { ChevronRight, FileText, Plus } from "lucide-react";
import { useReducer, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { editableTreeSchema, type EditableTree } from "@/lib/syllabus/tree";
import { cn } from "@/lib/utils/cn";

import { saveDraftAction } from "../actions";
import { topicCount, treeReducer } from "../tree-reducer";
import { useAutosave } from "../use-autosave";
import { GarbledNote } from "./garbled-note";
import { SaveIndicator } from "./save-indicator";
import { SubjectMenu } from "./subject-menu";
import { TopicsEditor } from "./topics-editor";

/**
 * A confirmed syllabus, edited where it lives: inside its exam pod. One line per
 * subject; open one to fix its topics right there. Everything autosaves, and the
 * subject pods follow (ticks and material are kept).
 */
export function SyllabusEditor({
  versionId,
  initialTree,
  sourceText,
  warnings,
}: {
  versionId: string;
  initialTree: EditableTree;
  sourceText: string;
  warnings: string[];
}) {
  const [tree, dispatch] = useReducer(treeReducer, initialTree);
  // One subject open at a time keeps a 17-subject syllabus to a screen or two.
  const [open, setOpen] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const save = useAutosave(
    tree,
    async (value) => {
      const result = await saveDraftAction({ versionId, tree: value });
      return result.ok ? null : result.error;
    },
    { valid: editableTreeSchema.safeParse(tree).success },
  );

  return (
    <div className="flex flex-col gap-4">
      {warnings.includes("MALAYALAM_GARBLED") ? <GarbledNote /> : null}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-small text-ink-muted">
          {tree.subjects.length} subjects · {topicCount(tree)} topics. Open a
          subject to fix its topics.
        </p>
        <div className="flex items-center gap-3">
          <SaveIndicator state={save.state} error={save.error} />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <FileText aria-hidden /> Source text
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetTitle>Text from your file</SheetTitle>
              <p className="text-small break-words whitespace-pre-wrap text-ink-muted">
                {sourceText}
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <ul className="divide-y divide-border rounded-card border border-border bg-surface">
        {tree.subjects.map((subject, i) => {
          const expanded = open === subject.id;
          const panelId = `subject-${subject.id}`;
          return (
            <li key={subject.id}>
              {/* The open subject's name stays in view while its topics scroll. */}
              <div
                className={cn(
                  "flex items-center pr-1 first:rounded-t-card",
                  expanded &&
                    "sticky top-16 z-20 border-b border-border bg-surface/95 backdrop-blur md:top-0",
                )}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => setOpen(expanded ? null : subject.id)}
                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left transition-colors duration-[120ms] hover:bg-surface-muted"
                >
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 text-ink-subtle transition-transform duration-[200ms]",
                      expanded && "rotate-90",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-heading text-body font-medium">
                      {subject.name}
                    </span>
                    <span className="text-small text-ink-muted">
                      {subject.topics.length} topic
                      {subject.topics.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
                <SubjectMenu
                  name={subject.name}
                  first={i === 0}
                  last={i === tree.subjects.length - 1}
                  onlyOne={tree.subjects.length === 1}
                  defaultRenaming={added === subject.id}
                  onRename={(name) =>
                    dispatch({
                      type: "renameSubject",
                      subjectId: subject.id,
                      name,
                    })
                  }
                  onMove={(delta) =>
                    dispatch({
                      type: "moveSubject",
                      subjectId: subject.id,
                      delta,
                    })
                  }
                  onDelete={() =>
                    dispatch({ type: "deleteSubject", subjectId: subject.id })
                  }
                />
              </div>
              {expanded ? (
                <div
                  id={panelId}
                  className="pb-2 md:bg-surface-muted/40 md:p-4"
                >
                  <TopicsEditor subject={subject} dispatch={dispatch} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Button
        variant="ghost"
        className="self-start"
        onClick={() => {
          const subjectId = crypto.randomUUID();
          dispatch({
            type: "addSubject",
            subjectId,
            topicId: crypto.randomUUID(),
          });
          setAdded(subjectId);
          setOpen(subjectId);
        }}
      >
        <Plus aria-hidden /> Add subject
      </Button>
    </div>
  );
}
