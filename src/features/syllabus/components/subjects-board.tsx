"use client";

import { AlertCircle, FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useReducer, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { editableTreeSchema, type EditableTree } from "@/lib/syllabus/tree";
import { useHydrated } from "@/lib/use-hydrated";

import { confirmSyllabusAction, saveDraftAction } from "../actions";
import { topicCount, treeReducer } from "../tree-reducer";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "./save-indicator";
import { SubjectCard } from "./subject-card";
import { SubjectMenu } from "./subject-menu";

type SubjectsBoardProps = {
  versionId: string;
  initialTree: EditableTree;
  sourceText: string;
  confirmed: boolean;
  /** From the parse, e.g. MALAYALAM_GARBLED. */
  warnings: string[];
};

/**
 * Every subject as a folder. Fix subjects here (rename, order, remove, add); topics are
 * fixed inside each folder, so nobody has to rate every topic before they can start.
 */
export function SubjectsBoard({
  versionId,
  initialTree,
  sourceText,
  confirmed,
  warnings,
}: SubjectsBoardProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [tree, dispatch] = useReducer(treeReducer, initialTree);
  const [added, setAdded] = useState<string | null>(null);
  const [confirming, startConfirm] = useTransition();
  const check = editableTreeSchema.safeParse(tree);
  const save = useAutosave(
    tree,
    async (value) => {
      const result = await saveDraftAction({ versionId, tree: value });
      return result.ok ? null : result.error;
    },
    { valid: check.success },
  );

  const confirm = () =>
    startConfirm(async () => {
      if (!check.success) {
        toast.error(
          check.error.issues[0]?.message ?? "Fix the subject names first.",
        );
        return;
      }
      const result = await confirmSyllabusAction({ versionId, tree });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Syllabus confirmed");
      router.refresh();
    });

  const topics = topicCount(tree);
  return (
    <div className="flex flex-col gap-5">
      {warnings.includes("MALAYALAM_GARBLED") ? (
        <div
          role="note"
          className="flex items-start gap-3 rounded-card border border-border bg-surface-muted p-4"
        >
          {" "}
          <AlertCircle
            className="mt-0.5 size-5 shrink-0 text-ink-muted"
            aria-hidden
          />{" "}
          <p className="text-body text-ink-muted">
            {" "}
            This PDF uses an old Malayalam font, so some words came out with
            letters missing. We fixed what we could. Check the subject and topic
            names, or paste the text from another copy.{" "}
          </p>{" "}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-ink-muted">
          {tree.subjects.length} subjects, {topics} topics.{" "}
          {confirmed
            ? "Open a folder to see or fix its topics."
            : "Check the subjects, then confirm."}
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

      {/* Row by row in syllabus order; one column on phones, cards share a row height. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tree.subjects.map((subject, i) => (
          <SubjectCard
            key={subject.id}
            href={`/syllabus/${versionId}/subjects/${subject.id}`}
            name={subject.name}
            topics={subject.topics}
            menu={
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
            }
          />
        ))}
        <button
          type="button"
          onClick={() => {
            const subjectId = crypto.randomUUID();
            dispatch({
              type: "addSubject",
              subjectId,
              topicId: crypto.randomUUID(),
            });
            setAdded(subjectId);
          }}
          className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-border text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <Plus className="size-5" aria-hidden />
          <span className="text-body font-medium">Add subject</span>
        </button>
      </div>

      {confirmed ? null : (
        // One line on phones, so it doesn't cover the subjects above the tab bar.
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-30 flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-2 pl-4 shadow-lg sm:p-3 sm:pl-4 md:bottom-4">
          <p className="text-small text-ink-muted">
            Subjects look right?
            <span className="hidden sm:inline">
              {" "}
              Confirm to build a plan. You can fix topics in each folder any
              time.
            </span>
          </p>
          <Button
            variant="primary"
            size="lg"
            disabled={!hydrated || confirming}
            onClick={confirm}
            className="shrink-0"
          >
            {confirming ? "Confirming" : "Confirm syllabus"}
          </Button>
        </div>
      )}
    </div>
  );
}
