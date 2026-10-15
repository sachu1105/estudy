import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * One block of settings: a heading, a line saying what it is for, and the controls.
 * Every section on the page is built from this, so they line up and the page reads as
 * one list rather than a pile of differently-shaped cards.
 */
export function SettingsSection({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Controls that belong beside the heading rather than in the body. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  // Derived from the title so it is the same on the server and in the browser.
  const id = `settings-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "rounded-card border border-border bg-surface p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {icon ? (
            <span
              aria-hidden
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted"
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 id={id} className="text-h3">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-small text-ink-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
