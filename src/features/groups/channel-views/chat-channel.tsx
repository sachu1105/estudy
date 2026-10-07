import { Hash, Megaphone } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

import { ChannelHeader } from "../components/channels/channel-header";
import type { ChannelViewProps } from "./types";

/** A chat or announcements channel. Live messages are the next squads step (S3). */
export function ChatChannel({ groupId, channel, manage }: ChannelViewProps) {
  const announcements = channel.type === "ANNOUNCEMENTS";
  return (
    <>
      <ChannelHeader manage={manage} groupId={groupId} channel={channel} />
      <EmptyState
        icon={announcements ? Megaphone : Hash}
        title={announcements ? "Announcements open soon" : "Chat opens soon"}
        description={
          announcements
            ? "Admins will post news here for everyone. Until then, pin a thread in a threads channel."
            : "Live messages are on their way. Until then, start a thread in a threads channel."
        }
      />
    </>
  );
}
