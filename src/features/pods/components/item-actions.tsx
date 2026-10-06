"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

import {
  renameItemAction,
  restoreItemAction,
  trashItemAction,
} from "../actions";

/** Rename (not for notes, which rename in place) and move to the trash, with undo. */
export function ItemActions({
  itemId,
  podId,
  title,
  canRename,
}: {
  itemId: string;
  podId: string;
  title: string;
  canRename: boolean;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const [pending, start] = useTransition();

  const rename = () =>
    start(async () => {
      const result = await renameItemAction({ itemId, title: draft });
      if (!result.ok) return void toast.error(result.error);
      setRenaming(false);
      router.refresh();
    });

  const trash = () =>
    start(async () => {
      const result = await trashItemAction({ itemId });
      if (!result.ok) return void toast.error(result.error);
      router.push(`/pods/${podId}`);
      toast.success("Moved to the trash", {
        action: {
          label: "Undo",
          onClick: async () => {
            await restoreItemAction({ itemId });
            router.refresh();
          },
        },
      });
    });

  return (
    <>
      {canRename ? (
        <Button variant="ghost" onClick={() => setRenaming(true)}>
          <Pencil aria-hidden /> Rename
        </Button>
      ) : null}
      <Button variant="ghost" disabled={pending} onClick={trash}>
        <Trash2 aria-hidden /> Delete
      </Button>
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rename();
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="item-title">Title</Label>
              <Input
                id="item-title"
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
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
