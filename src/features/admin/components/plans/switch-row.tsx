"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

/**
 * One site-wide switch: its name and whether it is on, what that means right now, and
 * the switch. Switches save as they flip, so what's shown is always what's live.
 */
export function SwitchRow({
  id,
  title,
  on,
  pending,
  children,
  onFlip,
}: {
  id: string;
  title: string;
  on: boolean;
  pending: boolean;
  /** What the current state means, in a sentence or two. */
  children: ReactNode;
  onFlip: (on: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-body">
            {title}
          </Label>
          <Badge tone={on ? "accent" : "neutral"}>{on ? "On" : "Off"}</Badge>
        </div>
        <p className="text-small text-pretty text-ink-muted">{children}</p>
      </div>
      <Switch
        id={id}
        checked={on}
        disabled={pending}
        onCheckedChange={onFlip}
        className="mt-0.5"
      />
    </div>
  );
}
