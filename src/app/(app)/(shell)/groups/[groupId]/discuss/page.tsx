import { notFound, redirect } from "next/navigation";

import { channelHref } from "@/features/groups/components/channels/channel-icon";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { channelService } from "@/server/services/groups";

/** Links from before squads had channels land in the squad's first fitting channel. */
export default async function LegacyPage({
  params,
}: PageProps<"/groups/[groupId]/discuss">) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!isId(groupId)) notFound();
  const channel = await channelService.firstOfType(user, groupId, "THREADS");
  redirect(channel ? channelHref(groupId, channel.id) : `/groups/${groupId}`);
}
