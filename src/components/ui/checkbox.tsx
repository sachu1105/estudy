"use client";

import { motion, useReducedMotionConfig } from "motion/react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root> & {
  /** "success" for task completion, "accent" for plain form choices. */
  tone?: "accent" | "success";
};

// Signature micro-interaction: the tick draws in when checked.
export function Checkbox({
  className,
  tone = "accent",
  checked,
  ...props
}: CheckboxProps) {
  const reduceMotion = useReducedMotionConfig();
  const isChecked = checked === true;

  return (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        "peer grid size-5 shrink-0 cursor-pointer place-items-center rounded-[6px] border-[1.5px] border-ink-subtle bg-surface",
        "transition-colors duration-[120ms] hover:border-ink-muted disabled:cursor-not-allowed disabled:opacity-50",
        tone === "accent"
          ? "data-[state=checked]:border-accent data-[state=checked]:bg-accent"
          : "data-[state=checked]:border-success data-[state=checked]:bg-success",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 text-on-accent" aria-hidden>
        <motion.path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            pathLength: isChecked ? 1 : 0,
            opacity: isChecked ? 1 : 0,
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </svg>
    </CheckboxPrimitive.Root>
  );
}
