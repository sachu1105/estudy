"use client";

import { motion, useReducedMotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { useCountUp } from "./use-count-up";

type ProgressRingProps = {
  /** 0-100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  /** Replaces the default percentage in the centre. */
  children?: ReactNode;
  className?: string;
};

// Signature micro-interaction: the ring fills on mount and the number counts up.
export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  label,
  children,
  className,
}: ProgressRingProps) {
  const reduceMotion = useReducedMotionConfig();
  const clamped = Math.min(100, Math.max(0, value));
  const shown = useCountUp(clamped);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="stroke-accent"
          initial={{
            strokeDashoffset: reduceMotion
              ? circumference * (1 - clamped / 100)
              : circumference,
          }}
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{
            duration: reduceMotion ? 0 : 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {children ?? (
          <span className="font-mono text-h3 font-medium tabular-nums">
            {Math.round(shown)}%
          </span>
        )}
      </div>
    </div>
  );
}
