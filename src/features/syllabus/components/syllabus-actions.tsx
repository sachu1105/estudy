"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

import { deleteSyllabusAction } from "../actions";

/** Delete, with a confirm step, for the user's own syllabus. */
export function DeleteSyllabusButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const remove = () =>
    start(async () => {
      const result = await deleteSyllabusAction({ versionId });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Syllabus deleted");
      router.push("/syllabus");
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <Trash2 aria-hidden /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this syllabus?</DialogTitle>
          <DialogDescription>
            The file and its subjects are removed, and it no longer counts
            toward your uploads.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep it</Button>
          </DialogClose>
          <Button variant="danger" disabled={pending} onClick={remove}>
            {pending ? "Deleting" : "Delete syllabus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
