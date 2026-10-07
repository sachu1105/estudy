import { AlertCircle } from "lucide-react";

/** Shown when the parse found an old Malayalam font that dropped letters. */
export function GarbledNote() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-card border border-border bg-surface-muted p-4"
    >
      <AlertCircle
        className="mt-0.5 size-5 shrink-0 text-ink-muted"
        aria-hidden
      />
      <p className="text-body text-ink-muted">
        This PDF uses an old Malayalam font, so some words came out with letters
        missing. We fixed what we could. Check the subject and topic names, or
        paste the text from another copy.
      </p>
    </div>
  );
}
