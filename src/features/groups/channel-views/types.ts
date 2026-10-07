import type { ReactNode } from "react";

import type { SessionUser } from "@/server/auth/session";

import type { ChannelSummary } from "../components/channels/channel-icon";

/** What every channel view gets from the channel page. */
export type ChannelViewProps = {
  user: SessionUser;
  groupId: string;
  channel: ChannelSummary;
  /** Allowed to post here and not muted. */
  canPost: boolean;
  /** The admin's channel settings menu, for the header. */
  manage?: ReactNode;
  searchParams: Record<string, string | string[] | undefined>;
};
