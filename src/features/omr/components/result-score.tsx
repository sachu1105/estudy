import { Check, KeyRound } from "lucide-react";
import Link from "next/link";

import { StatCell, StatStrip } from "@/components/blocks/stat-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatScore, sub, times, type Fraction } from "@/lib/omr/fraction";
import type { Marking } from "@/lib/omr/marking";
import type { Score } from "@/lib/omr/score";
import { clock } from "@/lib/omr/timer";

/** Against the cut-off: over it (with a tick), how far short, or not decided yet. */
function CutoffLine({
  score,
  cutoff,
}: {
  score: Score;
  cutoff: Fraction | null;
}) {
  if (cutoff === null) return null;
  const mark = formatScore(cutoff);
  if (score.passed === true)
    return (
      <Badge tone="success" className="self-start">
        <Check aria-hidden /> Cleared the cut-off of {mark}
      </Badge>
    );
  if (score.passed === false)
    return (
      <p className="text-small text-ink-muted">
        {formatScore(sub(cutoff, score.score))} short of the cut-off of {mark}
      </p>
    );
  return (
    <p className="text-small text-ink-muted">
      Cut-off {mark}: decided once every question is keyed.
    </p>
  );
}

/**
 * The score, large, then the cut-off, then right / wrong / blank / time in one strip.
 * With no key yet it says so and offers the key instead.
 */
export function ResultScore({
  paperId,
  score,
  marking,
  timeUsedSec,
  limitSec,
}: {
  paperId: string;
  score: Score;
  marking: Marking;
  timeUsedSec: number;
  limitSec: number | null;
}) {
  const keyLink = `/omr/${paperId}/key`;
  const total = score.outcomes.length;

  if (score.unkeyed === total)
    return (
      <Card className="flex flex-col items-start gap-3 p-5">
        <p className="text-micro text-ink-muted uppercase">Not scored yet</p>
        <p className="text-body">
          This sheet has no answer key to be marked against. Add the key and
          your score appears here, for this sitting and every other.
        </p>
        <Button asChild variant="primary">
          <Link href={keyLink}>
            <KeyRound aria-hidden /> Add the answer key
          </Link>
        </Button>
        {timeUsedSec > 0 ? (
          <p className="font-mono text-small text-ink-muted tabular-nums">
            Time {clock(timeUsedSec)}
          </p>
        ) : null}
      </Card>
    );

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-2 p-5">
        <p className="text-micro text-ink-muted uppercase">Your score</p>
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-display font-semibold tabular-nums">
            {formatScore(score.score)}
          </span>
          <span className="font-mono text-h3 text-ink-muted tabular-nums">
            / {formatScore(score.max)}
          </span>
        </p>
        <CutoffLine score={score} cutoff={marking.cutoff} />
        {score.unkeyed > 0 ? (
          <p className="text-small text-ink-muted">
            {score.unkeyed} question{score.unkeyed === 1 ? " has" : "s have"} no
            key yet, so {score.unkeyed === 1 ? "it isn't" : "they aren't"}{" "}
            scored.{" "}
            <Link
              href={keyLink}
              className="font-medium text-accent-ink underline-offset-2 hover:underline"
            >
              Finish the key
            </Link>
          </p>
        ) : null}
        {score.cancelled > 0 ? (
          <p className="text-small text-ink-muted">
            {score.cancelled} cancelled:{" "}
            {marking.cancelled === "AWARD"
              ? "everyone gets the mark."
              : "left out, and the score scaled to the full total."}
          </p>
        ) : null}
      </Card>
      <StatStrip>
        <StatCell
          label="Right"
          value={score.right}
          hint={`+${formatScore(times(marking.right, score.right))} marks`}
        />
        <StatCell
          label="Wrong"
          value={score.wrong}
          hint={
            marking.wrong.n === 0
              ? "No negative marking"
              : `−${formatScore(score.lost)} marks`
          }
        />
        <StatCell
          label="Blank"
          value={score.blank}
          hint="No marks either way"
        />
        <StatCell
          label="Time"
          value={timeUsedSec > 0 ? clock(timeUsedSec) : "–"}
          hint={
            timeUsedSec === 0
              ? "Handed in without the clock"
              : limitSec === null
                ? "No time limit"
                : `of ${clock(limitSec)}`
          }
        />
      </StatStrip>
    </div>
  );
}
