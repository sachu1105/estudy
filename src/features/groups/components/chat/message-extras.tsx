"use client";

import {
  Check,
  CircleCheck,
  ClipboardCheck,
  CircleHelp,
  CornerDownRight,
} from "lucide-react";

import type { PendingMessage } from "@/lib/squads/chat-types";
import { cn } from "@/lib/utils/cn";

import { TakeGroupTest } from "../group-test-controls";

/**
 * What a message is besides its words: a poll to vote on, a doubt waiting for answers,
 * an answer its asker chose, or a mock test to take.
 */
export function MessageExtras({
  groupId,
  message: m,
  onVote,
  onAnswer,
  onChoose,
}: {
  groupId: string;
  message: PendingMessage;
  onVote: (optionId: string) => void;
  /** Starts a reply to this doubt. */
  onAnswer: () => void;
  onChoose: (best: boolean) => void;
}) {
  if (m.deleted) return null;
  return (
    <>
      {m.poll ? (
        <Poll poll={m.poll} pending={!!m.pending} onVote={onVote} />
      ) : null}
      {m.doubt ? <DoubtFooter doubt={m.doubt} onAnswer={onAnswer} /> : null}
      {m.answer ? <AnswerMark answer={m.answer} onChoose={onChoose} /> : null}
      {m.test ? <TestCard groupId={groupId} test={m.test} /> : null}
    </>
  );
}

/** Each choice fills with its share of the votes once anyone has voted. */
function Poll({
  poll,
  pending,
  onVote,
}: {
  poll: NonNullable<PendingMessage["poll"]>;
  pending: boolean;
  onVote: (optionId: string) => void;
}) {
  return (
    <div className="flex max-w-sm flex-col gap-1.5">
      <ul className="flex flex-col gap-1.5">
        {poll.options.map((o) => {
          const share = poll.total ? o.votes / poll.total : 0;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={pending}
                aria-pressed={o.mine}
                onClick={() => onVote(o.id)}
                className={cn(
                  "relative flex min-h-11 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-control border bg-surface px-3 text-left transition-colors duration-[120ms] hover:border-ink-subtle disabled:cursor-default",
                  o.mine ? "border-accent" : "border-border",
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-accent-soft transition-[width] duration-[300ms]"
                  style={{ width: `${share * 100}%` }}
                />
                <span
                  aria-hidden
                  className={cn(
                    "relative grid size-5 shrink-0 place-items-center rounded-full border",
                    o.mine
                      ? "border-accent bg-accent text-on-accent"
                      : "border-ink-subtle",
                  )}
                >
                  {o.mine ? <Check className="size-3" /> : null}
                </span>
                <span className="relative min-w-0 flex-1 text-body break-words">
                  {o.text}
                </span>
                <span className="relative font-mono text-small text-ink-muted tabular-nums">
                  {o.votes}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-small text-ink-muted">
        {poll.total} vote{poll.total === 1 ? "" : "s"} · tap again to take yours
        back
      </p>
    </div>
  );
}

function DoubtFooter({
  doubt,
  onAnswer,
}: {
  doubt: NonNullable<PendingMessage["doubt"]>;
  onAnswer: () => void;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-muted">
      <span className="inline-flex items-center gap-1 font-medium text-ink">
        <CircleHelp className="size-4 text-accent" aria-hidden /> Doubt
      </span>
      <span>
        {doubt.answers} answer{doubt.answers === 1 ? "" : "s"}
      </span>
      {doubt.acceptedId ? (
        <a
          href={`#m-${doubt.acceptedId}`}
          className="inline-flex items-center gap-1 font-medium text-success"
        >
          <CircleCheck className="size-4" aria-hidden /> Answered
        </a>
      ) : null}
      <button
        type="button"
        onClick={onAnswer}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-medium text-accent-ink hover:underline"
      >
        <CornerDownRight className="size-4" aria-hidden /> Answer
      </button>
    </p>
  );
}

/** The chosen answer says so; whoever asked can choose (or unchoose) from here. */
function AnswerMark({
  answer,
  onChoose,
}: {
  answer: NonNullable<PendingMessage["answer"]>;
  onChoose: (best: boolean) => void;
}) {
  if (!answer.best && !answer.canChoose) return null;
  return (
    <p className="flex flex-wrap items-center gap-3 text-small">
      {answer.best ? (
        <span className="inline-flex items-center gap-1 font-medium text-success">
          <CircleCheck className="size-4" aria-hidden /> Best answer
        </span>
      ) : null}
      {answer.canChoose ? (
        <button
          type="button"
          onClick={() => onChoose(!answer.best)}
          className="inline-flex min-h-11 cursor-pointer items-center font-medium text-accent-ink hover:underline"
        >
          {answer.best ? "Not the best answer" : "Mark as best answer"}
        </button>
      ) : null}
    </p>
  );
}

function TestCard({
  groupId,
  test,
}: {
  groupId: string;
  test: NonNullable<PendingMessage["test"]>;
}) {
  return (
    <div className="flex max-w-sm flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
        <ClipboardCheck className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">{test.title}</span>
        <span className="text-small text-ink-muted">
          Mock test · {test.questions} questions
          {test.minutes ? ` · ${test.minutes} min` : " · untimed"}
        </span>
      </span>
      <TakeGroupTest
        groupId={groupId}
        groupTestId={test.id}
        label="Take test"
      />
    </div>
  );
}
