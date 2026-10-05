"use client";

import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

type SubjectMenuProps = {
  name: string;
  first: boolean;
  last: boolean;
  onlyOne: boolean;
  /** Opens the rename dialog straight away (for a subject just added). */
  defaultRenaming?: boolean;
  onRename: (name: string) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
};

export function SubjectMenu({
  name,
  first,
  last,
  onlyOne,
  defaultRenaming = false,
  onRename,
  onMove,
  onDelete,
}: SubjectMenuProps) {
  const [renaming, setRenaming] = useState(defaultRenaming);
  const [draft, setDraft] = useState(name);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More for ${name}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setDraft(name);
              setRenaming(true);
            }}
          >
            <Pencil aria-hidden /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem disabled={first} onSelect={() => onMove(-1)}>
            <ArrowUp aria-hidden /> Move earlier
          </DropdownMenuItem>
          <DropdownMenuItem disabled={last} onSelect={() => onMove(1)}>
            <ArrowDown aria-hidden /> Move later
          </DropdownMenuItem>
          <DropdownMenuItem disabled={onlyOne} onSelect={onDelete}>
            <Trash2 aria-hidden /> Remove subject
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onRename(draft);
              setRenaming(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename subject</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subject-name">Name</Label>
              <Input
                id="subject-name"
                value={draft}
                maxLength={200}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="primary" disabled={!draft.trim()}>
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
