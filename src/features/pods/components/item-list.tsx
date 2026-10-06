import {
  ChevronRight,
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type Item = {
  id: string;
  podId: string;
  type: "NOTE" | "LINK" | "FILE" | "IMAGE";
  title: string;
  url: string | null;
  sizeBytes: number;
  pageCount: number | null;
  status: "NONE" | "PENDING" | "DONE" | "FAILED";
  topics: { topicId: string }[];
};

const ICONS: Record<Item["type"], LucideIcon> = {
  NOTE: NotebookPen,
  LINK: Link2,
  FILE: FileText,
  IMAGE: ImageIcon,
};

function details(item: Item, showTopics: boolean) {
  const parts: string[] = [];
  if (item.type === "NOTE") parts.push("Note");
  if (item.type === "LINK" && item.url)
    parts.push(new URL(item.url).hostname.replace(/^www\./, ""));
  if (item.type === "FILE")
    parts.push(item.pageCount ? `PDF, ${item.pageCount} pages` : "PDF");
  if (item.type === "IMAGE")
    parts.push(
      item.pageCount && item.pageCount > 1
        ? `${item.pageCount} photos`
        : "Photo",
    );
  if (item.sizeBytes > 0)
    parts.push(`${Math.max(1, Math.round(item.sizeBytes / 1024))} KB`);
  if (item.status === "PENDING") parts.push("reading");
  if (showTopics)
    parts.push(
      item.topics.length === 0
        ? "not linked to a topic"
        : `${item.topics.length} topic${item.topics.length === 1 ? "" : "s"}`,
    );
  return parts.join(" · ");
}

/** A pod's or a topic's material. Each row opens the item; links can open straight away. */
export function ItemList({
  items,
  showTopics = true,
}: {
  items: Item[];
  showTopics?: boolean;
}) {
  return (
    <ul className="divide-y divide-border rounded-card border border-border bg-surface">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        return (
          <li key={item.id} className="flex items-center gap-1 pr-2">
            <Link
              href={`/pods/${item.podId}/items/${item.id}`}
              className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-control px-3 py-2 hover:bg-surface-muted"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  {item.title}
                </span>
                <span className="truncate text-small text-ink-muted">
                  {details(item, showTopics)}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-ink-muted"
                aria-hidden
              />
            </Link>
            {item.type === "LINK" && item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={`Open ${item.title} in a new tab`}
                className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
