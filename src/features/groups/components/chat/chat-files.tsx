"use client";

import { FileText, X } from "lucide-react";
import { useEffect, useMemo } from "react";

import { CHAT_FILE_TYPES, CHAT_MAX_FILES } from "../../upload";

const MAX_BYTES = 25 * 1024 * 1024;
const isPdf = (f: File) => f.type === "application/pdf";

/**
 * What can go in one message: up to ten photos, or one PDF on its own. Returns why not,
 * in words for the person, or null when it's fine.
 */
export function checkFiles(files: File[]): string | null {
  if (files.some((f) => !CHAT_FILE_TYPES.split(",").includes(f.type)))
    return "Send photos (JPG, PNG or WebP) or a PDF.";
  if (files.some(isPdf) && files.length > 1)
    return "Send a PDF on its own, one per message.";
  if (files.length > CHAT_MAX_FILES)
    return `Send up to ${CHAT_MAX_FILES} photos at a time.`;
  // Photos shrink before they go, so only a PDF can be too big here.
  if (files.some((f) => isPdf(f) && f.size > MAX_BYTES))
    return "A PDF can be up to 25 MB.";
  return null;
}

/** What's about to be sent from the device, above the box: thumbnails, or the PDF. */
export function PendingFiles({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (file: File) => void;
}) {
  const previews = useMemo(
    () => files.map((f) => (isPdf(f) ? null : URL.createObjectURL(f))),
    [files],
  );
  useEffect(
    () => () => previews.forEach((url) => url && URL.revokeObjectURL(url)),
    [previews],
  );
  return (
    <ul className="mb-2 flex gap-2 overflow-x-auto pb-1">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${f.size}-${f.lastModified}`}
          className="relative shrink-0"
        >
          {previews[i] ? (
            // A local preview; nothing has left the device yet.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previews[i]!}
              alt={f.name}
              className="size-16 rounded-control border border-border object-cover"
            />
          ) : (
            <span className="flex h-16 max-w-56 items-center gap-2 rounded-control border border-border bg-surface pr-10 pl-3 text-small">
              <FileText
                className="size-4 shrink-0 text-ink-muted"
                aria-hidden
              />
              <span className="truncate">{f.name}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(f)}
            aria-label={`Remove ${f.name}`}
            // Small to look at, a full 44px to tap.
            className="absolute -top-1 -right-1 grid size-6 cursor-pointer place-items-center rounded-full border border-border bg-surface text-ink-muted shadow-sm after:absolute after:-inset-2.5 hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
