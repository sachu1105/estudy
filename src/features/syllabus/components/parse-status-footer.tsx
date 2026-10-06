import { CloudOff } from "lucide-react";

import { DeleteSyllabusButton } from "./syllabus-actions";

/** What happens next, the honest version when nothing can happen yet, and a way out. */
export function ParseStatusFooter({
  versionId,
  offline,
}: {
  versionId: string;
  /** Queued, and no reader is running to pick it up. */
  offline: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {offline ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-control bg-surface-muted p-3 text-small text-ink-muted"
        >
          <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          The syllabus reader is offline, so reading hasn&apos;t started. Your
          file is safe and is read as soon as the reader is back.
        </p>
      ) : (
        <p className="text-small text-ink-muted">
          This can take a few minutes for a long syllabus. You can leave this
          page; it keeps going and will be here when you come back.
        </p>
      )}
      <div>
        <DeleteSyllabusButton versionId={versionId} stopping />
      </div>
    </div>
  );
}
