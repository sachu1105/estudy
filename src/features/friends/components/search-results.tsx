"use client";

import { Check, MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { acceptRequestAction, sendRequestAction } from "../actions";
import type { FoundPerson } from "./use-people-search";

/**
 * Who matches the search, one dense row each, with the one thing to do next: add them,
 * accept their request, or message a friend. A sent request shows as sent.
 */
export function SearchResults({
  people,
  searching,
  note,
  onChange,
}: {
  people: FoundPerson[] | null;
  searching: boolean;
  /** The optional note, sent with any request from here. */
  note: string;
  onChange: (id: string, status: FoundPerson["status"]) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (people === null)
    return searching ? (
      <p className="border-t border-border px-4 py-3 text-small text-ink-muted">
        Searching…
      </p>
    ) : null;
  if (people.length === 0)
    return (
      <p className="border-t border-border px-4 py-3 text-small text-ink-muted">
        No one public matches. If they keep their profile private, ask them to
        add you.
      </p>
    );

  const add = (p: FoundPerson) =>
    start(async () => {
      const r = await sendRequestAction({
        handle: p.handle,
        note: note.trim() || null,
      });
      if (!r.ok) return void toast.error(r.error);
      onChange(p.id, r.accepted ? "friends" : "sent");
      toast.success(
        r.accepted
          ? `You and ${p.displayName} are friends`
          : `Request sent to ${p.displayName}`,
      );
      router.refresh();
    });
  const accept = (p: FoundPerson) =>
    start(async () => {
      const r = await acceptRequestAction({ friendshipId: p.friendshipId });
      if (!r.ok) return void toast.error(r.error);
      onChange(p.id, "friends");
      toast.success(`You and ${p.displayName} are friends`);
      router.refresh();
    });

  return (
    <ul
      aria-label="People"
      className="divide-y divide-border border-t border-border"
    >
      {people.map((p) => (
        <li key={p.id} className="flex min-h-16 items-center gap-3 px-3 py-2">
          <Avatar name={p.displayName} src={p.avatarUrl} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium">{p.displayName}</span>
            <span className="truncate text-small text-ink-muted">
              @{p.handle}
            </span>
          </span>
          {p.status === "friends" ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="max-sm:size-11 max-sm:px-0"
            >
              <Link
                href={`/groups/friends/dm/${p.id}`}
                aria-label={`Message ${p.displayName}`}
              >
                <MessageCircle aria-hidden />
                <span className="max-sm:hidden">Message</span>
              </Link>
            </Button>
          ) : p.status === "sent" ? (
            <span className="flex items-center gap-1 px-2 text-small text-ink-muted">
              <Check className="size-4" aria-hidden /> Requested
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="max-sm:size-11 max-sm:px-0"
              disabled={pending}
              aria-label={
                p.status === "received"
                  ? `Accept ${p.displayName}`
                  : `Add ${p.displayName}`
              }
              onClick={() => (p.status === "received" ? accept(p) : add(p))}
            >
              {p.status === "received" ? (
                <>
                  <Check aria-hidden />
                  <span className="max-sm:hidden">Accept</span>
                </>
              ) : (
                <>
                  <UserPlus aria-hidden />
                  <span className="max-sm:hidden">Add</span>
                </>
              )}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
