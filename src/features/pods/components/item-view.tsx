import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

type ViewItem = {
  type: "NOTE" | "LINK" | "FILE" | "IMAGE";
  title: string;
  url: string | null;
  linkDescription: string | null;
  status: "NONE" | "PENDING" | "DONE" | "FAILED";
  files: { id: string; mimeType: string }[];
};

/** A link card, a PDF, or a set of photos. Files load through /api/pods/files (rule 15). */
export function ItemView({ item }: { item: ViewItem }) {
  if (item.type === "LINK" && item.url) {
    const host = new URL(item.url).hostname.replace(/^www\./, "");
    return (
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <p className="text-small text-ink-muted">{host}</p>
        {item.linkDescription ? (
          <p className="text-body">{item.linkDescription}</p>
        ) : item.status === "PENDING" ? (
          <p className="text-body text-ink-muted">
            Fetching the page&apos;s details.
          </p>
        ) : null}
        <Button asChild variant="primary" className="self-start">
          <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink aria-hidden /> Open link
          </a>
        </Button>
      </div>
    );
  }

  if (item.type === "FILE" && item.files[0]) {
    const src = `/api/pods/files/${item.files[0].id}`;
    return (
      <div className="flex flex-col gap-3">
        {/* Phones often can't show a PDF inside a page; the button opens it full screen. */}
        <iframe
          src={src}
          title={item.title}
          className="hidden h-[75dvh] w-full rounded-card border border-border bg-surface md:block"
        />
        <Button asChild variant="secondary" className="self-start">
          <a href={src} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden /> Open PDF
          </a>
        </Button>
      </div>
    );
  }

  if (item.type === "IMAGE") {
    return (
      <ol className="flex flex-col gap-4">
        {item.files.map((file, i) => (
          <li key={file.id}>
            <a
              href={`/api/pods/files/${file.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a signed, private file */}
              <img
                src={`/api/pods/files/${file.id}`}
                alt={
                  item.files.length > 1
                    ? `${item.title}, page ${i + 1}`
                    : item.title
                }
                loading="lazy"
                className="w-full rounded-card border border-border bg-surface"
              />
            </a>
          </li>
        ))}
      </ol>
    );
  }
  return null;
}
