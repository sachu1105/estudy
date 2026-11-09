"use client";

import { ChevronUp } from "lucide-react";
import { useState, useTransition } from "react";

import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

import { voteIdeaAction } from "@/features/feedback/actions";

type VoteButtonProps = {
  ideaId: string;
  title: string;
  votes: number;
  voted: boolean;
  /** Closed ideas show their count but take no more votes. */
  open: boolean;
};

/** "I'd use this": counts up the moment it's tapped, and rolls back if it didn't stick. */
export function VoteButton({
  ideaId,
  title,
  votes,
  voted,
  open,
}: VoteButtonProps) {
  const [state, setState] = useState({ votes, voted });
  const [, start] = useTransition();

  const toggle = () => {
    const before = state;
    const on = !state.voted;
    setState({ voted: on, votes: state.votes + (on ? 1 : -1) });
    start(async () => {
      const result = await voteIdeaAction({ id: ideaId, on });
      if (result.ok) setState({ voted: on, votes: result.votes });
      else {
        setState(before);
        toast.error(result.error);
      }
    });
  };

  const count = (
    <span className="font-mono text-small tabular-nums">{state.votes}</span>
  );

  if (!open)
    return (
      <div
        className="flex size-12 shrink-0 flex-col items-center justify-center rounded-control bg-surface-muted text-ink-muted"
        aria-label={`${state.votes} ${state.votes === 1 ? "vote" : "votes"}`}
        role="img"
      >
        <ChevronUp className="size-4" aria-hidden />
        {count}
      </div>
    );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.voted}
      aria-label={`I'd use this: ${title}, ${state.votes} ${state.votes === 1 ? "vote" : "votes"}`}
      className={cn(
        "flex size-12 shrink-0 cursor-pointer flex-col items-center justify-center rounded-control border transition-[background-color,border-color,color,transform] duration-[120ms] active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        state.voted
          ? "border-accent bg-accent-soft text-accent-ink"
          : "border-border bg-surface text-ink-muted hover:border-ink-subtle hover:text-ink",
      )}
    >
      <ChevronUp
        className={cn(
          "size-4 transition-transform duration-[200ms]",
          state.voted && "-translate-y-0.5",
        )}
        aria-hidden
      />
      {count}
    </button>
  );
}
