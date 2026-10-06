import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { QuestionDecide } from "./question-decide";
import { QuestionForm } from "./question-form";

type Question = {
  id: string;
  topicKey: string;
  difficulty: number;
  language: "EN" | "ML";
  body: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  sourceRef: string | null;
  status: "PENDING" | "VERIFIED" | "SUPPRESSED";
  reportCount: number;
  reports: { reason: string; note: string | null }[];
};

const REASON: Record<string, string> = {
  WRONG_ANSWER: "wrong answer",
  UNCLEAR: "unclear",
  TYPO: "typo",
  OTHER: "other",
};

/** One question for review: the answer marked with a check (not colour alone). */
export function AdminQuestion({ q }: { q: Question }) {
  const decisions =
    q.status === "PENDING"
      ? (["VERIFIED", "DELETE"] as const)
      : q.status === "VERIFIED"
        ? (["SUPPRESSED", "DELETE"] as const)
        : (["VERIFIED", "DELETE"] as const);
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-small text-ink-muted">
        <Badge tone="outline">{q.topicKey}</Badge>
        <span>difficulty {q.difficulty}</span>
        {q.language === "ML" ? <span>Malayalam</span> : null}
        {q.sourceRef ? <span>· {q.sourceRef}</span> : null}
      </div>
      <p className="text-body font-medium break-words">{q.body}</p>
      <ol className="flex flex-col gap-1 text-body">
        {q.options.map((o, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="font-mono text-small text-ink-muted">
              {String.fromCharCode(65 + i)}
            </span>
            <span className={i === q.correctIndex ? "font-medium" : undefined}>
              {o}
            </span>
            {i === q.correctIndex ? (
              <span className="flex items-center gap-1 text-small text-success-ink">
                <Check className="size-3.5" aria-hidden /> answer
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {q.explanation ? (
        <p className="text-small text-ink-muted">{q.explanation}</p>
      ) : null}
      {q.reports.length > 0 ? (
        <ul className="flex flex-col gap-0.5 rounded-control bg-surface-muted p-2 text-small">
          {q.reports.map((r, i) => (
            <li key={i}>
              Reported: {REASON[r.reason] ?? r.reason}
              {r.note ? ` · "${r.note}"` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <QuestionDecide ids={[q.id]} decisions={[...decisions]} />
        <QuestionForm
          id={q.id}
          initial={{
            topicName: q.topicKey,
            difficulty: q.difficulty,
            language: q.language,
            body: q.body,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            sourceRef: q.sourceRef,
          }}
        />
      </div>
    </li>
  );
}
