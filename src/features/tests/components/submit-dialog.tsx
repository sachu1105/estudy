"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** One last look before submitting: how many are answered and flagged. */
export function SubmitDialog({
  answered,
  total,
  flagged,
  pending,
  onSubmit,
}: {
  answered: number;
  total: number;
  flagged: number;
  pending: boolean;
  onSubmit: () => void;
}) {
  const left = total - answered;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Finish test</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit your answers?</DialogTitle>
          <DialogDescription>
            {answered} of {total} answered
            {left > 0 ? `; ${left} left blank` : ""}
            {flagged > 0 ? `, ${flagged} flagged to check` : ""}. You see the
            answers and explanations right after.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="primary" disabled={pending} onClick={onSubmit}>
            {pending ? "Submitting" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
