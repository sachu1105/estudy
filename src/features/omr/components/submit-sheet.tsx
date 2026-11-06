"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

import { submitSheetAction } from "../actions";

/**
 * Handing the sheet in, as at the end of the exam: one question first, then the marks
 * are kept for good, the sheet is cleared for the next sitting, and the result opens.
 */
export function SubmitSheet({
  paperId,
  open,
  onOpenChange,
  marked,
  questions,
  keyed,
  timeUp,
  flush,
  onSubmitted,
}: {
  paperId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marked: number;
  questions: number;
  /** Questions with a key: none means the score waits for the key. */
  keyed: number;
  /** The clock ran out: the dialog says so. */
  timeUp: boolean;
  flush: () => Promise<void>;
  /** Called before the page moves on, so leaving isn't treated as walking out. */
  onSubmitted: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const left = questions - marked;

  async function submit() {
    setPending(true);
    await flush();
    const result = await submitSheetAction({ id: paperId });
    if (!result.ok) {
      setPending(false);
      return void toast.error(result.error);
    }
    onSubmitted();
    router.push(`/omr/${paperId}/result/${result.submissionId}`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {timeUp ? "Time's up. Submit your sheet?" : "Submit your sheet?"}
          </DialogTitle>
          <DialogDescription>
            You marked {marked} of {questions}
            {left > 0 ? `, ${left} left blank` : ""}.{" "}
            {keyed === 0
              ? "There's no answer key yet: add it after and your score appears."
              : "It's marked against the answer key straight away."}{" "}
            The sheet then clears for your next sitting.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={pending} onClick={() => onOpenChange(false)}>
            Keep answering
          </Button>
          <Button variant="primary" disabled={pending} onClick={submit}>
            {pending ? "Submitting" : "Submit sheet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
