"use client";

import { ToggleGroup } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Required when `label` is icon-only. */
  ariaLabel?: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix emits "" when the active item is clicked again; keep the selection.
      onValueChange={(next) => next && onValueChange(next as T)}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-control bg-surface-muted p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel}
            className={cn(
              "relative flex cursor-pointer items-center justify-center gap-1.5 rounded-[9px] font-heading font-medium",
              "transition-[background-color,color,box-shadow] duration-[200ms] ease-out [&_svg]:size-4",
              size === "sm"
                ? "h-8 px-2.5 text-small md:h-7"
                : "h-10 px-3.5 text-small md:h-8",
              // CSS-only active state, so the theme toggle adds no animation library to public pages.
              active
                ? "bg-surface text-ink shadow-sm dark:bg-border"
                : "text-ink-muted hover:text-ink",
            )}
          >
            <span className="relative flex items-center gap-1.5">
              {option.label}
            </span>
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}
