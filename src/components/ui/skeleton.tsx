import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

/** Use for anything that loads in under 3s. Never a spinner. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-chip bg-surface-muted motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
