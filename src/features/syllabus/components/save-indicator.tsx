import { AlertCircle, Check } from "lucide-react";

import type { SaveState } from "../use-autosave";

/** Quiet status for autosave: nothing until there's something to say. */
export function SaveIndicator({
  state,
  error,
}: {
  state: SaveState;
  error: string | null;
}) {
  const content = {
    idle: null,
    saving: <span>Saving</span>,
    saved: (
      <>
        <Check className="size-4" aria-hidden /> Saved
      </>
    ),
    invalid: (
      <>
        <AlertCircle className="size-4" aria-hidden /> Fill in every name to
        save
      </>
    ),
    error: (
      <>
        <AlertCircle className="size-4" aria-hidden /> {error}
      </>
    ),
  }[state];
  return (
    <p
      role="status"
      aria-live="polite"
      className={
        state === "error" || state === "invalid"
          ? "flex items-center gap-1.5 text-small text-danger-ink"
          : "flex items-center gap-1.5 text-small text-ink-muted"
      }
    >
      {content}
    </p>
  );
}
