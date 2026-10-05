import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type FormAlertProps = {
  tone: "error" | "success";
  children: ReactNode;
  className?: string;
};

// Icon plus colour, never colour alone.
export function FormAlert({ tone, children, className }: FormAlertProps) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-control px-3.5 py-3 text-small",
        tone === "error"
          ? "bg-danger-soft text-danger-ink"
          : "bg-success-soft text-success-ink",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
