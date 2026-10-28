"use client";

import { ArrowDown, Hash, Megaphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import type { Mention } from "@/lib/markdown/markdown";
import type { PendingMessage } from "@/lib/squads/chat-types";

import type { Attachable } from "./attachable";
import { ChatTestDialog } from "./chat-test-dialog";
import { Composer } from "./composer";
import { MessageExtras } from "./message-extras";
import { MessageList } from "./message-list";
import { useChat } from "./use-chat";
import { useJumpToMessage } from "./use-jump";
import { useMessageActions } from "./use-message-actions";
import { MessageItem } from "./message-item";
import { MessageMenu } from "./message-menu";
import { PollDialog } from "./poll-dialog";
import { usePollActions } from "./use-poll-actions";

/**
 * A chat channel: messages that arrive live, and the box to write in. It takes over the
 * screen on phones (data-focus-view hides the tab bar) with the box in thumb reach.
 */
export function ChatView({
  groupId,
  channel,
  me,
  timeZone,
  initial,
  initialHasMore,
  members,
  attachable,
  topics,
  myTests,
  canPost,
  readOnlyNote,
}: {
  groupId: string;
  channel: { id: string; name: string; type: "CHAT" | "ANNOUNCEMENTS" };
  me: { id: string; displayName: string; avatarUrl: string | null };
  timeZone: string;
  initial: PendingMessage[];
  initialHasMore: boolean;
  members: Mention[];
  attachable: Attachable[];
  /** The person's pod topics, to build a mock test from the pool. */
  topics: string[];
  /** Tests the person took, to share one. */
  myTests: { mockTestId: string; title: string }[];
  canPost: boolean;
  /** Why the box is missing, when it is. */
  readOnlyNote: string;
}) {
  const chat = useChat({
    groupId,
    channelId: channel.id,
    initial,
    initialHasMore,
  });
  const act = useMessageActions({ groupId, channelId: channel.id, me, chat });
  const polls = usePollActions({ groupId, channelId: channel.id, chat });
  const [pollOpen, setPollOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const flashId = useJumpToMessage(chat.reach);

  // Stay at the bottom while the person is there; otherwise offer a jump down.
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
  // The last message the person has seen at the bottom; anything after it is unseen.
  const [seenLast, setSeenLast] = useState(last);
  if (atBottom && last !== seenLast) setSeenLast(last);
  const unseen = !atBottom && last !== seenLast && !lastMessage?.mine;
  // Follow new messages while at the bottom, and always after sending one.
  const follow = atBottom || !!lastMessage?.mine;
  useEffect(() => {
    if (last && follow)
      end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [last, follow]);

  const Icon = channel.type === "ANNOUNCEMENTS" ? Megaphone : Hash;
  return (
    // Fills the height it is given, so the box sits at the bottom even when the chat is short.
    <div data-focus-view className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-end">
        {chat.messages.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={`This is the start of #${channel.name}`}
            description={
              canPost
                ? "Say hello, ask something, or attach a note from your pods."
                : "Nothing posted yet. Admins post here."
            }
          />
        ) : (
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
                groupId={groupId}
                message={m}
                compact={compact}
                timeZone={timeZone}
                active={activeId === m.id}
                flash={flashId === m.id}
                onToggle={() => setActiveId((a) => (a === m.id ? null : m.id))}
                onReact={(kind) => act.react(m, kind)}
                extras={
                  <MessageExtras
                    groupId={groupId}
                    message={m}
                    onVote={(optionId) => polls.vote(m, optionId)}
                    onAnswer={() => act.startReply(m)}
                    onChoose={(best) => polls.choose(m, best)}
                  />
                }
                menu={
                  <MessageMenu
                    groupId={groupId}
                    message={m}
                    canReply={canPost}
                    onReact={(kind) => act.react(m, kind)}
                    onReply={() => act.startReply(m)}
                    onEdit={() => act.startEdit(m)}
                    onDelete={() => act.remove(m)}
                  />
                }
              />
            )}
          />
        )}
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
      {canPost ? (
        <Composer
          channelId={channel.id}
          channelName={channel.name}
          members={members}
          attachable={attachable}
          context={act.context}
          editing={act.editing?.body ?? null}
          onCancel={act.cancel}
          onSubmit={act.submit}
          onTest={() => setTestOpen(true)}
          onPoll={() => setPollOpen(true)}
        />
      ) : (
        <p className="sticky bottom-0 border-t border-border bg-bg py-3 text-center text-small text-ink-muted">
          {readOnlyNote}
        </p>
      )}
      {canPost ? (
        <>
          <PollDialog
            open={pollOpen}
            onOpenChange={setPollOpen}
            onSend={(question, pollOptions) =>
              act.submit({
                body: question,
                mentionIds: [],
                attachment: null,
                files: [],
                doubt: false,
                pollOptions,
              })
            }
          />
          <ChatTestDialog
            groupId={groupId}
            channelId={channel.id}
            topics={topics}
            mine={myTests}
            open={testOpen}
            onOpenChange={setTestOpen}
            onShared={() => void chat.catchUp()}
          />
        </>
      ) : null}
    </div>
  );
}
