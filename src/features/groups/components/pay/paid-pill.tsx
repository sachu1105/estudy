import { Lock, Ticket } from "lucide-react";

import { rupees } from "@/lib/pricing/pricing";
import { cn } from "@/lib/utils/cn";

/**
 * A paid channel in the channel list: its price with a lock until you hold a pass, then
 * a quiet "Pass". Decorative: the row's own text says "paid, locked" to screen readers.
 */
export function PaidPill({
  pricePaise,
  locked,
  holder,
}: {
  pricePaise: number;
  locked: boolean;
  holder: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5 font-mono text-micro font-medium tabular-nums",
        locked
          ? "bg-accent-soft text-accent-ink ring-1 ring-accent/40"
          : "border border-accent/40 text-accent-ink",
      )}
    >
      {locked ? <Lock className="size-3" /> : null}
      {holder ? (
        <>
          <Ticket className="size-3" /> Pass
        </>
      ) : (
        rupees(pricePaise)
      )}
    </span>
  );
}
