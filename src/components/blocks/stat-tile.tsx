import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  /** "mono" for timers, scores and ranks; "heading" for focal numbers. */
  numeral?: "mono" | "heading";
  className?: string;
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  numeral = "heading",
  className,
}: StatTileProps) {
  return (
    <Card className={cn("flex flex-col gap-2 p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-micro text-ink-muted uppercase">{label}</span>
        {Icon ? <Icon className="size-4 text-ink-subtle" aria-hidden /> : null}
      </div>
      <span
        className={cn(
          "text-display text-ink tabular-nums",
          numeral === "mono"
            ? "font-mono font-medium"
            : "font-heading font-semibold",
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-small text-ink-muted">{hint}</span> : null}
    </Card>
  );
}
