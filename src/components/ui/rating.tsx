"use client";

import { Star, type LucideIcon } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils/cn";

type RatingProps = {
  /** 1 to `words.length`. */
  value: number;
  onChange: (value: number) => void;
  /** Names the group for screen readers, e.g. "Weight of Preamble". */
  label: string;
  /** One word per level, low to high: read out, and shown as a tooltip. */
  words: string[];
  icon?: LucideIcon;
  /** "sm" sits in a dense row (mouse); "lg" is for touch, 44px a step. */
  size?: "sm" | "lg";
  className?: string;
};

/**
 * A 1-5 scale as a row of icons: tap the third star for 3. A radio group underneath,
 * so arrow keys move it and screen readers say "3, medium, 3 of 5".
 */
export function Rating({
  value,
  onChange,
  label,
  words,
  icon: Icon = Star,
  size = "sm",
  className,
}: RatingProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const max = words.length;
  const move = (e: KeyboardEvent, to: number) => {
    e.preventDefault();
    const next = Math.min(max, Math.max(1, to));
    onChange(next);
    refs.current[next - 1]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex items-center", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") move(e, value + 1);
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") move(e, value - 1);
        if (e.key === "Home") move(e, 1);
        if (e.key === "End") move(e, max);
      }}
    >
      {words.map((word, i) => {
        const level = i + 1;
        const on = level <= value;
        return (
          <button
            key={word}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={level === value}
            aria-label={`${level}, ${word}`}
            title={`${level} · ${word}`}
            tabIndex={level === value ? 0 : -1}
            onClick={() => onChange(level)}
            className={cn(
              "grid shrink-0 cursor-pointer place-items-center rounded-chip transition-[color,transform] duration-[120ms] active:scale-90",
              size === "lg" ? "size-11" : "h-8 w-6",
              on ? "text-accent" : "text-ink-subtle hover:text-ink-muted",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                size === "lg" ? "size-6" : "size-4",
                on && "fill-current",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
