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

import type { SheetApi } from "./sheet-api";

/**
 * Handing the sheet in: the last marks are saved first, then the page moves on to the
 * result (or, for a squad exam, the exam's page). `onSubmitted` runs before it moves, so
 * leaving isn't taken for walking out.
 */
export function useHandIn(
  api: SheetApi,
  flush: () => Promise<void>,
  onSubmitted: () => void,
) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function handIn() {
    setPending(true);
    await flush();
    const result = await api.submit();
    if (!result.ok) {
      setPending(false);
      toast.error(result.error);
      return false;
    }
    onSubmitted();
    router.push(result.href);
    return true;
  }
  return { pending, handIn };
}

/** What a hand-in shows on someone else's paper whose owner holds results or the key. */
function afterHandIn(release: {
  resultsAt: string | null;
  keyHidden: boolean;
}) {
  const score = release.resultsAt
    ? `Your score comes out ${new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(
        new Date(release.resultsAt),
      )}; until then you see what you marked.`
    : "You see your score straight away.";
  const key = release.keyHidden
    ? " The answer key stays with whoever set the paper."
    : "";
  return `${score}${key} The sheet then clears for your next sitting.`;
}

/**
 * Handing the sheet in, as at the end of the exam: one question first, then the marks
 * are kept for good, the sheet is cleared for the next sitting, and the result opens.
 */
export function SubmitSheet({
  api,
  open,
  onOpenChange,
  marked,
  questions,
  keyed,
  release,
  timeUp,
  flush,
  onSubmitted,
}: {
  api: SheetApi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marked: number;
  questions: number;
  /** Questions with a key: none means the score waits for the key. */
  keyed: number;
  /** Someone else's paper: what its owner lets a hand-in show, and when. */
  release: { resultsAt: string | null; keyHidden: boolean } | null;
  /** The clock ran out: the dialog says so. */
  timeUp: boolean;
  flush: () => Promise<void>;
  /** Called before the page moves on, so leaving isn't treated as walking out. */
  onSubmitted: () => void;
}) {
  const { pending, handIn } = useHandIn(api, flush, onSubmitted);
  const left = questions - marked;

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
            {api.examId
              ? "This is your one sitting for the rank list: once handed in, it's final."
              : release && (release.resultsAt || release.keyHidden)
                ? afterHandIn(release)
                : keyed === 0
                  ? "There's no answer key yet: add it after and your score appears. The sheet then clears for your next sitting."
                  : "It's marked against the answer key straight away, and the sheet clears for your next sitting."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={pending} onClick={() => onOpenChange(false)}>
            Keep answering
          </Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => void handIn()}
          >
            {pending ? "Submitting" : "Submit sheet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
