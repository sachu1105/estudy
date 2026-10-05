"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";

import { FieldError, FieldHint, Input, Label } from "@/components/ui/input";

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  hint?: string;
  labelAside?: React.ReactNode;
};

export function TextField({
  label,
  error,
  hint,
  labelAside,
  id,
  type,
  ...props
}: TextFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const messageId = `${inputId}-message`;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        {labelAside}
      </div>
      <div className="relative">
        <Input
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={isPassword ? "pr-12" : undefined}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-control text-ink-muted hover:text-ink"
          >
            {revealed ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : hint ? (
        <FieldHint id={messageId}>{hint}</FieldHint>
      ) : null}
    </div>
  );
}
