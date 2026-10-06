"use client";

import { FileText, FolderOpen } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const WIDE = "(min-width: 768px)";
const subscribe = (change: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

export type SheetItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

/**
 * The topic's pod material next to the timer: from the side on a wide screen, from the
 * bottom on a phone. Items open in a new tab so the session stays where it is.
 */
export function MaterialSheet({
  topicName,
  items,
  podHref,
}: {
  topicName: string;
  items: SheetItem[];
  podHref: string;
}) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">
          <FolderOpen aria-hidden /> Material
          <span className="font-mono text-small tabular-nums">
            {items.length}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side={wide ? "right" : "bottom"}
        className="overflow-y-auto"
      >
        <SheetTitle>{topicName}</SheetTitle>
        <SheetDescription>
          Your notes, links and files for this topic.
        </SheetDescription>
        {items.length === 0 ? (
          <p className="text-body text-ink-muted">
            Nothing linked to this topic yet.
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center gap-3 rounded-control px-2 py-2 hover:bg-surface-muted"
                >
                  <FileText
                    className="size-4 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body">{item.title}</span>
                    <span className="truncate text-small text-ink-muted">
                      {item.detail}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="ghost" className="self-start">
          <a href={podHref} target="_blank" rel="noopener noreferrer">
            Open the topic in its pod
          </a>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
