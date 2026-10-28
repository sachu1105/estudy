import { notFound } from "next/navigation";

import { chatService, materialService } from "@/server/services/groups";
import { podService } from "@/server/services/pods";
import { testService } from "@/server/services/tests";

import { ChannelHeader } from "../components/channels/channel-header";
import { ChannelSearch } from "../components/channels/channel-search";
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
  const [page, members, attachable, history, pods] = await Promise.all([
    chatService.page(user, groupId, channel.id),
    chatService.mentionable(user, groupId),
    canPost ? materialService.shareable(user) : Promise.resolve([]),
    canPost ? testService.history(user) : Promise.resolve([]),
    canPost ? podService.list(user) : Promise.resolve([]),
  ]);
  if (!page) notFound();
  // For a mock test from the attach panel: pod topics to build one, tests taken to share.
  const topics = [
    ...new Set(pods.flatMap((p) => p.topics.map((t) => t.name))),
  ].sort();
  const myTests = [
    ...new Map(
      history.map((a) => [
        a.mockTestId,
        { mockTestId: a.mockTestId, title: a.mockTest.title },
      ]),
    ).values(),
  ];
  return (
    <>
      <ChannelHeader
        manage={manage}
        notify={notify}
        search={
          <ChannelSearch
            groupId={groupId}
            channelId={channel.id}
            channelName={channel.name}
            timeZone={user.timezone}
          />
        }
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
        topics={topics}
        myTests={myTests}
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
