import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export const fieldClasses = cn(
  "w-full rounded-control border border-border bg-surface px-3 text-body text-ink",
  "transition-colors duration-[120ms] hover:border-ink-subtle",
  "focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/30",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle",
  "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger/30",
);

export function Input({
  className,
  type = "text",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(fieldClasses, "h-10", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("text-small font-medium text-ink", className)}
      {...props}
    />
  );
}

export function FieldHint({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-small text-ink-muted", className)} {...props} />
  );
}

export function FieldError({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      role="alert"
      className={cn("text-small text-danger-ink", className)}
      {...props}
    />
  );
}
