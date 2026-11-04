"use client";

import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import { MessageItem } from "@/features/groups/components/chat/message-item";
import { MessageList } from "@/features/groups/components/chat/message-list";
import type { PendingMessage } from "@/lib/squads/chat-types";

import { deleteDmAction, editDmAction, sendDmAction } from "../actions";
import { DmComposer } from "./dm-composer";
import { DmMenu, Start } from "./dm-parts";
import { useDm } from "./use-dm";

type Person = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  handle: string | null;
};

/**
 * A direct chat: messages that arrive live and the box to write in. It takes over the
 * screen on phones (data-focus-view hides the tab bar) with the box in thumb reach.
 */
export function DmChat({
  me,
  person,
  timeZone,
  initial,
  initialHasMore,
  canSend,
  why,
}: {
  me: { id: string; displayName: string; avatarUrl: string | null };
  person: Person;
  timeZone: string;
  initial: PendingMessage[];
  initialHasMore: boolean;
  canSend: boolean;
  /** Why the box is missing, when it is. */
  why: string | null;
}) {
  const chat = useDm({ userId: person.id, initial, initialHasMore });
  const [editing, setEditing] = useState<PendingMessage | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const end = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      setAtBottom(entry!.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, []);
  const lastMessage = chat.messages.at(-1);
  const last = lastMessage?.id;
  const [seenLast, setSeenLast] = useState(last);
  if (atBottom && last !== seenLast) setSeenLast(last);
  const unseen = !atBottom && last !== seenLast && !lastMessage?.mine;
  const follow = atBottom || !!lastMessage?.mine;
  useEffect(() => {
    if (last && follow)
      end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [last, follow]);

  const submit = (body: string) => {
    if (editing) {
      const before = editing;
      chat.patch(before.id, (m) => ({ ...m, body, edited: true }));
      setEditing(null);
      void editDmAction({ messageId: before.id, body }).then((r) => {
        if (r.ok) return chat.patch(before.id, () => r.message);
        chat.patch(before.id, () => before);
        toast.error(r.error);
      });
      return true;
    }
    const settle = chat.addPending({
      id: crypto.randomUUID(),
      body,
      deleted: false,
      hidden: false,
      edited: false,
      at: new Date().toISOString(),
      author: me,
      mentions: [],
      replyTo: null,
      item: null,
      reactions: [],
      mine: true,
      canDelete: false,
      kind: "TEXT",
      doubt: null,
      answer: null,
      poll: null,
      test: null,
    });
    void sendDmAction({ userId: person.id, body }).then((r) => {
      settle(r.ok ? r.message : null);
      if (!r.ok) toast.error(r.error);
    });
    return true;
  };

  const remove = (m: PendingMessage) => {
    chat.patch(m.id, (x) => ({ ...x, deleted: true, body: "" }));
    void deleteDmAction({ messageId: m.id }).then((r) => {
      if (r.ok) return;
      chat.patch(m.id, () => m);
      toast.error(r.error);
    });
  };

  return (
    <div data-focus-view className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-end">
        {chat.hasMore ? null : <Start person={person} />}
        <MessageList
          messages={chat.messages}
          timeZone={timeZone}
          now={now}
          hasMore={chat.hasMore}
          loadingOlder={chat.loadingOlder}
          onLoadOlder={() => void chat.loadOlder()}
          renderItem={(m, compact) => (
            <MessageItem
              key={m.id}
              groupId=""
              message={m}
              compact={compact}
              timeZone={timeZone}
              active={activeId === m.id}
              onToggle={() => setActiveId((a) => (a === m.id ? null : m.id))}
              onReact={() => {}}
              menu={
                m.mine && canSend ? (
                  <DmMenu
                    onEdit={() => setEditing(m)}
                    onDelete={() => remove(m)}
                  />
                ) : null
              }
            />
          )}
        />
        <div ref={end} aria-hidden className="h-2" />
      </div>
      {unseen ? (
        <button
          type="button"
          onClick={() =>
            end.current?.scrollIntoView({ block: "end", behavior: "smooth" })
          }
          className="sticky bottom-24 z-10 mx-auto flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-4 text-small font-medium text-bg shadow-md"
        >
          <ArrowDown className="size-4" aria-hidden /> New messages
        </button>
      ) : null}
      {canSend ? (
        <DmComposer
          userId={person.id}
          name={person.displayName}
          editing={editing?.body ?? null}
          onCancelEdit={() => setEditing(null)}
          onSubmit={submit}
        />
      ) : (
        <p className="sticky bottom-0 border-t border-border bg-bg py-3 text-center text-small text-ink-muted">
          {why}
        </p>
      )}
    </div>
  );
}
