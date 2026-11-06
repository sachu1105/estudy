import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";

import { formatScore, type Fraction } from "@/lib/omr/fraction";
import type { Marks } from "@/lib/omr/marks";
import type { TimerView } from "@/lib/omr/timer";

import { AttemptBadge, standingOf } from "../paper-card";

export type BundlePaper = {
  id: string;
  title: string;
  questions: number;
  limitMin: number | null;
  /** The reader's own sheet and hand-ins for it, once the bundle is open to them. */
  sat: {
    marks: Marks;
    timer: TimerView;
    attempts: number;
    last: { score: Fraction; max: Fraction; keyed: boolean } | null;
  } | null;
};

/** What the row's action says: start, carry on, or go again. */
function action(sat: NonNullable<BundlePaper["sat"]>) {
  const standing = standingOf(sat);
  if (standing === "going") return "Continue";
  return standing === "done" ? "Sit again" : "Start";
}

/**
 * The bundle's papers, numbered in order. Open, each one says whether it's been
 * attempted and the last score, and opens to sit; locked, it shows what's inside.
 */
export function BundlePapers({
  papers,
  open,
}: {
  papers: BundlePaper[];
  open: boolean;
}) {
  const attempted = papers.filter((p) => (p.sat?.attempts ?? 0) > 0).length;
  return (
    <section aria-labelledby="bundle-papers" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="bundle-papers" className="font-heading text-h2 font-semibold">
          Papers
        </h2>
        {open ? (
          <p className="text-small text-ink-muted">
            <span className="font-mono font-medium text-ink tabular-nums">
              {attempted} of {papers.length}
            </span>{" "}
            attempted
          </p>
        ) : null}
      </div>
      <ol className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {papers.map((p, i) => {
          const last = p.sat?.last;
          const body = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted font-mono text-small font-medium text-ink-muted tabular-nums">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="line-clamp-2 text-body font-medium break-words">
                  {p.title.replaceAll("_", " ")}
                </span>
                <span className="text-small text-ink-muted">
                  {p.questions} questions
                  {p.limitMin ? ` · ${p.limitMin} min` : ""}
                  {last?.keyed
                    ? ` · last ${formatScore(last.score)} of ${formatScore(last.max)}`
                    : ""}
                </span>
                {p.sat ? (
                  <span className="flex">
                    <AttemptBadge sheet={p.sat} />
                  </span>
                ) : null}
              </span>
              {p.sat ? (
                <span className="flex shrink-0 items-center gap-1 text-small font-medium text-accent-ink">
                  {/* The word from 640px; on a phone the arrow says it. */}
                  <span className="sr-only sm:not-sr-only">
                    {action(p.sat)}
                  </span>
                  <ChevronRight className="size-4" aria-hidden />
                </span>
              ) : (
                <Lock
                  className="size-4 shrink-0 text-ink-muted"
                  aria-label="Locked"
                />
              )}
            </>
          );
          return (
            <li key={p.id}>
              {open ? (
                <Link
                  href={`/omr/${p.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-muted"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex min-h-16 items-center gap-3 px-4 py-3">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
