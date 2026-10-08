"use client";

import { Fragment, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { continues, dayKey, dayLabel } from "@/lib/squads/chat-time";
import type { PendingMessage } from "@/lib/squads/chat-types";

/** Messages in time order, with a divider for each day and older ones on request. */
export function MessageList({
  messages,
  timeZone,
  now,
  hasMore,
  loadingOlder,
  onLoadOlder,
  renderItem,
}: {
  messages: PendingMessage[];
  timeZone: string;
  now: Date;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  renderItem: (message: PendingMessage, compact: boolean) => ReactNode;
}) {
  return (
    <div className="flex flex-col">
      {hasMore ? (
        <Button
          variant="ghost"
          className="self-center"
          disabled={loadingOlder}
          onClick={onLoadOlder}
        >
          {loadingOlder ? "Loading…" : "Load earlier messages"}
        </Button>
      ) : null}
      <ol className="flex flex-col" aria-label="Messages">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const at = new Date(m.at);
          const newDay =
            !prev ||
            dayKey(new Date(prev.at), timeZone) !== dayKey(at, timeZone);
          const compact =
            !newDay &&
            !m.replyTo &&
            continues(
              prev && { authorId: prev.author.id, at: prev.at },
              { authorId: m.author.id, at: m.at },
              timeZone,
            );
          return (
            <Fragment key={m.id}>
              {newDay ? (
                <li
                  role="separator"
                  className="mt-4 flex items-center gap-3 text-micro text-ink-muted uppercase"
                >
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  <span suppressHydrationWarning>
                    {dayLabel(at, now, timeZone)}
                  </span>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </li>
              ) : null}
              {renderItem(m, compact)}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
