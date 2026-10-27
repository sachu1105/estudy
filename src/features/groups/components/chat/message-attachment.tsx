import { FileText, Image as ImageIcon, Link2, NotebookPen } from "lucide-react";
import Link from "next/link";

import type { PendingMessage } from "@/lib/squads/chat-types";
import { cn } from "@/lib/utils/cn";

const ITEM_ICONS = {
  NOTE: NotebookPen,
  LINK: Link2,
  FILE: FileText,
  IMAGE: ImageIcon,
} as const;

type Item = NonNullable<PendingMessage["item"]>;

/**
 * What a message carries: photos drawn in the chat, as in Discord, or a card for a note,
 * link or PDF. Either opens the item's own page. Files load through the squad's file
 * route, which checks membership and hands out a short-lived link (rule 15).
 */
export function MessageAttachment({
  groupId,
  item,
}: {
  groupId: string;
  item: Item;
}) {
  const href = `/groups/${groupId}/items/${item.id}`;
  const photos = item.type === "IMAGE" ? item.files : [];
  if (photos.length) return <Photos href={href} item={item} photos={photos} />;
  const Icon = ITEM_ICONS[item.type];
  return (
    <Link
      href={href}
      className="flex max-w-sm items-center gap-3 rounded-control border border-border bg-surface px-3 py-2 hover:bg-surface-muted"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-body font-medium">
        {item.title}
      </span>
    </Link>
  );
}

/**
 * One photo large; several as a grid of squares (three: one wide over two), at most
 * four, the last saying "+N" for the rest.
 */
function Photos({
  href,
  item,
  photos,
}: {
  href: string;
  item: Item;
  photos: Item["files"];
}) {
  const shown = photos.slice(0, 4);
  const more = photos.length - shown.length;
  const one = photos.length === 1;
  return (
    <Link
      href={href}
      aria-label={item.title}
      className={cn(
        "grid max-w-sm gap-1 overflow-hidden rounded-card border border-border",
        one ? "grid-cols-1" : "grid-cols-2",
      )}
    >
      {shown.map((f, i) => (
        <span
          key={f.id}
          className={cn(
            "relative block bg-surface-muted",
            // Three: the first runs across the top, so no square is left empty.
            shown.length === 3 && i === 0 && "col-span-2 [&>img]:aspect-[2/1]",
          )}
        >
          {/* Served through a membership check, so next/image can't fetch it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/groups/files/${f.id}`}
            alt=""
            loading="lazy"
            className={cn(
              "block w-full object-cover",
              one ? "max-h-80" : "aspect-square",
            )}
          />
          {more > 0 && i === shown.length - 1 ? (
            <span className="absolute inset-0 grid place-items-center bg-ink/55 font-heading text-h2 text-white">
              +{more}
            </span>
          ) : null}
        </span>
      ))}
    </Link>
  );
}
