"use client";

import { FileUp, X } from "lucide-react";
import { useId, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

// Photos are accepted by the server, but OCR arrives in milestone 7.5, so the picker
// doesn't offer them yet rather than lead to a guaranteed failure.
export const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type FileDropProps = {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
  invalid?: boolean;
};

/** A tap target on phones (opens the file picker), a drop zone on desktop. */
export function FileDrop({ file, onFile, disabled, invalid }: FileDropProps) {
  const id = useId();
  const [over, setOver] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    if (!disabled) onFile(event.dataTransfer.files[0] ?? null);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-control border border-border bg-surface p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
          <FileUp className="size-5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium">{file.name}</span>
          <span className="text-small text-ink-muted">
            {formatBytes(file.size)}
          </span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove file"
          disabled={disabled}
          onClick={() => onFile(null)}
        >
          <X aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed bg-surface px-4 py-8 text-center transition-colors duration-[120ms]",
        over
          ? "border-accent bg-accent-soft"
          : "border-border hover:bg-surface-muted",
        invalid && "border-danger",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
      )}
    >
      <FileUp className="size-6 text-ink-muted" aria-hidden />
      <span className="font-heading text-h3 font-medium">Choose a file</span>
      <span className="max-w-xs text-small text-ink-muted">
        PDF or Word (.docx), up to 15 MB. Drop it here on a computer.
      </span>
      <input
        id={id}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
