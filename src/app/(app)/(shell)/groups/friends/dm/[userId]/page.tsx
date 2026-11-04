import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { DmChat } from "@/features/friends/components/dm-chat";
import { FriendsShell } from "@/features/friends/components/friends-shell";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { dmService } from "@/server/services/friends";

export const metadata: Metadata = { title: "Direct message" };

/**
 * A direct chat with one person. Only the two of them can open it (rule 9, rule 15); a
 * chat with a stranger doesn't exist. On a phone it has the screen to itself, under a
 * bar with a way back to Friends.
 */
export default async function DmPage({
  params,
}: PageProps<"/groups/friends/dm/[userId]">) {
  const user = await requireUser();
  const { userId } = await params;
  if (!isId(userId)) notFound();
  const chat = await dmService.open(user, userId);
  if (!chat) notFound();
  const page = await dmService.page(user, userId, null);
  const { person } = chat;

  return (
    <FriendsShell user={user}>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg/95 pr-4 pl-1 backdrop-blur md:px-6">
        <Link
          href="/groups/friends?tab=messages"
          aria-label="Back to messages"
          className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:text-ink md:hidden"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Avatar name={person.displayName} src={person.avatarUrl} size="sm" />
        <h1 className="truncate text-h3">{person.displayName}</h1>
        {person.handle ? (
          <span className="hidden truncate text-small text-ink-muted sm:inline">
            @{person.handle}
          </span>
        ) : null}
      </header>
      <div className="mx-auto flex w-full max-w-content flex-1 flex-col px-4 md:px-6">
        <DmChat
          me={{
            id: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }}
          person={person}
          timeZone={user.timezone}
          initial={page.messages}
          initialHasMore={page.hasMore}
          canSend={chat.canSend}
          why={chat.why}
        />
      </div>
    </FriendsShell>
  );
}
