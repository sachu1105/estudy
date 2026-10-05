"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";

import { AnswerOption, type AnswerState } from "./answer-option";

type QuestionCardProps = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  onAnswer?: (index: number, correct: boolean) => void;
};

function stateFor(
  index: number,
  chosen: number | null,
  correctIndex: number,
): AnswerState {
  if (chosen === null) return "idle";
  if (index === correctIndex) return "correct";
  if (index === chosen) return "wrong";
  return "dimmed";
}

// Signature micro-interaction: the chosen option settles, then the correct one is revealed.
export function QuestionCard({
  question,
  options,
  correctIndex,
  explanation,
  onAnswer,
}: QuestionCardProps) {
  const [chosen, setChosen] = useState<number | null>(null);

  function choose(index: number) {
    if (chosen !== null) return;
    setChosen(index);
    onAnswer?.(index, index === correctIndex);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <p className="text-[17px] leading-7 font-medium text-ink">{question}</p>
        <div
          className="flex flex-col gap-2"
          role="group"
          aria-label="Answer options"
        >
          {options.map((option, index) => (
            <AnswerOption
              key={option}
              index={index}
              text={option}
              state={stateFor(index, chosen, correctIndex)}
              disabled={chosen !== null}
              onSelect={() => choose(index)}
            />
          ))}
        </div>
        <AnimatePresence>
          {chosen !== null && explanation ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="rounded-control bg-surface-muted p-4 text-body text-ink-muted"
              aria-live="polite"
            >
              {explanation}
            </motion.p>
          ) : null}
        </AnimatePresence>
        {chosen !== null ? (
          <button
            type="button"
            onClick={() => setChosen(null)}
            className="self-start text-small text-accent hover:underline"
          >
            Try again
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
