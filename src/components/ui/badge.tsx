import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// success/danger only mean right/wrong or done/destructive; streak only marks the streak.
const badgeVariants = cva(
  "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-small font-medium whitespace-nowrap [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-ink-muted",
        accent: "bg-accent-soft text-accent-ink",
        success: "bg-success-soft text-success-ink",
        danger: "bg-danger-soft text-danger-ink",
        streak: "bg-streak-soft text-streak-ink",
        outline: "border border-border text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
