"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatScore } from "@/lib/omr/fraction";
import { CANCEL_RULES, describeMarking, type Marking } from "@/lib/omr/marking";
import { letters, type Shape } from "@/lib/omr/marks";

import { MarkingForm } from "./marking-form";

/**
 * How the paper is marked, folded to one line until it's edited: the settings are set
 * once, the key is where the work is.
 */
export function MarkingCard({
  paperId,
  shape,
  marking,
  limitMin,
  startOpen,
}: {
  paperId: string;
  shape: Shape;
  marking: Marking;
  limitMin: number | null;
  startOpen: boolean;
}) {
  const [editing, setEditing] = useState(startOpen);
  const optionLetters = letters(shape.options);
  const facts = [
    `${shape.questions} questions, ${optionLetters[0]}–${optionLetters.at(-1)}`,
    describeMarking(marking),
    marking.cutoff ? `cut-off ${formatScore(marking.cutoff)}` : "no cut-off",
    limitMin === null ? "no time limit" : `${limitMin} min`,
    `cancelled: ${CANCEL_RULES.find((r) => r.value === marking.cancelled)?.label.toLowerCase()}`,
  ];

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="font-heading text-h2 font-semibold">Marking</h2>
          {editing ? null : (
            <p className="text-small text-ink-muted">{facts.join(" · ")}</p>
          )}
        </div>
        {editing ? null : (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil aria-hidden /> Edit
          </Button>
        )}
      </div>
      {editing ? (
        <MarkingForm
          paperId={paperId}
          shape={shape}
          marking={marking}
          limitMin={limitMin}
          onDone={() => setEditing(false)}
        />
      ) : null}
    </Card>
  );
}
