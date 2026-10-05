"use client";

import { Sparkles } from "lucide-react";
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

import { rereadSyllabusAction } from "../actions";

/** Shown when this syllabus was read by an older parser than the current one. */
export function RereadNote({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const reread = () =>
    start(async () => {
      const result = await rereadSyllabusAction({ versionId });
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      router.refresh();
    });

  return (
    <div
      role="note"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-3 text-body text-ink-muted">
        <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden />
        Our syllabus reader has improved since this file was read. Read it again
        for better subjects and topics.
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="shrink-0">
            Read again
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Read this syllabus again?</DialogTitle>
            <DialogDescription>
              The subjects and topics are replaced, including any changes you
              made. It takes a few minutes; you can leave the page meanwhile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Keep this version</Button>
            </DialogClose>
            <Button variant="primary" disabled={pending} onClick={reread}>
              {pending ? "Starting" : "Read again"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
