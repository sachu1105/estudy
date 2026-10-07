"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type GrowTextProps = Omit<ComponentProps<"textarea">, "onChange" | "value"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * A one-line text field that wraps instead of cutting long text off, growing a line at a
 * time. Enter finishes (no line breaks), and pasted line breaks become spaces.
 */
export function GrowText({
  value,
  onValueChange,
  className,
  onKeyDown,
  ...props
}: GrowTextProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(/\s*\n\s*/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
      className={cn("resize-none overflow-hidden", className)}
      {...props}
    />
  );
}
