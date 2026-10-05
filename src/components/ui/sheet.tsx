"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

import { DialogOverlay } from "./dialog";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-4 border-border bg-surface p-6 shadow-lg",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 w-[min(400px,100%-48px)] border-l data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right",
        left: "inset-y-0 left-0 w-[min(320px,100%-48px)] border-r data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-card border-t pb-[max(24px,env(safe-area-inset-bottom))] data-[state=closed]:animate-sheet-out-bottom data-[state=open]:animate-sheet-in-bottom",
      },
    },
    defaultVariants: { side: "right" },
  },
);

type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants>;

export function SheetContent({
  className,
  children,
  side,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <DialogOverlay />
      <SheetPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          aria-label="Close"
          className="absolute top-4 right-4 grid size-8 cursor-pointer place-items-center rounded-chip text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn("font-heading text-h2 font-semibold", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-body text-ink-muted", className)}
      {...props}
    />
  );
}
