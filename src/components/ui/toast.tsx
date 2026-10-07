"use client";

import { Toaster as Sonner } from "sonner";

import { useThemePreference } from "@/lib/theme";

export { toast } from "sonner";

export function Toaster() {
  const theme = useThemePreference();
  return (
    <Sonner
      theme={theme}
      // Top, just under the top bar: the bottom of a phone screen is where the primary
      // actions live (Next in a test, Merge, Confirm), and a toast there sat over them;
      // a resting finger even paused it, so it never left.
      position="top-center"
      offset={{ top: 72 }}
      mobileOffset={{ top: 72 }}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-control !border !border-border !bg-surface !text-ink !shadow-lg !font-sans !text-body",
          description: "!text-ink-muted !text-small",
          actionButton: "!bg-accent !text-on-accent !rounded-chip !font-medium",
          cancelButton: "!bg-surface-muted !text-ink-muted !rounded-chip",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
