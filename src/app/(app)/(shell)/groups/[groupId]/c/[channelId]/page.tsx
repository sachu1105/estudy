import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChatChannel } from "@/features/groups/channel-views/chat-channel";
import { MaterialChannel } from "@/features/groups/channel-views/material-channel";
import { TestsChannel } from "@/features/groups/channel-views/tests-channel";
import { ThreadsChannel } from "@/features/groups/channel-views/threads-channel";
import type { ChannelViewProps } from "@/features/groups/channel-views/types";
import { ChannelMenu } from "@/features/groups/components/channels/channel-menu";
import { isId } from "@/lib/ids";
import type { ChannelType } from "@/lib/squads/templates";
import { requireUser } from "@/server/auth/session";
import { channelService, groupService } from "@/server/services/groups";

export const metadata: Metadata = { title: "Squad channel" };

const VIEWS: Record<
  ChannelType,
  (props: ChannelViewProps) => React.ReactNode | Promise<React.ReactNode>
> = {
  CHAT: ChatChannel,
  ANNOUNCEMENTS: ChatChannel,
  THREADS: ThreadsChannel,
  MATERIAL: MaterialChannel,
  LINKS: MaterialChannel,
  TESTS: TestsChannel,
};

/** One channel of a squad, shown the way its type works. Members only (rule 9). */
export default async function ChannelPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/c/[channelId]">) {
  const user = await requireUser();
  const { groupId, channelId } = await params;
  if (!isId(groupId) || !isId(channelId)) notFound();
  const [found, view, layout] = await Promise.all([
    channelService.get(user, groupId, channelId),
    groupService.view(user, groupId),
    channelService.layout(user, groupId),
  ]);
  if (!found || !view?.role || !layout) notFound();
  const { channel } = found;
  const View = VIEWS[channel.type];

  // Where it sits among its neighbours, for the admin's move up and down.
  const siblings =
    layout.categories.find((c) => c.id === channel.categoryId)?.channels ??
    layout.loose;
  const at = siblings.findIndex((c) => c.id === channel.id);
  const manage = layout.canManage ? (
    <ChannelMenu
      groupId={groupId}
      channel={channel}
      categories={layout.categories.map(({ id, name }) => ({ id, name }))}
      first={at <= 0}
      last={at === siblings.length - 1}
      label="Channel settings"
    />
  ) : null;

  return (
    <View
      user={user}
      groupId={groupId}
      channel={channel}
      canPost={found.canPost && !view.muted}
      manage={manage}
      searchParams={await searchParams}
    />
  );
}
