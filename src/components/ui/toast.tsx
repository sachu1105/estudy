"use client";

import { Toaster as Sonner } from "sonner";

import { useThemePreference } from "@/lib/theme";

export { toast } from "sonner";

export function Toaster() {
  const theme = useThemePreference();
  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      offset={{ bottom: 88 }}
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
