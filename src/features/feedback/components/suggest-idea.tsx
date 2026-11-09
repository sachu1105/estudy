"use client";

import { Lightbulb, Plus } from "lucide-react";
import { useState, useTransition } from "react";

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
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { suggestIdeaAction } from "@/features/feedback/actions";
import {
  IDEA_BODY_MAX,
  TITLE_MAX,
  type IdeaArea,
} from "@/lib/feedback/schemas";

import { similarIdeas } from "../similar";
import type { IdeaItem } from "../types";
import { useDraft } from "../use-draft";
import { AreaChips } from "./area-chips";
import { CreditCheck } from "./credit-check";

const EMPTY = { title: "", body: "", area: "OTHER" as IdeaArea, credit: true };

/** The page's one filled button: tell the team what you wish studypods did. */
export function SuggestIdea({
  ideas,
  onSent,
}: {
  /** Public ideas, to point at one that's already there. */
  ideas: IdeaItem[];
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, update, clear] = useDraft("feedback-idea", EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const similar = similarIdeas(draft.title, ideas);

  const send = () =>
    start(async () => {
      setError(null);
      const result = await suggestIdeaAction(draft);
      if (!result.ok) return setError(result.error);
      clear();
      setOpen(false);
      onSent();
      toast.success("Idea sent", {
        description: "The team reads it first, then it opens for votes.",
      });
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus aria-hidden /> Suggest an idea
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Suggest an idea</DialogTitle>
          <DialogDescription>
            What would make studying here easier? Small or big, we read every
            one.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="idea-title">Your idea in a few words</Label>
            <Input
              id="idea-title"
              value={draft.title}
              maxLength={TITLE_MAX}
              placeholder="e.g. Malayalam questions in mock tests"
              onChange={(e) => update({ title: e.target.value })}
              aria-invalid={Boolean(error) || undefined}
            />
          </div>
          {similar.length ? (
            <div className="flex flex-col gap-1.5 rounded-chip bg-accent-soft p-3 text-small text-accent-ink">
              <span className="flex items-center gap-1.5 font-medium">
                <Lightbulb className="size-4" aria-hidden /> Already asked? Back
                it instead
              </span>
              <ul className="flex flex-col gap-1">
                {similar.map((idea) => (
                  <li key={idea.id}>
                    <a
                      href={`#idea-${idea.id}`}
                      onClick={() => setOpen(false)}
                      className="underline-offset-2 hover:underline"
                    >
                      {idea.title}
                    </a>{" "}
                    <span className="opacity-75">· {idea.votes} votes</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="idea-body">How would it help you? (optional)</Label>
            <Textarea
              id="idea-body"
              rows={3}
              value={draft.body}
              maxLength={IDEA_BODY_MAX}
              placeholder="What you'd do with it, and what you do today instead."
              onChange={(e) => update({ body: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-ink">
              Which part of studypods?
            </span>
            <AreaChips
              value={draft.area}
              onChange={(area) => update({ area })}
            />
          </div>
          <CreditCheck
            checked={draft.credit}
            onChange={(credit) => update({ credit })}
          >
            Show my name on it, and on the contributors wall if it ships
          </CreditCheck>
          {error ? (
            <p role="alert" className="text-small text-danger-ink">
              {error}
            </p>
          ) : null}
          <DialogFooter className="mt-2">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Sending…" : "Send idea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
