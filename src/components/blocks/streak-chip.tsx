"use client";

import { Flame } from "lucide-react";
import { motion, useReducedMotionConfig } from "motion/react";

import { cn } from "@/lib/utils/cn";

type StreakChipProps = {
  days: number;
  /** Change this key (e.g. to today's date) to play the one-time flicker. */
  celebrateKey?: string | number | null;
  className?: string;
};

// The streak colour appears here and nowhere else. The flicker plays once per celebrateKey,
// with the one gradient the design system allows: a faint glow behind the flame.
export function StreakChip({
  days,
  celebrateKey = null,
  className,
}: StreakChipProps) {
  const reduceMotion = useReducedMotionConfig();
  const play = celebrateKey !== null && !reduceMotion;

  return (
    <span
      className={cn(
        "relative inline-flex h-8 items-center gap-1.5 rounded-full bg-streak-soft pr-3 pl-2 text-streak-ink",
        className,
      )}
      aria-label={`${days} day streak`}
    >
      <span className="relative grid size-5 place-items-center">
        {play ? (
          <motion.span
            key={`glow-${celebrateKey}`}
            aria-hidden
            className="absolute -inset-2 rounded-full bg-[radial-gradient(circle,var(--accent)_0%,transparent_70%)]"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.35, 0], scale: [0.6, 1.4, 1.6] }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        ) : null}
        <motion.span
          key={`flame-${celebrateKey}`}
          className="relative text-streak"
          initial={false}
          animate={
            play
              ? { scale: [1, 1.3, 0.92, 1.12, 1], rotate: [0, -10, 7, -3, 0] }
              : undefined
          }
          // Multi-keyframe flicker: springs only interpolate two keyframes, so this is a tween.
          transition={{
            duration: 0.7,
            ease: "easeOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <Flame className="size-4 fill-current" aria-hidden />
        </motion.span>
      </span>
      <span className="font-mono text-small font-medium tabular-nums">
        {days}
      </span>
    </span>
  );
}
