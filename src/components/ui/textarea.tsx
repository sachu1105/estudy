import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

import { fieldClasses } from "./input";

export function Textarea({
  className,
  rows = 4,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      className={cn(fieldClasses, "resize-y py-2", className)}
      {...props}
    />
  );
}
