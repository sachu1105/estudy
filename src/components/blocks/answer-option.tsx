"use client";

import { Check, X } from "lucide-react";
import { motion, useReducedMotionConfig } from "motion/react";

import { cn } from "@/lib/utils/cn";

export type AnswerState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

type AnswerOptionProps = {
  index: number;
  text: string;
  state: AnswerState;
  disabled?: boolean;
  onSelect: () => void;
};

const styles: Record<AnswerState, string> = {
  idle: "border-border bg-surface hover:border-ink-subtle hover:bg-surface-muted",
  selected: "border-accent bg-accent-soft",
  correct: "border-success bg-success-soft",
  wrong: "border-danger bg-danger-soft",
  dimmed: "border-border bg-surface opacity-60",
};

// Never colour alone: correct carries a check, wrong carries a cross.
export function AnswerOption({
  index,
  text,
  state,
  disabled,
  onSelect,
}: AnswerOptionProps) {
  const reduceMotion = useReducedMotionConfig();
  const letter = String.fromCharCode(65 + index);

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      animate={
        state === "selected" && !reduceMotion
          ? { scale: [0.98, 1] }
          : { scale: 1 }
      }
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-control border px-4 py-3 text-left",
        "transition-colors duration-[200ms] ease-out disabled:cursor-default",
        styles[state],
      )}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-chip font-mono text-small font-medium",
          state === "correct" && "bg-success text-white",
          state === "wrong" && "bg-danger text-white",
          state === "selected" && "bg-accent text-on-accent",
          (state === "idle" || state === "dimmed") &&
            "bg-surface-muted text-ink-muted",
        )}
      >
        {state === "correct" ? (
          <Check className="size-4" aria-label="Correct" />
        ) : null}
        {state === "wrong" ? <X className="size-4" aria-label="Wrong" /> : null}
        {state !== "correct" && state !== "wrong" ? letter : null}
      </span>
      <span className="text-[17px] leading-7 text-ink">{text}</span>
    </motion.button>
  );
}
