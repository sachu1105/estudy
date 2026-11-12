"use client";

import { useEffect, useState, useTransition } from "react";

import { FEEDBACK_EVENT } from "@/components/shell/open-feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Rating } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { myRatingAction, rateAppAction } from "@/features/feedback/actions";
import { NOTE_MAX, STAR_WORDS } from "@/lib/feedback/schemas";

/** What we ask next depends on the stars: a 5 tells us what to keep. */
const ASK = [
  "What went wrong? Tell us and we'll fix it.",
  "What's missing for you?",
  "What would make it a 5?",
  "What would make it a 5?",
  "What do you love most? We'll keep it.",
];

/**
 * "How is studypods for you?": stars and an optional note, in a modal opened from the
 * sidebar, the command palette or Settings (openFeedback). One rating per person; opening
 * it again shows theirs to change.
 */
export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [rated, setRated] = useState(false);
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const show = () => {
      setOpen(true);
      void myRatingAction().then((saved) => {
        if (!saved) return;
        setRated(true);
        setStars(saved.stars);
        setNote(saved.note);
      });
    };
    window.addEventListener(FEEDBACK_EVENT, show);
    return () => window.removeEventListener(FEEDBACK_EVENT, show);
  }, []);

  const send = () =>
    start(async () => {
      const result = await rateAppAction({ stars, note });
      if (!result.ok) return void toast.error(result.error);
      setRated(true);
      setOpen(false);
      toast.success(
        stars >= 4 ? "Thank you, that means a lot" : "Thanks for being honest",
      );
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How is studypods for you?</DialogTitle>
          <DialogDescription>
            Rate it and tell us what to keep or fix. We read every note.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-1">
          <Rating
            value={stars}
            onChange={setStars}
            label="Rate studypods"
            words={STAR_WORDS}
            size="lg"
          />
          <p className="text-small text-ink-muted" aria-live="polite">
            {stars ? STAR_WORDS[stars - 1] : "Tap a star"}
          </p>
        </div>
        {stars ? (
          <Textarea
            rows={3}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`${ASK[stars - 1]} (optional)`}
            aria-label={ASK[stars - 1]}
            className="mt-4"
          />
        ) : null}
        <DialogFooter>
          <Button variant="primary" onClick={send} disabled={!stars || pending}>
            {pending ? "Sending…" : rated ? "Update rating" : "Send rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
