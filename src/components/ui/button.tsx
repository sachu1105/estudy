import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

// One primary (accent-filled) button per view. If two actions compete, neither is primary.
// Raised buttons sit on a hard ledge and sink into it when pressed: down and to the left
// by the ledge's own offset, so the corner it rests on stays put. Ghost buttons stay flat.
const raised =
  "active:translate-x-[-2px] active:translate-y-[2px] disabled:shadow-none";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control font-heading font-medium whitespace-nowrap select-none",
    "transition-[transform,background-color,color,border-color,box-shadow] duration-[120ms] ease-out",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: [
          "border border-accent-deep bg-accent text-on-accent shadow-ledge-accent hover:bg-accent-hover active:shadow-ledge-accent-pressed",
          raised,
        ],
        secondary: [
          "border border-edge bg-surface text-ink shadow-ledge-neutral hover:bg-surface-muted active:shadow-ledge-neutral-pressed",
          raised,
        ],
        ghost:
          "text-ink-muted hover:bg-surface-muted hover:text-ink active:scale-[0.98]",
        danger: [
          "border border-danger-ink/25 bg-danger-soft text-danger-ink shadow-ledge-danger hover:bg-danger-soft/70 active:shadow-ledge-danger-pressed",
          raised,
        ],
      },
      size: {
        sm: "h-9 px-3 text-small md:h-8",
        md: "h-11 px-4 text-body md:h-10",
        lg: "h-12 px-5 text-body",
        icon: "size-11 md:size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
