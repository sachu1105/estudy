import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * The verified seal beside a name: someone on a paid plan, or a squad run by one. The
 * words are for screen readers; the tooltip says what it means to everyone else.
 */
export function VerifiedMark({ className }: { className?: string }) {
  return (
    <span
      title="Verified: on a paid studypods plan"
      className="inline-flex shrink-0 align-[-0.15em]"
    >
      <BadgeCheck
        aria-hidden
        className={cn("size-4 fill-accent text-surface", className)}
      />
      <span className="sr-only">, verified</span>
    </span>
  );
}
