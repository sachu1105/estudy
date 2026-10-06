import {
  AnswerOption,
  type AnswerState,
} from "@/components/blocks/answer-option";

import { ReportQuestion } from "./report-question";

const SOURCE: Record<string, string> = {
  ADMIN: "Practice question",
  PYQ: "Previous year question",
  AI: "Practice question (AI-written, checked)",
  USER: "Your question",
  MATERIAL: "From your material",
};

/**
 * One answered question: the right option with a check, a wrong pick with a cross (never
 * colour alone), the explanation, and where the question came from (rule 14).
 */
export function ReviewQuestion({
  number,
  question,
}: {
  number: number;
  question: {
    id: string;
    body: string;
    options: string[];
    correctIndex: number;
    chosenIndex: number | null;
    explanation: string | null;
    source: string;
    sourceRef: string | null;
  };
}) {
  const state = (i: number): AnswerState =>
    i === question.correctIndex
      ? "correct"
      : i === question.chosenIndex
        ? "wrong"
        : "dimmed";
  const verdict =
    question.chosenIndex === null
      ? "Left blank"
      : question.chosenIndex === question.correctIndex
        ? "Right"
        : "Wrong";
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="font-mono text-small text-ink-muted tabular-nums">
          {number}.
        </span>
        <p className="min-w-0 flex-1 text-body font-medium break-words">
          {question.body}
        </p>
        <span className="shrink-0 text-small text-ink-muted">{verdict}</span>
      </div>
      <div className="flex flex-col gap-2">
        {question.options.map((option, i) => (
          <AnswerOption
            key={i}
            index={i}
            text={option}
            state={state(i)}
            disabled
          />
        ))}
      </div>
      {question.explanation ? (
        <p className="rounded-control bg-surface-muted p-3 text-body">
          {question.explanation}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-small text-ink-muted">
          {SOURCE[question.source] ?? "Practice question"}
          {question.sourceRef ? ` · ${question.sourceRef}` : ""}
        </span>
        <ReportQuestion questionId={question.id} number={number} />
      </div>
    </li>
  );
}
