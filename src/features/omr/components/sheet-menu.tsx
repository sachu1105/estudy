"use client";

import {
  Download,
  KeyRound,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

import { deleteSheetAction, renameSheetAction } from "../actions";
import { downloadAnswerSheet } from "./download-sheet";
import { useOmrPrefs } from "./use-omr-prefs";

/**
 * A question paper's other doors: its answer key and marking, its last result, its
 * marked sheet as a PDF, rename, and delete with its marks.
 */
export function SheetMenu({
  id,
  title,
  lastResultId,
}: {
  id: string;
  title: string;
  lastResultId: string | null;
}) {
  const router = useRouter();
  const [prefs] = useOmrPrefs();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [draft, setDraft] = useState(title);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      setDialog(null);
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More for ${title}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/omr/${id}/key`}>
              <KeyRound aria-hidden /> Answer key and marking
            </Link>
          </DropdownMenuItem>
          {lastResultId ? (
            <DropdownMenuItem asChild>
              <Link href={`/omr/${id}/result/${lastResultId}`}>
                <ListChecks aria-hidden /> Last result
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setDialog("rename")}>
            <Pencil aria-hidden /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void downloadAnswerSheet(id, title, prefs.pen)}
          >
            <Download aria-hidden /> Download answer sheet
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("delete")}>
            <Trash2 aria-hidden /> Delete paper
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialog === "rename"}
        onOpenChange={(o) => setDialog(o ? "rename" : null)}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => renameSheetAction({ id, title: draft }));
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename paper</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`rename-${id}`}>Name</Label>
              <Input
                id={`rename-${id}`}
                value={draft}
                maxLength={120}
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                variant="primary"
                disabled={pending || !draft.trim()}
              >
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this paper?</DialogTitle>
            <DialogDescription>
              The PDF, its answer key, the marks on its sheet and every result
              go for good.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => run(() => deleteSheetAction({ id }))}
            >
              Delete paper
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
