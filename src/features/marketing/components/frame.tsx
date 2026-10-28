import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

// The middle of the landing page is drawn on one sheet, like a drafting board: two side
// rules run its full height at the content width, every band ends on a rule across the
// whole page, and an accent mark sits where the rules cross. The hero above it and the
// footer below stay open. Under 768px the side rules drop away and only the rules across
// remain.

/** The sheet: its bands stack inside, with the side rules behind them. */
export function Sheet({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block md:px-8"
      >
        <div className="mx-auto h-full max-w-content border-x border-border" />
      </div>
      {children}
    </div>
  );
}

const marks = {
  top: [
    "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
    "top-0 right-0 translate-x-1/2 -translate-y-1/2",
  ],
  bottom: [
    "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
    "right-0 bottom-0 translate-x-1/2 translate-y-1/2",
  ],
};

function Mark({ at }: { at: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute z-10 hidden size-[7px] bg-accent md:block", at)}
    />
  );
}

type BandProps = {
  as?: "section" | "div" | "footer";
  /** The sheet's first band: it draws the rule above it and marks the top corners. */
  first?: boolean;
  /** Classes for the column inside the side rules: grids, padding, a pattern. */
  inner?: string;
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">;

/**
 * One stretch of the sheet. The rule under it spans the page; its content sits in the
 * column between the side rules and brings its own padding.
 */
export function Band({
  as: Tag = "section",
  first = false,
  inner,
  className,
  children,
  ...props
}: BandProps) {
  return (
    <Tag
      className={cn(
        "border-b border-border md:px-8",
        first && "border-t",
        className,
      )}
      {...props}
    >
      <div className={cn("relative mx-auto max-w-content", inner)}>
        {first ? marks.top.map((at) => <Mark key={at} at={at} />) : null}
        {marks.bottom.map((at) => (
          <Mark key={at} at={at} />
        ))}
        {children}
      </div>
    </Tag>
  );
}
