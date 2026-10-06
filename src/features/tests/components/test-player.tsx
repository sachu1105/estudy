"use client";

import { ArrowLeft, ArrowRight, Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { AnswerOption } from "@/components/blocks/answer-option";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { submitTestAction } from "../actions";
import { useTestAnswers } from "../use-test-answers";
import { QuestionPalette } from "./question-palette";
import { SubmitDialog } from "./submit-dialog";
import { TestTimer } from "./test-timer";

type Question = { id: string; body: string; options: string[] };

/**
 * One question per screen, big tap targets, keys 1-4 to answer, arrows to move, F to
 * flag. Answers stay in the browser until submit; the server scores.
 */
export function TestPlayer({
  testId,
  title,
  questions,
  deadline,
  negativeMarking,
}: {
  testId: string;
  title: string;
  questions: Question[];
  deadline: number | null;
  negativeMarking: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [pending, start] = useTransition();
  const { answers, flags, choose, toggleFlag, clear } = useTestAnswers(testId);
  const question = questions[index]!;
  const last = index === questions.length - 1;
  const answered = new Set(Object.keys(answers));

  const submit = () =>
    start(async () => {
      const result = await submitTestAction({
        testId,
        answers: questions.map((q) => ({
          questionId: q.id,
          chosenIndex: answers[q.id] ?? null,
          flagged: flags.has(q.id),
        })),
      });
      if (!result.ok) return void toast.error(result.error);
      clear();
      router.replace(`/tests/${testId}`);
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey)
        return;
      if (/^[1-4]$/.test(e.key)) choose(question.id, Number(e.key) - 1);
      else if (e.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, questions.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      else if (e.key.toLowerCase() === "f") toggleFlag(question.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-small text-ink-muted">
          {title}
        </p>
        {deadline ? <TestTimer deadline={deadline} onExpire={submit} /> : null}
        <QuestionPalette
          ids={questions.map((q) => q.id)}
          current={index}
          answered={answered}
          flagged={flags}
          onJump={setIndex}
        />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-mono text-small text-ink-muted tabular-nums">
          {index + 1} of {questions.length}
          {negativeMarking ? " · a third of a mark off for a wrong answer" : ""}
        </p>
        <h1 className="text-h2 break-words" id="question">
          {question.body}
        </h1>
      </div>
      <div
        role="group"
        aria-labelledby="question"
        className="flex flex-col gap-3"
      >
        {question.options.map((option, i) => (
          <AnswerOption
            key={i}
            index={i}
            text={option}
            state={answers[question.id] === i ? "selected" : "idle"}
            pressed={answers[question.id] === i}
            onSelect={() => choose(question.id, i)}
          />
        ))}
      </div>
      <div className="sticky bottom-0 -mx-4 mt-auto flex items-center gap-2 border-t border-border bg-bg/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous question"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <Button
          variant="ghost"
          aria-pressed={flags.has(question.id)}
          onClick={() => toggleFlag(question.id)}
        >
          <Flag
            className={flags.has(question.id) ? "fill-current" : undefined}
            aria-hidden
          />
          {flags.has(question.id) ? "Flagged" : "Flag"}
        </Button>
        <div className="flex-1" />
        {last ? (
          <SubmitDialog
            answered={answered.size}
            total={questions.length}
            flagged={flags.size}
            pending={pending}
            onSubmit={submit}
          />
        ) : (
          <Button variant="primary" onClick={() => setIndex(index + 1)}>
            Next <ArrowRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
