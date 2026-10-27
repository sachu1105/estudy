"use client";

import { Paperclip, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { plainText } from "@/lib/markdown/markdown";
import { clockTime, dayLabel } from "@/lib/squads/chat-time";
import type { MessageView } from "@/lib/squads/chat-types";

type Found = { query: string; messages: MessageView[] };

const words = (query: string) =>
  query.trim().toLowerCase().split(/\s+/).filter(Boolean);
const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text with each searched word marked. */
function Marked({ text, query }: { text: string; query: string }) {
  const list = words(query);
  if (!list.length) return text;
  const parts = text.split(new RegExp(`(${list.map(escape).join("|")})`, "gi"));
  return parts.map((part, i) =>
    i % 2 ? (
      <mark
        key={i}
        className="rounded-[4px] bg-accent-soft px-0.5 text-accent-ink"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/**
 * Words searched in one chat channel, from the search button in its bar. Results are the
 * newest first; tapping one closes this and jumps to the message in the chat.
 */
export function ChannelSearch({
  groupId,
  channelId,
  channelName,
  timeZone,
}: {
  groupId: string;
  channelId: string;
  channelName: string;
  timeZone: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [failed, setFailed] = useState(false);
  const [now] = useState(() => new Date());

  // Searches a moment after typing stops; a newer query cancels the one in flight.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const stop = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/groups/${groupId}/channels/${channelId}/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store", signal: stop.signal },
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { messages: MessageView[] };
        setFailed(false);
        setFound({ query: q, messages: data.messages });
      } catch {
        if (!stop.signal.aborted) setFailed(true);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      stop.abort();
    };
  }, [query, groupId, channelId]);

  const q = query.trim();
  const current = q.length >= 2 && found?.query === q ? found : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Search #${channelName}`}
        >
          <Search aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[85dvh] gap-3 md:h-[min(85dvh,640px)]"
      >
        <SheetTitle className="text-h3">Search #{channelName}</SheetTitle>
        <SheetDescription className="sr-only">
          Find messages in this channel by their words.
        </SheetDescription>
        <Input
          type="search"
          autoFocus
          aria-label={`Search #${channelName}`}
          placeholder="Words in a message or a file's name"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div
          className="-mx-2 min-h-0 flex-1 overflow-y-auto"
          aria-live="polite"
        >
          {failed ? (
            <p className="px-2 py-6 text-center text-body text-ink-muted">
              Search didn&apos;t work just now. Try again.
            </p>
          ) : q.length < 2 ? (
            <p className="px-2 py-6 text-center text-body text-ink-muted">
              Type a word or two to find messages here.
            </p>
          ) : !current ? null : current.messages.length === 0 ? (
            <p className="px-2 py-6 text-center text-body text-ink-muted">
              No messages here with &ldquo;{q}&rdquo;.
            </p>
          ) : (
            <ul className="flex flex-col">
              {current.messages.map((m) => (
                <li key={m.id}>
                  <a
                    href={`#m-${m.id}`}
                    onClick={() => {
                      setOpen(false);
                      // The same result again: the hash won't change, so say so.
                      if (window.location.hash === `#m-${m.id}`)
                        window.dispatchEvent(new HashChangeEvent("hashchange"));
                    }}
                    className="flex gap-3 rounded-control px-2 py-2.5 hover:bg-surface-muted"
                  >
                    <Avatar
                      name={m.author.displayName}
                      src={m.author.avatarUrl ?? undefined}
                      size="sm"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-body font-medium">
                          {m.author.displayName}
                        </span>
                        <span className="text-small text-ink-muted">
                          {dayLabel(new Date(m.at), now, timeZone)},{" "}
                          {clockTime(new Date(m.at), timeZone)}
                        </span>
                      </span>
                      {m.body ? (
                        <span className="line-clamp-3 text-body break-words">
                          <Marked text={plainText(m.body, 240)} query={q} />
                        </span>
                      ) : null}
                      {m.item ? (
                        <span className="flex min-w-0 items-center gap-1.5 text-small text-ink-muted">
                          <Paperclip
                            className="size-3.5 shrink-0"
                            aria-hidden
                          />
                          <span className="truncate">
                            <Marked text={m.item.title} query={q} />
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
