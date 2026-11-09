"use client";

import { AREA_LABEL, IDEA_AREAS, type IdeaArea } from "@/lib/feedback/schemas";
import { cn } from "@/lib/utils/cn";

/** Which part of the app an idea is about: one chip picked, wrapping on a phone. */
export function AreaChips({
  value,
  onChange,
}: {
  value: IdeaArea;
  onChange: (area: IdeaArea) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Part of the app"
      className="flex flex-wrap gap-2"
    >
      {IDEA_AREAS.map((area) => {
        const on = area === value;
        return (
          <button
            key={area}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(area)}
            className={cn(
              "h-11 cursor-pointer rounded-chip border px-3 text-small font-medium transition-colors duration-[120ms] md:h-9",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
              on
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            {AREA_LABEL[area]}
          </button>
        );
      })}
    </div>
  );
}
