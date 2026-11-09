import { MessageSquareReply } from "lucide-react";

/** The team's answer under an idea or a report. */
export function TeamNote({ note }: { note: string }) {
  return (
    <div className="flex gap-2.5 rounded-chip bg-surface-muted p-3">
      <MessageSquareReply
        className="mt-0.5 size-4 shrink-0 text-accent"
        aria-hidden
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-small font-medium text-ink">studypods team</span>
        <p className="text-small wrap-break-word whitespace-pre-wrap text-ink-muted">
          {note}
        </p>
      </div>
    </div>
  );
}
