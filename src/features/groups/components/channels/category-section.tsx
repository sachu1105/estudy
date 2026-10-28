"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import type { ChannelSummary } from "./channel-icon";

/**
 * A category of channels that folds away from its heading, as in Discord. Folded, it
 * still shows the open channel and any with new messages, so nothing goes missing.
 */
export function CategorySection({
  name,
  channels,
  rows,
  keep,
  tools,
}: {
  name: string;
  channels: ChannelSummary[];
  /** Rows for the channels shown, placed among all of the category's. */
  rows: (shown: ChannelSummary[], all: ChannelSummary[]) => ReactNode;
  /** Channels to show even while folded. */
  keep: (channel: ChannelSummary) => boolean;
  tools: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const shown = open ? channels : channels.filter(keep);

  return (
    <section aria-label={name} className="flex flex-col">
      <div className="group flex min-h-8 items-center gap-1">
        <h3 className="flex min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex min-h-11 min-w-0 cursor-pointer items-center gap-1 rounded-chip pl-2 text-left text-micro text-ink-muted uppercase transition-colors duration-[120ms] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:min-h-8"
          >
            <span className="truncate">{name}</span>
            <ChevronDown
              className={cn(
                "size-3 shrink-0 transition-transform duration-[200ms]",
                !open && "-rotate-90",
              )}
              aria-hidden
            />
          </button>
        </h3>
        {tools ? (
          <span className="flex md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            {tools}
          </span>
        ) : null}
      </div>
      {shown.length ? (
        <ul className="flex flex-col">{rows(shown, channels)}</ul>
      ) : open ? (
        <p className="px-2 py-1 text-small text-ink-muted">No channels</p>
      ) : null}
    </section>
  );
}
