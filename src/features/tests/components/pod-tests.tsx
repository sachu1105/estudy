import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { StartTestButton } from "./start-test-button";

type Attempt = {
  id: string;
  mockTestId: string;
  correct: number;
  total: number;
  accuracy: number;
  mockTest: { title: string };
};

/** A subject pod's tests: a section mock to take, and every result so far. */
export function PodTests({
  subjectId,
  attempts,
}: {
  subjectId: string | null;
  attempts: Attempt[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {subjectId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
          <p className="min-w-0 flex-1 text-body text-ink-muted">
            25 questions across this subject&apos;s topics, PSC timing, a third of a
            mark off for a wrong answer. Practice a single topic from its page.
          </p>
          <StartTestButton kind="subject" id={subjectId} label="Section mock" />
        </div>
      ) : null}
      {attempts.length === 0 ? (
        <p className="text-body text-ink-muted">
          No tests for this subject yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {attempts.map((a) => (
            <li key={a.id}>
              <Link
                href={`/tests/${a.mockTestId}`}
                className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body">{a.mockTest.title}</span>
                  <span className="text-small text-ink-muted">
                    {a.correct} of {a.total} right
                  </span>
                </span>
                <span className="font-mono text-body tabular-nums">
                  {Math.round(a.accuracy * 100)}%
                </span>
                <ChevronRight className="size-4 text-ink-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
