"use client";

import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

import { MB, isBytes, type Limit } from "./plan-rows";

/** A changed, unsaved cell: a quiet accent wash, so the admin sees what Save will send. */
const changedCell = "border-accent/50 bg-accent-soft/60";

/** One plan's limit for one feature. Empty is no limit; storage is typed in MB. */
export function LimitCell({
  feature,
  value,
  saved,
  label,
  onChange,
}: {
  feature: Limit;
  /** null = unlimited; storage in bytes. */
  value: number | null;
  saved: number | null;
  label: string;
  onChange: (raw: string) => void;
}) {
  const bytes = isBytes(feature);
  const shown = value === null ? null : bytes ? Math.round(value / MB) : value;
  return (
    <div className="relative w-full">
      <Input
        aria-label={label}
        inputMode="numeric"
        placeholder="No limit"
        value={shown === null ? "" : String(shown)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "text-right tabular-nums placeholder:text-ink-muted",
          bytes && "pr-11",
          value !== saved && changedCell,
        )}
      />
      {bytes ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-small text-ink-muted">
          MB
        </span>
      ) : null}
    </div>
  );
}

/** One plan's on/off feature: a checkbox and its name, marked while unsaved. */
export function FlagRow({
  on,
  saved,
  children,
  onChange,
}: {
  on: boolean;
  saved: boolean;
  children: ReactNode;
  onChange: (on: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-transparent px-2 text-small md:min-h-9",
        on !== saved && changedCell,
      )}
    >
      <Checkbox checked={on} onCheckedChange={(v) => onChange(v === true)} />
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {children}
      </span>
    </label>
  );
}
