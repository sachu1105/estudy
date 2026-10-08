import { notFound } from "next/navigation";

import { chatService, materialService } from "@/server/services/groups";

import { ChannelHeader } from "../components/channels/channel-header";
import { ChatView } from "../components/chat/chat-view";
import type { ChannelViewProps } from "./types";

/** A chat or announcements channel: the latest messages, live, and the box to write in. */
export async function ChatChannel({
  user,
  groupId,
  channel,
  canPost,
  manage,
  notify,
}: ChannelViewProps) {
  const [page, members, attachable] = await Promise.all([
    chatService.page(user, groupId, channel.id),
    chatService.mentionable(user, groupId),
    canPost ? materialService.shareable(user) : Promise.resolve([]),
  ]);
  if (!page) notFound();
  return (
    <>
      <ChannelHeader
        manage={manage}
        notify={notify}
        groupId={groupId}
        channel={channel}
      />
      <ChatView
        groupId={groupId}
        channel={{
          id: channel.id,
          name: channel.name,
          type: channel.type === "ANNOUNCEMENTS" ? "ANNOUNCEMENTS" : "CHAT",
        }}
        me={{
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }}
        timeZone={user.timezone}
        initial={page.messages}
        initialHasMore={page.hasMore}
        members={members}
        attachable={attachable}
        canPost={canPost}
        readOnlyNote={
          channel.postRule === "ADMINS"
            ? "Only the squad's admins post here."
            : "A squad admin has muted you for now: you can read, but not send."
        }
      />
    </>
  );
}
