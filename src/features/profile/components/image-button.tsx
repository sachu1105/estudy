"use client";

import { ImageUp, Loader2 } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * A button that opens the file picker and reports the chosen image. The input stays
 * hidden; the button is the whole control, so it keeps a 44px tap target.
 */
export function ImageButton({
  label,
  onPick,
  busy = false,
  variant = "secondary",
  size = "sm",
  children,
}: {
  label: string;
  onPick: (file: File) => void;
  busy?: boolean;
  variant?: "secondary" | "ghost";
  size?: "sm" | "md";
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <ImageUp aria-hidden />
        )}
        {children ?? label}
      </Button>
    </>
  );
}
