"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

import { deletePodAction, renamePodAction } from "../actions";

/** Rename or delete one of the user's own pods. */
export function PodMenu({ podId, name }: { podId: string; name: string }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [draft, setDraft] = useState(name);
  const [pending, start] = useTransition();

  const rename = () =>
    start(async () => {
      const result = await renamePodAction({ podId, name: draft });
      if (!result.ok) return void toast.error(result.error);
      setDialog(null);
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      const result = await deletePodAction({ podId });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Pod deleted");
      router.push("/pods");
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More for ${name}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog("rename")}>
            <Pencil aria-hidden /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("delete")}>
            <Trash2 aria-hidden /> Delete pod
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
              rename();
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename pod</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pod-rename">Name</Label>
              <Input
                id="pod-rename"
                value={draft}
                maxLength={80}
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
            <DialogTitle>Delete this pod?</DialogTitle>
            <DialogDescription>Everything in it goes too.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep it
            </Button>
            <Button variant="danger" disabled={pending} onClick={remove}>
              Delete pod
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
