"use client";

import type { LucideIcon } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils/cn";

import type { Choice } from "./choice-rows";

export type TileChoice<V extends string> = Choice<V> & { icon: LucideIcon };

/**
 * A few options as small tiles side by side, one picked, with only the picked one's
 * description beneath: the compact sibling of ChoiceRows, for a dialog that has to fit
 * a phone. Arrow keys move like any radio group.
 */
export function ChoiceTiles<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: TileChoice<V>[];
  value: V;
  onChange: (value: V) => void;
}) {
  const picked = options.find((o) => o.value === value);
  const hintId = useId();
  const pick = (i: number, tile: HTMLElement) => {
    const next = (i + options.length) % options.length;
    onChange(options[next]!.value);
    tile.parentElement?.querySelectorAll("button")[next]?.focus();
  };
  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option, i) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-describedby={selected ? hintId : undefined}
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
                "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-control border px-1 py-2 text-center transition-colors duration-[120ms]",
                "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
                selected
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="text-small leading-tight font-medium">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      {picked ? (
        <p id={hintId} className="text-small text-ink-muted">
          {picked.description}
        </p>
      ) : null}
    </div>
  );
}
