import { Crown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/** "Paid": the gold mark on a paid squad's name and its pass card. */
export function PaidMark({
  label = "Paid",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-gold-soft px-2.5 text-small font-medium whitespace-nowrap text-gold-ink ring-1 ring-gold/40 [&_svg]:size-3.5",
        className,
      )}
    >
      <Crown aria-hidden /> {label}
    </span>
  );
}
