import { CalendarClock, Hash, ListOrdered, Timer } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ExamStatus } from "@/lib/omr/exam";
import { formatScore, type Fraction } from "@/lib/omr/fraction";
import { describeMarking, type Marking } from "@/lib/omr/marking";
import type { Shape } from "@/lib/omr/marks";

export type ExamOverviewProps = {
  id: string;
  paper: {
    id: string;
    shape: Shape;
    marking: Marking;
    limitMin: number | null;
  };
  status: ExamStatus;
  released: boolean;
  host: boolean;
  started: number;
  /** Times already written out in the reader's time zone. */
  when: { opens: string; closes: string | null; results: string | null };
  mine: { registerNo: number; submissionId: string | null } | null;
  /** The reader's own score once results are out. */
  myScore: { score: Fraction; max: Fraction } | null;
};

function Fact({
  icon: Icon,
  children,
}: {
  icon: typeof Timer;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-small">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/** The one thing to do next, as a button, or where the reader stands, as a line. */
function NextStep(p: ExamOverviewProps) {
  const sit = `/omr/${p.paper.id}?exam=${p.id}`;
  if (p.host)
    return (
      <p className="text-small text-ink-muted">
        You shared this exam. {p.started} started so far.
      </p>
    );
  if (p.mine?.submissionId) {
    if (!p.released)
      return (
        <p className="text-small text-ink-muted">
          Handed in. Your score and the key come out{" "}
          {p.when.results ? `at ${p.when.results}` : "soon"}.
        </p>
      );
    return (
      <Button asChild variant="primary" className="self-start">
        <Link href={`/omr/${p.paper.id}/result/${p.mine.submissionId}`}>
          <ListOrdered aria-hidden /> Your answers
        </Link>
      </Button>
    );
  }
  if (p.status === "upcoming")
    return <p className="text-small text-ink-muted">Opens {p.when.opens}.</p>;
  if (p.status === "closed")
    return (
      <p className="text-small text-ink-muted">
        This exam has closed.{" "}
        <Link
          href={`/omr/${p.paper.id}`}
          className="font-medium text-accent-ink hover:underline"
        >
          Practise on the paper
        </Link>
      </p>
    );
  return (
    <Button asChild variant="primary" className="self-start">
      <Link href={sit}>
        <Timer aria-hidden /> {p.mine ? "Continue exam" : "Start exam"}
      </Link>
    </Button>
  );
}

/**
 * The exam at a glance: how it's marked, its time, when it opens and closes and when
 * results come out, the reader's register number and score, and the next step.
 */
export function ExamOverview(p: ExamOverviewProps) {
  const { shape, marking, limitMin } = p.paper;
  return (
    <Card className="flex flex-col gap-4 p-5">
      {p.myScore ? (
        <div className="flex flex-col">
          <span className="text-micro text-ink-muted uppercase">
            Your score
          </span>
          <span className="flex items-baseline gap-2">
            <span className="font-heading text-display font-semibold tabular-nums">
              {formatScore(p.myScore.score)}
            </span>
            <span className="font-mono text-h3 text-ink-muted tabular-nums">
              / {formatScore(p.myScore.max)}
            </span>
          </span>
        </div>
      ) : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        <Fact icon={Timer}>
          {shape.questions} questions · {describeMarking(marking)} ·{" "}
          {limitMin ? `${limitMin} min` : "no time limit"}
          {marking.cutoff ? ` · cut-off ${formatScore(marking.cutoff)}` : ""}
        </Fact>
        <Fact icon={CalendarClock}>
          {p.status === "upcoming"
            ? `Opens ${p.when.opens}`
            : `Opened ${p.when.opens}`}
          {p.when.closes
            ? ` · ${p.status === "closed" ? "closed" : "closes"} ${p.when.closes}`
            : " · never closes"}
        </Fact>
        <Fact icon={ListOrdered}>
          {p.released
            ? "Results are out"
            : `Results ${p.when.results ? `at ${p.when.results}` : "as each sheet is handed in"}`}
        </Fact>
        {p.mine ? (
          <Fact icon={Hash}>
            Your register number{" "}
            <span className="font-mono font-medium tabular-nums">
              {p.mine.registerNo}
            </span>
          </Fact>
        ) : null}
      </ul>
      <NextStep {...p} />
    </Card>
  );
}
