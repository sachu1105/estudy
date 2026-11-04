import type { ReactNode } from "react";

import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/**
 * A group of settings: a short heading over one card of dense rows, divided by lines.
 * The page is a few of these, so it reads as a list rather than a pile of cards.
 */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  /** One short line under the heading, for the whole group. */
  description?: string;
  children: ReactNode;
}) {
  // Derived from the title so it is the same on the server and in the browser.
  const id = `settings-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
        <h2 id={id} className="text-h3">
          {title}
        </h2>
        {description ? (
          <p className="text-small text-ink-muted">{description}</p>
        ) : null}
      </div>
      <div className="divide-y divide-border rounded-card border border-border bg-surface">
        {children}
      </div>
    </section>
  );
}

/**
 * One setting: its name (and at most one short line) on the left, its control on the
 * right. `htmlFor` ties the name to the control, so the name labels a switch or field.
 * Anything that only shows once it's on (a link to copy) goes in `below`. A wide control
 * (two time fields) sets `stack`, so on a phone it drops under the name; a switch or a
 * button stays beside it.
 */
export function SettingsRow({
  label,
  hint,
  htmlFor,
  control,
  below,
  stack = false,
  className,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  control?: ReactNode;
  below?: ReactNode;
  stack?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 px-4 py-3", className)}>
      <div
        className={cn(
          "flex min-h-10 items-center justify-between gap-x-4 gap-y-2",
          stack && "flex-wrap",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          {htmlFor ? (
            <Label htmlFor={htmlFor} className="text-body">
              {label}
            </Label>
          ) : (
            <p className="text-body font-medium">{label}</p>
          )}
          {hint ? (
            <p className="text-small break-words text-ink-muted">{hint}</p>
          ) : null}
        </div>
        {control ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-2",
              stack && "max-sm:w-full",
            )}
          >
            {control}
          </div>
        ) : null}
      </div>
      {below}
    </div>
  );
}
