import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * A few numbers in one bordered strip, split by hairlines: 2 across on a phone, 4 from
 * lg. Used where stats support the page rather than being the page (Today, exam pods).
 */
export function StatStrip({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCell({
  label,
  value,
  hint,
  bar,
  aside,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  /** 0-100: a thin progress bar under the value. */
  bar?: number;
  /** A small control in the top corner, e.g. an info button. */
  aside?: ReactNode;
}) {
  const plain = typeof value === "string" || typeof value === "number";
  return (
    <div className="flex min-w-0 flex-col gap-1.5 bg-surface p-4">
      <div className="flex items-start justify-between gap-1">
        <span className="text-micro text-ink-muted uppercase">{label}</span>
        {aside}
      </div>
      <span
        className={cn(
          "flex h-8 min-w-0 items-center",
          plain &&
            "truncate font-mono text-h2 font-medium text-ink tabular-nums",
        )}
      >
        {value}
      </span>
      {bar === undefined ? null : (
        <span className="h-1 overflow-hidden rounded-full bg-surface-muted">
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-[300ms]"
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </span>
      )}
      <span className="text-small text-balance text-ink-muted">{hint}</span>
    </div>
  );
}
