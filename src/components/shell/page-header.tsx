import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  title: string;
  /** A mark after the title, like the verified seal. */
  badge?: ReactNode;
  description?: string;
  actions?: ReactNode;
  /**
   * The actions are small (icon buttons, a menu): keep them beside the title on a phone
   * instead of wrapping them onto a row of their own.
   */
  inlineActions?: boolean;
};

export function PageHeader({
  title,
  badge,
  description,
  actions,
  inlineActions = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex justify-between gap-4",
        inlineActions ? "items-start" : "flex-wrap items-end",
      )}
    >
      <div className={cn("flex flex-col gap-1", inlineActions && "min-w-0")}>
        <h1>
          {title}
          {badge ? <> {badge}</> : null}
        </h1>
        {description ? (
          <p className="text-body text-ink-muted">{description}</p>
        ) : null}
      </div>
      {inlineActions ? <div className="shrink-0">{actions}</div> : actions}
    </div>
  );
}
