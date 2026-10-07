"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type Choice<V extends string> = {
  value: V;
  label: string;
  description: string;
};

/** A short list of options as dense rows, one picked. Arrow keys move like any radio group. */
export function ChoiceRows<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Choice<V>[];
  value: V;
  onChange: (value: V) => void;
}) {
  const pick = (i: number, row: HTMLElement) => {
    const next = (i + options.length) % options.length;
    onChange(options[next]!.value);
    row.parentElement?.querySelectorAll("button")[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-col overflow-hidden rounded-xl border border-border"
    >
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              const step =
                e.key === "ArrowDown" || e.key === "ArrowRight"
                  ? 1
                  : e.key === "ArrowUp" || e.key === "ArrowLeft"
                    ? -1
                    : 0;
              if (!step) return;
              e.preventDefault();
              pick(i + step, e.currentTarget);
            }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors duration-[120ms] last:border-b-0",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none focus-visible:ring-inset",
              selected ? "bg-accent-soft" : "bg-surface hover:bg-surface-muted",
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span
                className={cn(
                  "text-small font-medium",
                  selected ? "text-accent-ink" : "text-ink",
                )}
              >
                {option.label}
              </span>
              <span className="text-small text-ink-muted">
                {option.description}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                selected
                  ? "border-accent bg-accent text-on-accent"
                  : "border-border bg-surface",
              )}
            >
              {selected && <Check className="size-3" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
