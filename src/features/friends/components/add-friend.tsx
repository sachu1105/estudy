"use client";

import { CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, fieldClasses } from "@/components/ui/input";
import { NOTE_MAX } from "@/lib/friends/pair";
import { cn } from "@/lib/utils/cn";

import { sendRequestAction } from "../actions";
import { PrivateNote } from "./private-note";
import { SearchResults } from "./search-results";
import { usePeopleSearch } from "./use-people-search";

/**
 * Discord's Add friend, with search: type a name or username and the public people who
 * match appear below, each with Add. An exact username still sends with the button. An
 * optional note goes with any request.
 */
export function AddFriend({
  myHandle,
  findable,
}: {
  myHandle: string | null;
  /** The person is public; when private, a line says so and where to change it. */
  findable: boolean;
}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<
    { ok: true; text: string } | { ok: false; text: string } | null
  >(null);
  const [pending, start] = useTransition();
  const search = usePeopleSearch(handle);

  const send = () =>
    start(async () => {
      const r = await sendRequestAction({
        handle,
        note: note.trim() || null,
      });
      if (!r.ok) return setResult({ ok: false, text: r.error });
      setResult({
        ok: true,
        text: r.accepted
          ? `You and ${r.name} are friends now. They had already asked you.`
          : `Your friend request to ${r.name} was sent.`,
      });
      setHandle("");
      setNote("");
      router.refresh();
    });

  return (
    <section aria-labelledby="add" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="add" className="text-h2">
          Add friend
        </h2>
        <p className="text-body text-ink-muted">
          Search by name or username.
          {myHandle ? (
            <>
              {" "}
              Yours is <span className="font-mono text-ink">@{myHandle}</span>.
            </>
          ) : null}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className={cn(
          fieldClasses,
          "flex flex-col gap-0 p-0 focus-within:border-accent",
        )}
      >
        <div className="flex items-center gap-2 p-2">
          <input
            aria-label="Name or username"
            placeholder="Search by name or username"
            value={handle}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            onChange={(e) => {
              setHandle(e.target.value);
              setResult(null);
            }}
            className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-ink-subtle md:text-body"
          />
          {/* Beside the box from sm; at the foot of the box on a phone. */}
          <SendButton
            disabled={pending || !handle.trim()}
            className="max-sm:hidden"
          />
        </div>
        {/* Matches right under what's typed, like a search dropdown. */}
        <SearchResults
          people={search.people}
          searching={search.searching}
          note={note}
          onChange={search.update}
        />
        <div className="border-t border-border p-2">
          <textarea
            aria-label="Add a note (optional)"
            placeholder="Add a note (optional)"
            value={note}
            rows={2}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full resize-none bg-transparent px-2 py-1 text-base outline-none placeholder:text-ink-subtle md:text-body"
          />
          <p className="px-2 text-right font-mono text-micro text-ink-muted tabular-nums">
            {NOTE_MAX - note.length}
          </p>
        </div>
        <div className="border-t border-border p-2 sm:hidden">
          <SendButton disabled={pending || !handle.trim()} className="w-full" />
        </div>
      </form>
      {findable ? null : <PrivateNote />}
      {result?.ok ? (
        <p
          role="status"
          className="flex items-center gap-1.5 text-small text-success-ink"
        >
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          {result.text}
        </p>
      ) : result ? (
        <FieldError role="alert">{result.text}</FieldError>
      ) : (
        <p className="text-small text-ink-muted">
          Your note shows with the request, and opens your chat if they say yes.
        </p>
      )}
    </section>
  );
}

/** Sends to the exact username typed, for someone found another way. */
function SendButton({
  disabled,
  className,
}: {
  disabled: boolean;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={disabled}
      className={className}
    >
      Send friend request
    </Button>
  );
}
