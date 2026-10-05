import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type ChipProps = ComponentProps<"button"> & { selected?: boolean };

/** A toggleable filter or choice. Static labels use Badge instead. */
export function Chip({
  className,
  selected = false,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-chip border px-3 text-small font-medium whitespace-nowrap md:h-8",
        "transition-colors duration-[120ms] ease-out active:scale-[0.98] [&_svg]:size-3.5",
        selected
          ? "border-transparent bg-accent-soft text-accent-ink"
          : "border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}
